import { readdir } from "fs/promises";
import path from "path";
import { ProgressManager } from "./progress";
import { OpenCodeSession, OpenCodeMessage, ToolUsage } from "../types";
import { performance } from "perf_hooks";

export class StreamingProcessor {
  private progress: ProgressManager;
  private batchSize: number;
  private maxMemoryMB: number;
  private processedSessions: OpenCodeSession[] = [];
  private processedMessages: OpenCodeMessage[] = [];
  private processedTools: ToolUsage[] = [];

  constructor(progress: ProgressManager, batchSize = 50, maxMemoryMB = 100) {
    this.progress = progress;
    this.batchSize = batchSize;
    this.maxMemoryMB = maxMemoryMB;
  }

  async processDirectory(dirPath: string): Promise<{
    sessions: OpenCodeSession[];
    messages: OpenCodeMessage[];
    tools: ToolUsage[];
  }> {
    const files = await this.getSessionFiles(dirPath);
    let processed = 0;

    for (let i = 0; i < files.length; i += this.batchSize) {
      const batch = files.slice(i, i + this.batchSize);
      await this.processBatch(batch, dirPath);
      processed += batch.length;

      this.progress.updateProgress(processed, "Processing sessions");

      if (this.shouldThrottle()) {
        await this.throttle();
      }
    }

    this.progress.finish();
    return {
      sessions: this.processedSessions,
      messages: this.processedMessages,
      tools: this.processedTools,
    };
  }

  private async getSessionFiles(dirPath: string): Promise<string[]> {
    try {
      const entries = await readdir(dirPath);
      const files: string[] = [];

      for (const entry of entries) {
        if (entry.endsWith(".json")) {
          files.push(entry);
        }
      }

      return files.sort();
    } catch (error) {
      return [];
    }
  }

  private async processBatch(files: string[], dirPath: string): Promise<void> {
    const concurrency = Math.min(files.length, this.getOptimalConcurrency());
    const chunks = this.chunkArray(
      files,
      Math.ceil(files.length / concurrency),
    );

    const chunkPromises = chunks.map(async (chunk) => {
      return this.processChunk(chunk, dirPath);
    });

    await Promise.all(chunkPromises);
  }

  private async processChunk(files: string[], dirPath: string): Promise<void> {
    for (const file of files) {
      try {
        const filePath = path.join(dirPath, file);
        const content = await Bun.file(filePath).text();
        const session = JSON.parse(content) as OpenCodeSession;

        this.processedSessions.push(session);

        for (const message of session.messages || []) {
          this.processedMessages.push(message);

          if (message.tools) {
            for (const tool of message.tools) {
              this.processedTools.push(tool);
            }
          }
        }
      } catch (error) {
        // Skip invalid files
      }
    }
  }

  private getOptimalConcurrency(): number {
    const start = performance.now();
    const availableMemoryMB =
      this.maxMemoryMB - process.memoryUsage().heapUsed / 1024 / 1024;
    const estimatedMemoryPerBatch = 10; // Estimate 10MB per batch
    const concurrency = Math.max(
      1,
      Math.floor(availableMemoryMB / estimatedMemoryPerBatch),
    );

    // Trigger garbage collection if memory is high
    if (availableMemoryMB < 50) {
      Bun.gc();
    }

    const duration = performance.now() - start;
    if (duration > 10) {
      console.warn(`Slow concurrency calculation: ${duration.toFixed(2)}ms`);
    }

    return concurrency;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private shouldThrottle(): boolean {
    const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    return usedMemory > this.maxMemoryMB;
  }

  private async throttle(): Promise<void> {
    // Use Bun.sleep instead of setTimeout for better performance
    await Bun.sleep(100);

    // Trigger garbage collection during throttling
    Bun.gc();
  }

  getStats(): {
    sessionCount: number;
    messageCount: number;
    toolCount: number;
    memoryUsageMB: number;
    processingTimeMs: number;
  } {
    const start = performance.now();
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    const processingTime = performance.now() - start;

    return {
      sessionCount: this.processedSessions.length,
      messageCount: this.processedMessages.length,
      toolCount: this.processedTools.length,
      memoryUsageMB: Math.round(memoryUsage * 100) / 100,
      processingTimeMs: Math.round(processingTime * 100) / 100,
    };
  }
}
