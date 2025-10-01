import { readdir, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
import { ProgressManager } from "./progress.js";
import {
  OpenCodeData,
  OpenCodeSession,
  OpenCodeMessage,
  ToolUsage,
} from "../types/index.js";

export function getDefaultOpenCodePath(): string {
  const platform = process.platform;

  if (platform === "win32") {
    return join(
      Bun.env.USERPROFILE || homedir(),
      ".local",
      "share",
      "opencode",
    );
  }

  // macOS and Linux
  return join(homedir(), ".local", "share", "opencode");
}

export async function findOpenCodeDataDirectory(
  customPath?: string,
): Promise<string> {
  const basePath = customPath || getDefaultOpenCodePath();

  try {
    const file = Bun.file(basePath);
    if (!(await file.exists())) {
      // Create directory structure if it doesn't exist
      await mkdir(basePath, { recursive: true });
    }
    return basePath;
  } catch (error) {
    throw new Error(`OpenCode data directory not found: ${basePath}`);
  }
}

interface SessionMetadata {
  id: string;
  title?: string;
  time: {
    created: number;
    updated?: number;
  };
  version?: string;
  parentID?: string;
}

interface MessageData {
  id: string;
  role: "user" | "assistant";
  sessionID: string;
  time: {
    created: number;
  };
  content?: any;
  tools?: any[];
  providerID?: string;
  modelID?: string;
  tokens?: {
    input: number;
    output: number;
    reasoning?: number;
    cache?: {
      write: number;
      read: number;
    };
  };
  cost?: number;
  system?: string[];
  mode?: string;
}

interface CacheEntry {
  filePath: string;
  mtime: number;
  size: number;
  hash: string;
  processedAt: number;
}

interface CacheData {
  version: string;
  entries: CacheEntry[];
  lastProcessed: number;
}

async function getCacheFilePath(dataDir: string): Promise<string> {
  const cacheDir = join(dataDir, ".cache");
  try {
    await mkdir(cacheDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
  return join(cacheDir, "data-cache.json");
}

async function loadCache(dataDir: string): Promise<CacheData | null> {
  try {
    const cacheFilePath = await getCacheFilePath(dataDir);
    const file = Bun.file(cacheFilePath);
    if (!(await file.exists())) {
      return null;
    }
    const content = await file.text();
    const cache = JSON.parse(content) as CacheData;

    const CACHE_VERSION = "3.0";

    // Validate cache version
    if (cache.version !== CACHE_VERSION) {
      return null;
    }

    return cache;
  } catch (error) {
    return null;
  }
}

async function saveCache(dataDir: string, cache: CacheData): Promise<void> {
  try {
    const cacheFilePath = await getCacheFilePath(dataDir);
    await Bun.write(cacheFilePath, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.warn("Failed to save cache:", error);
  }
}

const HASH_LENGTH = 16;

function calculateFileHash(content: string): string {
  return createHash("sha256")
    .update(content)
    .digest("hex")
    .substring(0, HASH_LENGTH);
}

async function getFileMetadata(
  filePath: string,
): Promise<{ mtime: number; size: number; hash: string }> {
  const file = Bun.file(filePath);
  const content = await file.text();
  const stats = await file.stat();
  return {
    mtime: stats.mtimeMs,
    size: stats.size,
    hash: calculateFileHash(content),
  };
}

async function hasFileChanged(
  filePath: string,
  cacheEntry: CacheEntry | undefined,
): Promise<boolean> {
  if (!cacheEntry) return true;

  const metadata = await getFileMetadata(filePath);
  return (
    metadata.mtime !== cacheEntry.mtime ||
    metadata.size !== cacheEntry.size ||
    metadata.hash !== cacheEntry.hash
  );
}

// Optimized version that returns both change status and content
async function analyzeFile(
  filePath: string,
  cacheEntry: CacheEntry | undefined,
): Promise<{
  changed: boolean;
  metadata: { mtime: number; size: number; hash: string };
  content: string;
}> {
  const file = Bun.file(filePath);
  const content = await file.text();
  const stats = await file.stat();
  const hash = calculateFileHash(content);

  const metadata = {
    mtime: stats.mtimeMs,
    size: stats.size,
    hash: hash,
  };

  const changed =
    !cacheEntry ||
    metadata.mtime !== cacheEntry.mtime ||
    metadata.size !== cacheEntry.size ||
    metadata.hash !== cacheEntry.hash;

  return { changed, metadata, content };
}

interface SessionStreamData {
  id: string;
  title: string;
  time: {
    created: number;
    updated?: number;
  };
  tokens_used: number;
  cost_cents: number;
  model: {
    provider: string;
    model: string;
  };
  messages: OpenCodeMessage[];
}

function extractToolName(command: string): string | null {
  // Remove common prefixes and extract the main command
  const cleanCommand = command
    .replace(/^(sudo|doas)\s+/, "") // Remove sudo prefixes
    .replace(/^['"`]/, "") // Remove opening quotes
    .replace(/['"`]\s*$/, "") // Remove closing quotes
    .trim();

  // Split by space or pipe and get the first part
  const firstPart = cleanCommand.split(/[\s|]/)[0];

  // Extract the base command from paths (e.g., /usr/bin/git -> git)
  const baseCommand = firstPart.split("/").pop() || firstPart;

  // Validate it's a reasonable tool name
  if (baseCommand && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(baseCommand)) {
    return baseCommand.toLowerCase();
  }

  return null;
}

class DataProcessingError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly operation?: string,
    public readonly recoverable: boolean = true,
  ) {
    super(message);
    this.name = "DataProcessingError";
  }
}

function handleError(
  error: unknown,
  context: string,
  filePath?: string,
): never | void {
  if (error instanceof DataProcessingError) {
    if (error.recoverable) {
      console.warn(
        `Recoverable error in ${context}: ${error.message}`,
        filePath ? `File: ${filePath}` : "",
      );
      return;
    }
    throw error;
  }

  if (error instanceof Error) {
    console.error(
      `Unexpected error in ${context}: ${error.message}`,
      error.stack,
      filePath ? `File: ${filePath}` : "",
    );
    throw new DataProcessingError(
      `Unexpected error: ${error.message}`,
      filePath,
      context,
      false,
    );
  }

  console.error(`Unknown error in ${context}:`, error);
  throw new DataProcessingError(
    "Unknown error occurred",
    filePath,
    context,
    false,
  );
}

async function safeFileOperation<T>(
  operation: () => Promise<T>,
  filePath: string,
  operationName: string,
  defaultValue?: T,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, operationName, filePath);
    return defaultValue;
  }
}

function validateMessageData(data: any): data is MessageData {
  return (
    data &&
    typeof data.id === "string" &&
    typeof data.role === "string" &&
    typeof data.sessionID === "string" &&
    data.time &&
    typeof data.time.created === "number"
  );
}

function validateSessionData(data: any): data is SessionMetadata {
  return (
    data &&
    typeof data.id === "string" &&
    data.time &&
    typeof data.time.created === "number"
  );
}

async function* streamProcessSessions(
  sessionMap: Map<string, SessionMetadata>,
  messagesBySession: Map<string, MessageData[]>,
): AsyncGenerator<SessionStreamData, void, unknown> {
  for (const [sessionId, sessionMeta] of sessionMap) {
    const messages = messagesBySession.get(sessionId) || [];

    // Extract provider/model info and calculate totals from assistant messages
    let totalTokens = 0;
    let totalCost = 0;
    let provider = "unknown";
    let model = "unknown";
    let latestAssistantTime = 0;

    for (const msg of messages) {
      if (msg.role === "assistant" && msg.providerID && msg.modelID) {
        // Use the most recent assistant message's model info
        const msgTime = msg.time?.created || 0;
        if (msgTime > latestAssistantTime) {
          latestAssistantTime = msgTime;
          provider = msg.providerID;
          model = msg.modelID;
        }

        if (msg.tokens) {
          totalTokens += (msg.tokens.input || 0) + (msg.tokens.output || 0);
          if (msg.tokens.cache) {
            totalTokens +=
              (msg.tokens.cache.read || 0) + (msg.tokens.cache.write || 0);
          }
        }

        if (typeof msg.cost === "number") {
          totalCost += msg.cost;
        }
      }
    }

    // Extract tools from message content or system prompts with enhanced pattern matching
    const processedMessages = messages.map((msg) => {
      const tools: ToolUsage[] = [];

      // Enhanced tool extraction from content
      if (typeof msg.content === "string") {
        // Pattern 1: Code blocks with bash/tool markers
        const codeBlockMatches = msg.content.match(
          /```(?:bash|tool|sh|shell|command)\s*\n([\s\S]*?)\n```/g,
        );
        if (codeBlockMatches) {
          codeBlockMatches.forEach((match) => {
            const toolCommand = match
              .replace(
                /```(?:bash|tool|sh|shell|command)\s*\n([\s\S]*?)\n```/,
                "$1",
              )
              .trim();
            if (toolCommand) {
              tools.push({
                name: extractToolName(toolCommand) || "unknown",
                duration_ms: 0,
                timestamp: new Date(msg.time.created).toISOString(),
              });
            }
          });
        }

        // Pattern 2: Direct tool calls in text (e.g., "I'll use the read tool to...")
        const directToolMentions = msg.content.match(
          /\b(?:bash|read|write|glob|grep|edit|list|task|chrome|figma|serena|vibe|context7|webfetch|sequential-thinking)\b/gi,
        );
        if (directToolMentions) {
          const uniqueTools = [
            ...new Set(directToolMentions.map((t) => t.toLowerCase())),
          ];
          uniqueTools.forEach((toolName) => {
            tools.push({
              name: toolName,
              duration_ms: 0,
              timestamp: new Date(msg.time.created).toISOString(),
            });
          });
        }

        // Pattern 3: Tool execution patterns (e.g., "Executing: bash command")
        const executionPatterns = msg.content.match(
          /(?:executing|running|using|called)\s*[:\-]?\s*([a-zA-Z][a-zA-Z0-9_-]*)/gi,
        );
        if (executionPatterns) {
          executionPatterns.forEach((match) => {
            const toolName = match
              .replace(/(?:executing|running|using|called)\s*[:\-]?\s*/i, "")
              .trim();
            if (toolName && toolName.length > 1) {
              tools.push({
                name: toolName.toLowerCase(),
                duration_ms: 0,
                timestamp: new Date(msg.time.created).toISOString(),
              });
            }
          });
        }
      }

      // Enhanced tool extraction from system prompts
      if (msg.system && Array.isArray(msg.system)) {
        const systemText = msg.system.join(" ");

        // Pattern 1: Function/tool definitions
        const toolDefinitions = systemText.match(
          /(?:function|tool|method)\s+[a-zA-Z][a-zA-Z0-9_-]*\s*\([^)]*\)/gi,
        );
        if (toolDefinitions) {
          toolDefinitions.forEach((def) => {
            const toolName = def.match(
              /(?:function|tool|method)\s+([a-zA-Z][a-zA-Z0-9_-]*)/i,
            )?.[1];
            if (toolName) {
              tools.push({
                name: toolName.toLowerCase(),
                duration_ms: 0,
                timestamp: new Date(msg.time.created).toISOString(),
              });
            }
          });
        }

        // Pattern 2: Tool availability lists
        const toolLists = systemText.match(
          /(?:available|supported)\s+tools?\s*[:\-]?\s*([^.\n]+)/gi,
        );
        if (toolLists) {
          toolLists.forEach((list) => {
            const toolNames = list
              .replace(/(?:available|supported)\s+tools?\s*[:\-]?\s*/i, "")
              .split(/[,;]/)
              .map((name) => name.trim().toLowerCase())
              .filter((name) => name.length > 1);
            toolNames.forEach((toolName) => {
              tools.push({
                name: toolName,
                duration_ms: 0,
                timestamp: new Date(msg.time.created).toISOString(),
              });
            });
          });
        }

        // Pattern 3: Direct tool patterns (existing logic enhanced)
        const toolPatterns = systemText.match(
          /(?:bash|read|write|glob|grep|edit|list|task|chrome|figma|serena|vibe|context7|webfetch|sequential-thinking)\s*\([^)]*\)/gi,
        );
        if (toolPatterns) {
          toolPatterns.forEach((pattern) => {
            const toolName =
              pattern.match(
                /(bash|read|write|glob|grep|edit|list|task|chrome|figma|serena|vibe|context7|webfetch|sequential-thinking)/i,
              )?.[1] || "unknown";
            tools.push({
              name: toolName.toLowerCase(),
              duration_ms: 0,
              timestamp: new Date(msg.time.created).toISOString(),
            });
          });
        }
      }

      // Extract tools from tools array if available
      if (msg.tools && Array.isArray(msg.tools)) {
        msg.tools.forEach((tool) => {
          if (typeof tool === "string") {
            tools.push({
              name: tool.toLowerCase(),
              duration_ms: 0,
              timestamp: new Date(msg.time.created).toISOString(),
            });
          } else if (tool && typeof tool === "object" && tool.name) {
            tools.push({
              name: tool.name.toLowerCase(),
              duration_ms: tool.duration_ms || 0,
              timestamp: new Date(msg.time.created).toISOString(),
            });
          }
        });
      }

      return {
        id: msg.id,
        role: msg.role,
        content: msg.content || "",
        timestamp: new Date(msg.time.created).toISOString(),
        tools: tools,
      } as OpenCodeMessage;
    });

    // Yield session data
    yield {
      id: sessionId,
      title: sessionMeta.title || "Untitled Session",
      time: {
        created: sessionMeta.time.created,
        updated: sessionMeta.time.updated,
      },
      messages: processedMessages,
      tokens_used: totalTokens,
      cost_cents:
        isFinite(totalCost) && !isNaN(totalCost)
          ? Math.round(totalCost * 100)
          : 0,
      model: {
        provider: provider,
        model: model,
      },
    };
  }
}

export async function findSessionFiles(dataDir: string): Promise<string[]> {
  const files: string[] = [];
  const sessionDir = join(dataDir, "storage", "session");

  try {
    // Check if directory exists by trying to read it
    await readdir(sessionDir);

    async function searchSessionDirectory(dir: string) {
      try {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);

          // Check if it's a directory by trying to read it as a directory
          try {
            await readdir(fullPath);
            await searchSessionDirectory(fullPath);
          } catch {
            // Not a directory, check if it's a session file
            if (entry.endsWith(".json") && entry.startsWith("ses_")) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await searchSessionDirectory(sessionDir);
  } catch (error) {
    console.warn("Could not access session directory");
  }

  return files;
}

export async function findMessageFiles(dataDir: string): Promise<string[]> {
  const files: string[] = [];
  const messageDir = join(dataDir, "storage", "message");

  try {
    // Check if directory exists by trying to read it
    await readdir(messageDir);

    async function searchMessageDirectory(dir: string) {
      try {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);

          // Check if it's a directory by trying to read it as a directory
          try {
            await readdir(fullPath);
            await searchMessageDirectory(fullPath);
          } catch {
            // Not a directory, check if it's a message file
            if (entry.endsWith(".json") && entry.startsWith("msg_")) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await searchMessageDirectory(messageDir);
  } catch (error) {
    console.warn("Could not access message directory");
  }

  return files;
}

export async function loadOpenCodeData(options?: {
  limit?: number;
  cache?: boolean;
  days?: number;
  quiet?: boolean;
  verbose?: boolean;
}): Promise<OpenCodeData> {
  const dataDir = await findOpenCodeDataDirectory();
  const [sessionFiles, messageFiles] = await Promise.all([
    findSessionFiles(dataDir),
    findMessageFiles(dataDir),
  ]);

  if (!options?.quiet) {
    console.log(
      `Found ${sessionFiles.length} session files and ${messageFiles.length} message files`,
    );
  }

  // Initialize progress manager
  const progressManager = new ProgressManager(
    Math.max(sessionFiles.length, messageFiles.length),
    { quiet: options?.quiet, verbose: options?.verbose },
  );

  // Load cache if enabled
  const useCache = options?.cache !== false;
  let cache: CacheData | null = null;
  const cacheMap = new Map<string, CacheEntry>();

  if (useCache) {
    cache = await loadCache(dataDir);
    if (cache) {
      // Build cache map for quick lookup
      cache.entries.forEach((entry) => {
        cacheMap.set(entry.filePath, entry);
      });
      if (!options?.quiet) {
        console.log(`Loaded cache with ${cache.entries.length} entries`);
      }
    }
  }

  // Apply performance limits and time-based filtering for quick mode
  const messageLimit = options?.limit || Infinity;
  let filteredMessageFiles = messageFiles;

  // Time-based filtering for quick mode
  if (options?.days) {
    const cutoffTime = Date.now() - options.days * 24 * 60 * 60 * 1000;
    if (!options?.quiet) {
      console.log(`Filtering to data from last ${options.days} days...`);
    }

    // Filter message files by modification time
    const timeFilteredFiles: string[] = [];
    for (const file of messageFiles) {
      try {
        const fileObj = Bun.file(file);
        const stats = await fileObj.stat();
        if (stats.mtimeMs >= cutoffTime) {
          timeFilteredFiles.push(file);
        }
      } catch (error) {
        // Skip files we can't stat
      }
    }
    filteredMessageFiles = timeFilteredFiles;
    if (!options?.quiet) {
      console.log(`Found ${filteredMessageFiles.length} recent message files`);
    }
  }

  const limitedMessageFiles = filteredMessageFiles.slice(0, messageLimit);

  // Filter files that need processing (new or changed)
  const filesToProcess: string[] = [];
  const unchangedFiles: string[] = [];

  if (useCache && cache) {
    for (const file of limitedMessageFiles) {
      const cacheEntry = cacheMap.get(file);
      const hasChanged = await hasFileChanged(file, cacheEntry);

      if (hasChanged) {
        filesToProcess.push(file);
      } else {
        unchangedFiles.push(file);
      }
    }
    if (!options?.quiet) {
      console.log(
        `Processing ${filesToProcess.length} new/changed files, ${unchangedFiles.length} cached files`,
      );
    }
  } else {
    filesToProcess.push(...limitedMessageFiles);
    if (!options?.quiet) {
      console.log(
        `Processing ${filesToProcess.length} message files${options?.days ? ` (filtered to ${options.days} days)` : ""} (cache disabled or unavailable)`,
      );
    }
  }

  // Load session metadata with enhanced error handling and concurrency
  const sessionMap = new Map<string, SessionMetadata>();
  let sessionLoadErrors = 0;

  const sessionPromises = sessionFiles.map(async (file) => {
    return await safeFileOperation(
      async () => {
        const content = await Bun.file(file).text();
        const data = JSON.parse(content);

        if (!validateSessionData(data)) {
          throw new DataProcessingError(
            "Invalid session data structure",
            file,
            "session validation",
            true,
          );
        }

        return data as SessionMetadata;
      },
      file,
      "session loading",
    );
  });

  const sessionResults = await Promise.all(sessionPromises);

  for (const session of sessionResults) {
    if (session !== undefined && session !== null) {
      sessionMap.set(session.id, session);
    } else {
      sessionLoadErrors++;
    }
  }

  if (sessionLoadErrors > 0 && !options?.quiet) {
    console.warn(
      `Failed to load ${sessionLoadErrors}/${sessionFiles.length} session files`,
    );
  }

  const BATCH_SIZE = 100;
  const PROGRESS_UPDATE_INTERVAL = 1000;

  // Load messages and group by session with batching for better performance
  const messagesBySession = new Map<string, MessageData[]>();
  const newCacheEntries: CacheEntry[] = [];

  // Always load ALL message files so sessions retain their messages.
  // Cache still only updated for changed files to avoid churn.
  const allMessageFiles =
    useCache && cache ? [...filesToProcess, ...unchangedFiles] : filesToProcess;

  const changedSet = new Set(filesToProcess);

  for (let i = 0; i < allMessageFiles.length; i += BATCH_SIZE) {
    const batch = allMessageFiles.slice(i, i + BATCH_SIZE);

    progressManager.updateProgress(i, "Processing message files");

    const batchPromises = batch.map(async (file) => {
      return await safeFileOperation(
        async () => {
          const content = await Bun.file(file).text();
          const data = JSON.parse(content);

          if (!validateMessageData(data)) {
            throw new DataProcessingError(
              "Invalid message data structure",
              file,
              "message validation",
              true,
            );
          }

          const message = data as MessageData;

          // Only update cache metadata for changed files
          if (changedSet.has(file)) {
            const metadata = await getFileMetadata(file);
            const cacheEntry: CacheEntry = {
              filePath: file,
              mtime: metadata.mtime,
              size: metadata.size,
              hash: metadata.hash,
              processedAt: Date.now(),
            };
            newCacheEntries.push(cacheEntry);
          }

          return message;
        },
        file,
        "message loading",
      );
    });

    const batchResults = await Promise.all(batchPromises);

    for (const message of batchResults) {
      if (message) {
        if (!messagesBySession.has(message.sessionID)) {
          messagesBySession.set(message.sessionID, []);
        }
        messagesBySession.get(message.sessionID)!.push(message);
      }
    }

    // Progress indicator for large datasets
    if (i % PROGRESS_UPDATE_INTERVAL === 0 && i > 0 && !options?.quiet) {
      console.log(
        `Processed ${Math.min(i, allMessageFiles.length)}/${allMessageFiles.length} message files...`,
      );
    }
  }

  if (!options?.quiet) {
    const totalMessages = Array.from(messagesBySession.values()).reduce(
      (total, msgs) => total + msgs.length,
      0,
    );
    console.log(`Processed ${totalMessages} messages across all sessions`);
  }

  // Update cache with new entries
  if (useCache && newCacheEntries.length > 0) {
    const CACHE_VERSION = "3.0";
    const updatedCache: CacheData = {
      version: CACHE_VERSION,
      entries: [...(cache?.entries || []), ...newCacheEntries],
      lastProcessed: Date.now(),
    };

    // Remove duplicate entries (keep the most recent)
    const uniqueEntries = new Map<string, CacheEntry>();
    updatedCache.entries.forEach((entry) => {
      const existing = uniqueEntries.get(entry.filePath);
      if (!existing || entry.processedAt > existing.processedAt) {
        uniqueEntries.set(entry.filePath, entry);
      }
    });

    updatedCache.entries = Array.from(uniqueEntries.values());
    await saveCache(dataDir, updatedCache);
    if (!options?.quiet) {
      console.log(`Updated cache with ${newCacheEntries.length} new entries`);
    }

    // Trigger garbage collection after cache update
    Bun.gc();
  }

  // Use streaming approach to process sessions and reduce memory usage
  const sessions: OpenCodeSession[] = [];
  let processedCount = 0;

  for await (const sessionData of streamProcessSessions(
    sessionMap,
    messagesBySession,
  )) {
    if (sessionData.messages.length > 0) {
      sessions.push(sessionData as OpenCodeSession);
    }

    processedCount++;
    progressManager.updateProgress(processedCount, "Processing sessions");
  }

  if (!options?.quiet) {
    console.log(`Completed processing ${processedCount} sessions`);
  }
  progressManager.finish();

  // Trigger garbage collection after processing all sessions
  Bun.gc();

  return { sessions };
}

export async function loadAllData(options?: {
  limit?: number;
  cache?: boolean;
  days?: number;
  verbose?: boolean;
  quiet?: boolean;
}): Promise<OpenCodeData> {
  return await loadOpenCodeData(options);
}
