import { readdir, stat, readFile } from "fs/promises";
import { join } from "path";
import { getDefaultOpenCodePath } from "./data.js";

export interface ActiveSessionInfo {
  sessionId: string;
  provider: string;
  model: string;
  lastActivity: Date;
  messageCount: number;
  totalTokens: {
    input: number;
    output: number;
    reasoning: number;
    cache_write: number;
    cache_read: number;
    total: number;
  };
  totalCost: number;
  realCost?: number; // Real cost calculated from current model pricing
  currentContextTokens: number; // Tokens currently in the active context window
}

export async function findMostRecentlyActiveSession(): Promise<string | null> {
  try {
    const dataPath = getDefaultOpenCodePath();
    const messagePath = join(dataPath, "storage", "message");

    // Get all session directories
    const entries = await readdir(messagePath, { withFileTypes: true });
    const sessionDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("ses_"))
      .map((entry) => entry.name);

    if (sessionDirs.length === 0) return null;

    // Find the session with the most recent message
    let mostRecentTimestamp = 0;
    let mostRecentSession: string | null = null;

    for (const sessionId of sessionDirs) {
      try {
        const sessionPath = join(messagePath, sessionId);
        const messageFiles = await readdir(sessionPath);

        // Get the most recent message in this session
        for (const messageFile of messageFiles) {
          if (!messageFile.endsWith(".json")) continue;

          const messagePath = join(sessionPath, messageFile);
          const stats = await stat(messagePath);
          const timestamp = Math.floor(stats.mtime.getTime() / 1000);

          if (timestamp > mostRecentTimestamp) {
            mostRecentTimestamp = timestamp;
            mostRecentSession = sessionId;
          }
        }
      } catch (error) {
        // Skip sessions we can't read
        continue;
      }
    }

    return mostRecentSession;
  } catch (error) {
    console.warn("Warning: Could not detect active session from message files");
    return null;
  }
}

async function calculateCurrentContextTokens(
  messageFiles: string[],
  messagePath: string,
): Promise<number> {
  try {
    if (messageFiles.length === 0) return 0;

    // ACCURATE APPROACH: Find the most recent assistant message with significant token usage
    // OpenCode shows this, not just the array's last element

    // Get message file stats and sort by timestamp (most recent first)
    const messageData: Array<{ file: string; timestamp: number }> = [];

    for (const file of messageFiles) {
      try {
        const filePath = join(messagePath, file);
        const stats = await stat(filePath);
        messageData.push({
          file,
          timestamp: stats.mtime.getTime(),
        });
      } catch (error) {
        continue;
      }
    }

    // Sort by timestamp (most recent first)
    messageData.sort((a, b) => b.timestamp - a.timestamp);

    // Find the most recent assistant message with significant token usage
    for (const { file } of messageData) {
      try {
        const messageFilePath = join(messagePath, file);
        const content = await readFile(messageFilePath, "utf8");
        const message = JSON.parse(content);

        // Skip if not assistant message or no tokens
        if (message.role !== "assistant" || !message.tokens) continue;

        // Calculate total tokens from this message
        const directTokens =
          (message.tokens.input || 0) +
          (message.tokens.output || 0) +
          (message.tokens.reasoning || 0);
        const cacheTokens = message.tokens.cache
          ? (message.tokens.cache.write || 0) + (message.tokens.cache.read || 0)
          : 0;
        const totalTokens = directTokens + cacheTokens;

        // Skip messages with no significant token usage
        if (totalTokens < 1000) continue;

        // Found the most recent assistant message with tokens - this is what OpenCode shows!
        return Math.floor(totalTokens);
      } catch (error) {
        continue;
      }
    }

    return 0;
  } catch (error) {
    return 0;
  }
}

export async function getActiveSessionInfo(
  sessionId: string,
): Promise<ActiveSessionInfo | null> {
  try {
    const dataPath = getDefaultOpenCodePath();
    const messagePath = join(dataPath, "storage", "message", sessionId);

    // Read all message files in the session
    const messageFiles = await readdir(messagePath);
    const jsonFiles = messageFiles.filter((f) => f.endsWith(".json"));

    if (jsonFiles.length === 0) return null;

    // Initialize aggregation variables
    let provider = "unknown";
    let model = "unknown";
    let lastActivity = new Date(0);
    let totalCost = 0;
    let latestAssistantMessageTime = 0;

    const totalTokens = {
      input: 0,
      output: 0,
      reasoning: 0,
      cache_write: 0,
      cache_read: 0,
      total: 0,
    };

    // Process all message files to aggregate token data
    for (const messageFile of jsonFiles) {
      try {
        const messageFilePath = join(messagePath, messageFile);
        const stats = await stat(messageFilePath);

        if (stats.mtime > lastActivity) {
          lastActivity = stats.mtime;
        }

        const content = await readFile(messageFilePath, "utf8");
        const message = JSON.parse(content);

        // Get model info from the MOST RECENT assistant message
        if (
          message.role === "assistant" &&
          message.providerID &&
          message.modelID
        ) {
          // Use the message's actual timestamp if available, otherwise file mtime
          const messageTime =
            message.time?.completed ||
            message.time?.created ||
            stats.mtime.getTime();

          if (messageTime > latestAssistantMessageTime) {
            latestAssistantMessageTime = messageTime;
            provider = message.providerID;
            model = message.modelID;
          }
        }

        // Aggregate real token data from message
        if (message.tokens) {
          totalTokens.input += message.tokens.input || 0;
          totalTokens.output += message.tokens.output || 0;
          totalTokens.reasoning += message.tokens.reasoning || 0;

          if (message.tokens.cache) {
            totalTokens.cache_write += message.tokens.cache.write || 0;
            totalTokens.cache_read += message.tokens.cache.read || 0;
          }
        }

        // Aggregate cost data if available
        if (typeof message.cost === "number") {
          totalCost += message.cost;
        }
      } catch (error) {
        // Skip files we can't read
        continue;
      }
    }

    // Calculate total tokens
    totalTokens.total =
      totalTokens.input +
      totalTokens.output +
      totalTokens.reasoning +
      totalTokens.cache_write +
      totalTokens.cache_read;

    // Calculate current context window usage
    // This represents tokens currently in the active conversation context
    const currentContextTokens = calculateCurrentContextTokens(
      jsonFiles,
      messagePath,
    );

    // Calculate real cost using current model pricing
    let realCost = totalCost; // Fallback to stored cost
    try {
      const { findModel, calculateModelCost } = await import("./models-db.js");
      const modelId = `${provider}/${model}`;
      const modelData = await findModel(modelId);
      if (modelData) {
        // Distribute tokens (simplified - actual distribution should come from message data)
        const tokenDistribution = {
          input: Math.floor(totalTokens.total * 0.7),
          output: Math.floor(totalTokens.total * 0.2),
          reasoning: Math.floor(totalTokens.total * 0.05),
          cache_read: Math.floor(totalTokens.total * 0.02),
          cache_write: Math.floor(totalTokens.total * 0.03),
        };
        realCost = calculateModelCost(modelData, tokenDistribution);
      }
    } catch (error) {
      // Use stored cost if real cost calculation fails
    }

    return {
      sessionId,
      provider,
      model,
      lastActivity,
      messageCount: jsonFiles.length,
      totalTokens,
      totalCost,
      realCost,
      currentContextTokens: await currentContextTokens,
    };
  } catch (error) {
    return null;
  }
}
