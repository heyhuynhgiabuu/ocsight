# CLI Performance Optimization - Design

## Architecture Overview

The performance optimization will implement a **streaming-first, cache-smart** architecture that processes data incrementally while maintaining backward compatibility.

## Design Components

### 1. Quick Analysis Mode

```typescript
// Enhanced CLI options
interface CliOptions {
  quick?: boolean; // Fast analysis mode
  limit?: number; // Custom message limit
  recentDays?: number; // Days to analyze in quick mode
  verbose?: boolean; // Detailed progress logging
  quiet?: boolean; // Suppress progress output
}

// Quick mode defaults
const QUICK_MODE_DEFAULTS = {
  messageLimit: 1000,
  recentDays: 30,
  sessionLimit: 50,
};
```

**Implementation Strategy:**

- Add `--quick` flag to all commands (analyze, stats, export)
- Filter data by modification time before processing
- Use separate quick-mode cache to avoid invalidating full cache
- Preserve all existing functionality as default behavior

### 2. Incremental Cache System

```typescript
interface CacheMetadata {
  version: string;
  lastUpdate: Date;
  fileHashes: Map<string, string>; // Track file changes
  partialCache: Map<string, any>; // Incremental updates
}

class IncrementalCache {
  // Only process files newer than last cache update
  getModifiedFiles(lastUpdate: Date): string[];

  // Merge new data with existing cache
  updateCache(newData: ProcessedData): void;

  // Smart invalidation of affected cache segments
  invalidateAffected(changedFiles: string[]): void;
}
```

**Benefits:**

- 90%+ cache hit rate for repeat operations
- Sub-second updates for new data
- Preserve memory efficiency

### 3. Streaming Data Processing with Batch Concurrency

```typescript
// Memory-efficient streaming processor with controlled concurrency
class StreamingProcessor {
  private readonly BATCH_SIZE = 100;
  private readonly MAX_MEMORY_MB = 100;
  private readonly CONCURRENT_BATCHES = 4; // Controlled parallelism

  async processFiles(files: string[]): Promise<ProcessedData> {
    const results = new Map();
    const batches = this.createBatches(files);

    // Process batches concurrently with limit to avoid memory pressure
    for (let i = 0; i < batches.length; i += this.CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + this.CONCURRENT_BATCHES);
      const batchPromises = concurrentBatches.map((batch) =>
        this.processBatch(batch),
      );
      const batchResults = await Promise.all(batchPromises);

      // Merge results sequentially to maintain order
      for (const batchData of batchResults) {
        this.mergeBatchResults(results, batchData);
      }

      // Force GC after each concurrent batch set if memory pressure
      if (this.getMemoryUsage() > this.MAX_MEMORY_MB) {
        global.gc?.();
      }
    }

    return results;
  }
}
```

**Concurrency Strategy:**

- Use Promise.all() for controlled batch concurrency (4 concurrent batches max)
- Avoid full worker threads to prevent race conditions and complexity
- Maintain memory safety through batch size limits and GC triggers
- Target 50% processing time reduction through batch-level parallelism

### 4. Enhanced Progress System with Throttling and Recovery

```typescript
class ProgressManager {
  private startTime: Date;
  private processedItems: number = 0;
  private totalItems: number;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_THROTTLE_MS = 100; // Max 10 updates per second
  private progressState: ProgressState; // For SIGINT recovery

  constructor() {
    this.setupSignalHandlers();
  }

  updateProgress(processed: number, operation: string): void {
    const now = Date.now();

    // Throttle updates to prevent spam
    if (now - this.lastUpdateTime < this.UPDATE_THROTTLE_MS) {
      return;
    }

    this.lastUpdateTime = now;
    this.processedItems = processed;

    const percentage = (processed / this.totalItems) * 100;
    const elapsed = now - this.startTime.getTime();
    const rate = processed / (elapsed / 1000);
    const eta = (this.totalItems - processed) / rate;

    // Save progress state for recovery
    this.progressState = {
      processed,
      total: this.totalItems,
      operation,
      elapsed,
    };

    if (!this.isQuiet) {
      process.stdout.write(
        `\r${operation}: ${percentage.toFixed(1)}% (${processed}/${this.totalItems}) ` +
          `Rate: ${rate.toFixed(0)}/sec ETA: ${this.formatTime(eta)}`,
      );
    }
  }

  private setupSignalHandlers(): void {
    process.on("SIGINT", () => {
      console.log("\nInterrupted. Saving progress...");
      this.saveProgressState();
      process.exit(0);
    });
  }

  private saveProgressState(): void {
    // Save to temp file for resume capability
    const stateFile = path.join(os.tmpdir(), "ocsight-progress.json");
    fs.writeFileSync(stateFile, JSON.stringify(this.progressState));
  }

  resumeFromSavedState(): boolean {
    try {
      const stateFile = path.join(os.tmpdir(), "ocsight-progress.json");
      if (fs.existsSync(stateFile)) {
        const savedState = JSON.parse(fs.readFileSync(stateFile, "utf8"));
        this.progressState = savedState;
        this.processedItems = savedState.processed;
        console.log(
          `Resuming from ${savedState.processed}/${savedState.total} items...`,
        );
        return true;
      }
    } catch (error) {
      // Ignore errors, start fresh
    }
    return false;
  }
}
```

**Progress Features:**

- Throttle updates to 100ms minimum interval for smooth UX
- Save progress state on SIGINT for resume capability
- Resume from saved state on restart
- Memory-efficient state tracking for large datasets

### 5. Advanced Cache Features

```typescript
interface CompressedCache {
  data: Buffer; // zlib compressed data
  metadata: CacheMetadata;
  accessTime: Date; // For LRU tracking
}

class CacheManager {
  private readonly MAX_CACHE_SIZE_MB = 50;
  private readonly COMPRESSION_LEVEL = 6; // zlib level

  // Compress data before storing
  async compressAndStore(key: string, data: any): Promise<void> {
    const jsonData = JSON.stringify(data);
    const compressed = await this.compress(jsonData);
    const entry: CompressedCache = {
      data: compressed,
      metadata: this.generateMetadata(data),
      accessTime: new Date(),
    };
    this.storeCompressed(key, entry);
    this.enforceLRU();
  }

  // Decompress on retrieval
  async retrieveAndDecompress(key: string): Promise<any> {
    const entry = this.getCompressed(key);
    if (!entry) return null;
    entry.accessTime = new Date(); // Update LRU
    const decompressed = await this.decompress(entry.data);
    return JSON.parse(decompressed);
  }

  // LRU eviction when cache exceeds size limit
  private enforceLRU(): void {
    const currentSize = this.calculateCacheSize();
    if (currentSize > this.MAX_CACHE_SIZE_MB) {
      const entries = this.getAllEntries().sort(
        (a, b) => a.accessTime.getTime() - b.accessTime.getTime(),
      );
      let freedSize = 0;
      for (const entry of entries) {
        if (currentSize - freedSize <= this.MAX_CACHE_SIZE_MB) break;
        freedSize += this.calculateEntrySize(entry);
        this.deleteEntry(entry.key);
      }
    }
  }
}
```

**Implementation Strategy:**

- Compress cached data using Node.js zlib with level 6 for 30%+ size reduction
- Implement LRU eviction based on access time tracking
- Automatic cleanup when cache exceeds 50MB limit
- Add cache statistics reporting (hit rate, compression ratio, eviction count)

## Implementation Plan

### Phase 1: Quick Mode (Week 1)

1. Add CLI flags and option parsing
2. Implement time-based filtering for recent data
3. Create quick-mode cache namespace
4. Add unit tests for quick mode logic

### Phase 2: Progress Enhancement (Week 1)

1. Implement ProgressManager class
2. Add verbose/quiet modes to all commands
3. Integrate progress reporting in data processing loops
4. Add graceful shutdown handling (Ctrl+C)

### Phase 3: Incremental Caching (Week 2)

1. Extend cache metadata with file tracking
2. Implement file modification detection
3. Build incremental update logic
4. Add cache health checks and auto-repair

### Phase 4: Memory Optimization (Week 2)

1. Implement streaming file processor
2. Add memory usage monitoring
3. Optimize data structures (Maps vs Arrays)
4. Add garbage collection hints

## Memory Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Streaming Processor                      │
├─────────────────────────────────────────────────────────────┤
│  Input Files (26K+)    →    Batch Processor (100 files)     │
│                        │                                    │
│  File Stream Reader    →    JSON Parser (streaming)         │
│                        │                                    │
│  Batch Aggregator      →    Results Merger                  │
│                        │                                    │
│  Memory Monitor        →    GC Trigger (>100MB)             │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Incremental Cache                        │
├─────────────────────────────────────────────────────────────┤
│  Metadata Store        →    File Hash Tracker               │
│  (timestamps, versions)│    (detect changes)                │
│                        │                                    │
│  Partial Cache         →    Smart Invalidation              │
│  (unchanged data)      │    (affected segments only)        │
└─────────────────────────────────────────────────────────────┘
```

## Performance Targets

| Metric             | Current | Target | Strategy              |
| ------------------ | ------- | ------ | --------------------- |
| Quick Analysis     | N/A     | ≤2 sec | Recent data filtering |
| Full Analysis      | 8 sec   | ≤5 sec | Streaming + parallel  |
| Memory Usage       | ~200MB  | ≤100MB | Batch processing      |
| Cache Hit Rate     | ~50%    | ≥90%   | Incremental updates   |
| Incremental Update | N/A     | ≤1 sec | Change detection      |

## Risk Mitigation

### High Risk: Memory Streaming Complexity

- **Mitigation**: Implement in phases with fallback to current system
- **Testing**: Load test with 100K+ message datasets
- **Monitoring**: Add memory usage alerts during processing

### Medium Risk: Parallel Processing Race Conditions

- **Mitigation**: Use batch-based processing instead of true parallelism
- **Testing**: Stress test with concurrent operations
- **Fallback**: Single-threaded processing if issues detected

## Backwards Compatibility

- All existing CLI commands work unchanged
- Default behavior remains identical (full dataset analysis)
- New flags are optional and additive
- Cache format maintains compatibility with version detection

## Testing Strategy

1. **Unit Tests**: Each optimization component in isolation
2. **Integration Tests**: Full commands with various dataset sizes
3. **Performance Tests**: Benchmark against current implementation
4. **Memory Tests**: Monitor memory usage under different loads
5. **User Experience Tests**: Progress indicators and interruption handling

## Success Metrics

- [ ] Quick mode completes in ≤2 seconds
- [ ] Full analysis improves by ≥30%
- [ ] Memory usage stays ≤100MB constant
- [ ] Cache hit rate ≥90% for repeat operations
- [ ] All existing functionality preserved
- [ ] Progress indicators provide clear feedback
