import { test, expect, beforeAll, afterAll } from "bun:test";
import { StreamingProcessor } from "../src/lib/streaming";
import { ProgressManager } from "../src/lib/progress";
import { CacheManager } from "../src/lib/cache";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";

let testDir: string;
let cacheDir: string;
const sessionCount = 100;
const messagesPerSession = 10;

beforeAll(async () => {
  testDir = path.join(tmpdir(), "ocsight-test-sessions");
  cacheDir = path.join(tmpdir(), "ocsight-test-cache");

  await fs.mkdir(testDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  // Generate test data
  await generateTestData(testDir, sessionCount, messagesPerSession);
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
  await fs.rm(cacheDir, { recursive: true, force: true });
});

test("should process sessions within performance targets", async () => {
  const progress = new ProgressManager(sessionCount);
  const processor = new StreamingProcessor(progress, 20, 50);

  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  const result = await processor.processDirectory(testDir);

  const endTime = Date.now();
  const endMemory = process.memoryUsage().heapUsed;

  const duration = endTime - startTime;
  const memoryUsedMB = (endMemory - startMemory) / 1024 / 1024;

  console.log(`Processing ${sessionCount} sessions took ${duration}ms`);
  console.log(`Memory used: ${memoryUsedMB.toFixed(2)}MB`);
  console.log(`Sessions processed: ${result.sessions.length}`);
  console.log(`Messages processed: ${result.messages.length}`);
  console.log(`Tools processed: ${result.tools.length}`);

  // Performance targets
  expect(duration).toBeLessThan(5000); // 5 seconds
  expect(memoryUsedMB).toBeLessThan(100); // 100MB
  expect(result.sessions.length).toBe(sessionCount);
});

test("should handle cache operations efficiently", async () => {
  const cache = new CacheManager(cacheDir, 100, 50, true);
  await cache.initialize();

  const testData = await loadTestData(testDir, 10);
  const fileHashes = await generateFileHashes(testDir, 10);

  const startTime = Date.now();

  // Test cache set with proper key format
  const cacheKey = `${testDir}:test`;
  await cache.set(cacheKey, testData, fileHashes);

  // Test cache get
  const cached = await cache.get(cacheKey);

  const endTime = Date.now();

  // Cache test debugging removed

  expect(cached).not.toBeNull();
  expect(cached!.length).toBe(10);
  expect(endTime - startTime).toBeLessThan(1000); // 1 second

  const health = cache.getHealth();
  expect(health.isValid).toBe(true);
});

test("should demonstrate performance improvement with caching", async () => {
  const cache = new CacheManager(cacheDir, 100, 50, true);
  await cache.initialize();

  const testData = await loadTestData(testDir, 50);
  const fileHashes = await generateFileHashes(testDir, 50);

  // First run (without cache)
  const progress1 = new ProgressManager(50);
  const processor1 = new StreamingProcessor(progress1, 20, 50);

  const start1 = Date.now();
  await processor1.processDirectory(testDir);
  const duration1 = Date.now() - start1;

  // Cache the results
  await cache.set("benchmark-key", testData, fileHashes);

  // Second run (with cache simulation)
  const start2 = Date.now();
  const cached = await cache.get("benchmark-key");
  const duration2 = Date.now() - start2;

  console.log(`First run: ${duration1}ms`);
  console.log(`Cached run: ${duration2}ms`);
  console.log(
    `Speed improvement: ${(((duration1 - duration2) / duration1) * 100).toFixed(1)}%`,
  );

  expect(cached).not.toBeNull();
  expect(duration2).toBeLessThan(duration1);
});

test("should handle large datasets efficiently", async () => {
  const largeTestDir = path.join(tmpdir(), "ocsight-large-test");
  await fs.mkdir(largeTestDir, { recursive: true });

  // Generate larger dataset
  await generateTestData(largeTestDir, 500, 20);

  const progress = new ProgressManager(500, { quiet: true });
  const processor = new StreamingProcessor(progress, 50, 200);

  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  const result = await processor.processDirectory(largeTestDir);

  const endTime = Date.now();
  const endMemory = process.memoryUsage().heapUsed;

  const duration = endTime - startTime;
  const memoryUsedMB = (endMemory - startMemory) / 1024 / 1024;

  console.log(
    `Large dataset processing: ${duration}ms, ${memoryUsedMB.toFixed(2)}MB`,
  );

  // Should handle larger datasets gracefully
  expect(duration).toBeLessThan(15000); // 15 seconds
  expect(memoryUsedMB).toBeLessThan(200); // 200MB
  expect(result.sessions.length).toBe(500);

  await fs.rm(largeTestDir, { recursive: true, force: true });
});

async function generateTestData(
  dir: string,
  sessionCount: number,
  messagesPerSession: number,
): Promise<void> {
  for (let i = 0; i < sessionCount; i++) {
    const session = {
      id: `session-${i}`,
      title: `Test Session ${i}`,
      time: {
        created: Date.now() - i * 86400000, // Spread over days
        updated: Date.now(),
      },
      messages: Array.from({ length: messagesPerSession }, (_, j) => ({
        id: `msg-${i}-${j}`,
        role: j % 2 === 0 ? "user" : ("assistant" as const),
        content: `Test message ${j} in session ${i}`,
        timestamp: new Date(
          Date.now() - i * 86400000 + j * 60000,
        ).toISOString(),
        tools:
          j % 3 === 0
            ? [
                {
                  name: "test-tool",
                  duration_ms: Math.floor(Math.random() * 1000),
                  timestamp: new Date(
                    Date.now() - i * 86400000 + j * 60000,
                  ).toISOString(),
                },
              ]
            : undefined,
      })),
      model: {
        provider: "test-provider",
        model: "test-model",
      },
      tokens_used: Math.floor(Math.random() * 1000) + 100,
      cost_cents: Math.floor(Math.random() * 10) + 1,
    };

    await fs.writeFile(
      path.join(dir, `session-${i}.json`),
      JSON.stringify(session, null, 2),
    );
  }
}

async function loadTestData(dir: string, count: number): Promise<any[]> {
  const sessions: any[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const content = await fs.readFile(
        path.join(dir, `session-${i}.json`),
        "utf-8",
      );
      sessions.push(JSON.parse(content));
    } catch (error) {
      // Skip missing files
    }
  }

  return sessions;
}

async function generateFileHashes(
  dir: string,
  count: number,
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};

  for (let i = 0; i < count; i++) {
    const fileName = `session-${i}.json`;
    try {
      const content = await fs.readFile(path.join(dir, fileName), "utf-8");
      // Simple hash for testing
      hashes[fileName] = Buffer.from(content).toString("base64").slice(0, 16);
    } catch (error) {
      // Skip missing files
    }
  }

  return hashes;
}
