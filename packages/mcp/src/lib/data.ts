import { readdir, readFile, stat, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
import {
  OpenCodeData,
  OpenCodeSession,
  OpenCodeMessage,
  ToolUsage,
} from "../types/index";

export function getDefaultOpenCodePath(): string {
  const platform = process.platform;

  if (platform === "win32") {
    return join(
      process.env.USERPROFILE || homedir(),
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
    const stats = await stat(basePath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${basePath}`);
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
    // Cache directory might already exist
  }
  return join(cacheDir, "data-cache.json");
}

async function loadCache(dataDir: string): Promise<CacheData | null> {
  try {
    const cacheFile = await getCacheFilePath(dataDir);
    const content = await readFile(cacheFile, "utf-8");
    const cache = JSON.parse(content) as CacheData;

    // Validate cache version
    if (cache.version !== "1.0") {
      return null;
    }

    return cache;
  } catch (error) {
    return null;
  }
}

async function saveCache(dataDir: string, cache: CacheData): Promise<void> {
  try {
    const cacheFile = await getCacheFilePath(dataDir);
    await writeFile(cacheFile, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.warn("Failed to save cache:", error);
  }
}

function calculateFileHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").substring(0, 16);
}

async function getFileMetadata(
  filePath: string,
): Promise<{ mtime: number; size: number; hash: string }> {
  const stats = await stat(filePath);
  const content = await readFile(filePath, "utf-8");
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

interface SessionStreamData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
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

    for (const msg of messages) {
      if (msg.role === "assistant" && msg.providerID && msg.modelID) {
        provider = msg.providerID;
        model = msg.modelID;

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
      created_at: new Date(sessionMeta.time.created).toISOString(),
      updated_at: sessionMeta.time.updated
        ? new Date(sessionMeta.time.updated).toISOString()
        : new Date(sessionMeta.time.created).toISOString(),
      messages: processedMessages,
      tokens_used: totalTokens,
      cost_cents: Math.round(totalCost * 100), // Convert to cents
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
    const sessionStat = await stat(sessionDir);
    if (!sessionStat.isDirectory()) {
      return files;
    }

    async function searchSessionDirectory(dir: string) {
      try {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            await searchSessionDirectory(fullPath);
          } else if (entry.endsWith(".json") && entry.startsWith("ses_")) {
            files.push(fullPath);
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
    const messageStat = await stat(messageDir);
    if (!messageStat.isDirectory()) {
      return files;
    }

    async function searchMessageDirectory(dir: string) {
      try {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            await searchMessageDirectory(fullPath);
          } else if (entry.endsWith(".json") && entry.startsWith("msg_")) {
            files.push(fullPath);
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
}): Promise<OpenCodeData> {
  const dataDir = await findOpenCodeDataDirectory();
  const sessionFiles = await findSessionFiles(dataDir);
  const messageFiles = await findMessageFiles(dataDir);

  console.log(
    `Found ${sessionFiles.length} session files and ${messageFiles.length} message files`,
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
      console.log(`Loaded cache with ${cache.entries.length} entries`);
    }
  }

  // Apply performance limits
  const messageLimit = options?.limit || 5000; // Increased default limit
  const limitedMessageFiles = messageFiles.slice(0, messageLimit);

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
    console.log(
      `Processing ${filesToProcess.length} new/changed files, ${unchangedFiles.length} cached files`,
    );
  } else {
    filesToProcess.push(...limitedMessageFiles);
    console.log(
      `Processing ${filesToProcess.length} message files (cache disabled or unavailable)`,
    );
  }

  // Load session metadata with enhanced error handling
  const sessionMap = new Map<string, SessionMetadata>();
  let sessionLoadErrors = 0;

  for (const file of sessionFiles) {
    const session = await safeFileOperation(
      async () => {
        const content = await readFile(file, "utf-8");
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

    if (session) {
      sessionMap.set(session.id, session);
    } else {
      sessionLoadErrors++;
    }
  }

  if (sessionLoadErrors > 0) {
    console.warn(
      `Failed to load ${sessionLoadErrors}/${sessionFiles.length} session files`,
    );
  }

  // Load messages and group by session with batching for better performance
  const messagesBySession = new Map<string, MessageData[]>();
  const batchSize = 100; // Process files in batches
  const newCacheEntries: CacheEntry[] = [];

  for (let i = 0; i < filesToProcess.length; i += batchSize) {
    const batch = filesToProcess.slice(i, i + batchSize);

    const batchPromises = batch.map(async (file) => {
      return await safeFileOperation(
        async () => {
          const content = await readFile(file, "utf-8");
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

          // Create cache entry for this file
          const metadata = await getFileMetadata(file);
          const cacheEntry: CacheEntry = {
            filePath: file,
            mtime: metadata.mtime,
            size: metadata.size,
            hash: metadata.hash,
            processedAt: Date.now(),
          };
          newCacheEntries.push(cacheEntry);

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
    if (i % 1000 === 0 && i > 0) {
      console.log(`Processed ${i}/${filesToProcess.length} message files...`);
    }
  }

  // Update cache with new entries
  if (useCache && newCacheEntries.length > 0) {
    const updatedCache: CacheData = {
      version: "1.0",
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
    console.log(`Updated cache with ${newCacheEntries.length} new entries`);
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

    // Progress indicator for large datasets
    if (processedCount % 100 === 0) {
      console.log(`Processed ${processedCount}/${sessionMap.size} sessions...`);
    }
  }

  console.log(`Completed processing ${processedCount} sessions`);
  return { sessions };
}

export async function loadAllData(options?: {
  limit?: number;
  cache?: boolean;
}): Promise<OpenCodeData> {
  return await loadOpenCodeData(options);
}
