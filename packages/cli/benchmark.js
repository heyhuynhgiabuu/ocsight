#!/usr/bin/env bun

import { performance } from "perf_hooks";

async function benchmarkFileOperations() {
  console.log("📁 Benchmarking File Operations with Bun.js");
  console.log("=".repeat(50));

  const testFile = "/tmp/ocsight-benchmark-test.json";
  const testData = JSON.stringify(
    {
      sessions: Array.from({ length: 1000 }, (_, i) => ({
        id: `session-${i}`,
        messages: Array.from({ length: 10 }, (_, j) => ({
          id: `msg-${i}-${j}`,
          content: `Test message ${j} in session ${i}`.repeat(10),
        })),
      })),
    },
    null,
    2,
  );

  // Benchmark file write with Bun
  const writeStart = performance.now();
  await Bun.write(testFile, testData);
  const writeEnd = performance.now();
  const writeTime = writeEnd - writeStart;

  // Benchmark file read with Bun
  const readStart = performance.now();
  const content = await Bun.file(testFile).text();
  const readEnd = performance.now();
  const readTime = readEnd - readStart;

  // Cleanup
  await Bun.write(testFile, "");

  console.log(`Bun.js File Write Performance:`);
  console.log(`  Time: ${writeTime.toFixed(2)}ms`);
  console.log(`  Size: ${(testData.length / 1024).toFixed(2)}KB`);
  console.log(
    `  Throughput: ${((testData.length / 1024 / writeTime) * 1000).toFixed(2)}KB/s`,
  );

  console.log(`\nBun.js File Read Performance:`);
  console.log(`  Time: ${readTime.toFixed(2)}ms`);
  console.log(`  Size: ${(content.length / 1024).toFixed(2)}KB`);
  console.log(
    `  Throughput: ${((content.length / 1024 / readTime) * 1000).toFixed(2)}KB/s`,
  );

  // Compare with Node.js fs for reference
  const fs = await import("fs/promises");

  const nodeWriteStart = performance.now();
  await fs.writeFile(testFile + "-node", testData);
  const nodeWriteEnd = performance.now();
  const nodeWriteTime = nodeWriteEnd - nodeWriteStart;

  const nodeReadStart = performance.now();
  const nodeContent = await fs.readFile(testFile + "-node", "utf-8");
  const nodeReadEnd = performance.now();
  const nodeReadTime = nodeReadEnd - nodeReadStart;

  await fs.unlink(testFile + "-node");

  console.log(`\nNode.js File Write Performance:`);
  console.log(`  Time: ${nodeWriteTime.toFixed(2)}ms`);
  console.log(
    `  Throughput: ${((testData.length / 1024 / nodeWriteTime) * 1000).toFixed(2)}KB/s`,
  );

  console.log(`\nNode.js File Read Performance:`);
  console.log(`  Time: ${nodeReadTime.toFixed(2)}ms`);
  console.log(
    `  Throughput: ${((nodeContent.length / 1024 / nodeReadTime) * 1000).toFixed(2)}KB/s`,
  );

  console.log(`\n📊 Performance Comparison:`);
  console.log(
    `  Write Speed Improvement: ${(nodeWriteTime / writeTime).toFixed(2)}x faster`,
  );
  console.log(
    `  Read Speed Improvement: ${(nodeReadTime / readTime).toFixed(2)}x faster`,
  );

  return {
    bun: { writeTime, readTime },
    node: { writeTime: nodeWriteTime, readTime: nodeReadTime },
  };
}

async function benchmarkMemoryUsage() {
  console.log("\n💾 Memory Usage Analysis");
  console.log("=".repeat(50));

  const initialMemory = process.memoryUsage();
  console.log("Initial Memory:");
  console.log(`  RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(
    `  Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );

  // Perform some operations
  const testFile = "/tmp/memory-test.json";
  const largeData = JSON.stringify({
    data: Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      text: "Large data string ".repeat(100),
    })),
  });

  await Bun.write(testFile, largeData);
  const content = await Bun.file(testFile).text();
  JSON.parse(content);

  const afterOpsMemory = process.memoryUsage();
  console.log("\nAfter Operations:");
  console.log(`  RSS: ${(afterOpsMemory.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(
    `  Heap Used: ${(afterOpsMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );

  // Trigger garbage collection
  Bun.gc();
  await Bun.sleep(100);

  const afterGCMemory = process.memoryUsage();
  console.log("\nAfter Garbage Collection:");
  console.log(`  RSS: ${(afterGCMemory.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(
    `  Heap Used: ${(afterGCMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );

  await Bun.write(testFile, "");

  return {
    initial: initialMemory,
    afterOps: afterOpsMemory,
    afterGC: afterGCMemory,
  };
}

async function main() {
  console.log("🚀 Bun.js Performance Benchmark");
  console.log("=".repeat(50));

  const fileResults = await benchmarkFileOperations();
  const memoryResults = await benchmarkMemoryUsage();

  console.log("\n🎯 Summary");
  console.log("=".repeat(50));

  const writeImprovement =
    fileResults.node.writeTime / fileResults.bun.writeTime;
  const readImprovement = fileResults.node.readTime / fileResults.bun.readTime;

  console.log(
    `File Operations: ${writeImprovement > 1 ? writeImprovement.toFixed(2) + "x faster" : "No improvement"} (write), ${readImprovement > 1 ? readImprovement.toFixed(2) + "x faster" : "No improvement"} (read)`,
  );
  console.log(
    `Memory Efficiency: Bun.gc() available for manual garbage collection`,
  );
  console.log(
    `Overall Status: ${writeImprovement > 1 || readImprovement > 1 ? "✅ Bun.js optimizations working" : "⚠️  Check configuration"}`,
  );
}

if (import.meta.main) {
  main().catch(console.error);
}
