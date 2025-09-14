import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { OpenCodeData, OpenCodeSession, OpenCodeMessage } from "../types";

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

export async function loadOpenCodeData(): Promise<OpenCodeData> {
  const dataDir = await findOpenCodeDataDirectory();
  const sessionFiles = await findSessionFiles(dataDir);
  const messageFiles = await findMessageFiles(dataDir);

  console.log(
    `Found ${sessionFiles.length} session files and ${messageFiles.length} message files`,
  );

  // Load session metadata
  const sessionMap = new Map<string, SessionMetadata>();
  for (const file of sessionFiles) {
    try {
      const content = await readFile(file, "utf-8");
      const session = JSON.parse(content) as SessionMetadata;
      sessionMap.set(session.id, session);
    } catch (error) {
      // Skip invalid files
    }
  }

  // Load messages and group by session
  const messagesBySession = new Map<string, MessageData[]>();
  for (const file of messageFiles.slice(0, 1000)) {
    // Limit for performance
    try {
      const content = await readFile(file, "utf-8");
      const message = JSON.parse(content) as MessageData;

      if (!messagesBySession.has(message.sessionID)) {
        messagesBySession.set(message.sessionID, []);
      }
      messagesBySession.get(message.sessionID)!.push(message);
    } catch (error) {
      // Skip invalid files
    }
  }

  // Reconstruct sessions
  const sessions: OpenCodeSession[] = [];
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

    // Convert to our expected format
    const session: OpenCodeSession = {
      id: sessionId,
      title: sessionMeta.title || "Untitled Session",
      created_at: new Date(sessionMeta.time.created).toISOString(),
      updated_at: sessionMeta.time.updated
        ? new Date(sessionMeta.time.updated).toISOString()
        : new Date(sessionMeta.time.created).toISOString(),
      messages: messages.map(
        (msg) =>
          ({
            id: msg.id,
            role: msg.role,
            content: msg.content || "",
            timestamp: new Date(msg.time.created).toISOString(),
            tools: msg.tools || [],
          }) as OpenCodeMessage,
      ),
      tokens_used: totalTokens,
      cost_cents: Math.round(totalCost * 100), // Convert to cents
      model: {
        provider: provider,
        model: model,
      },
    };

    if (session.messages.length > 0) {
      sessions.push(session);
    }
  }

  return { sessions };
}

export async function loadAllData(): Promise<OpenCodeData> {
  return await loadOpenCodeData();
}
