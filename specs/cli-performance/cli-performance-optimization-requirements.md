# CLI Performance Optimization - Requirements

## Problem Statement

The ocsight CLI currently processes 26K+ messages effectively but lacks performance optimizations for large datasets. Processing takes 8+ seconds with full dataset rebuild on every command, poor progress feedback, and potential memory issues with larger datasets.

## Current Performance Baseline

- **Dataset Size**: 26,324 messages, 708 sessions, 77K+ tool uses
- **Processing Time**: 8 seconds for full analysis
- **Memory Usage**: Loads entire dataset into memory
- **Cache**: Works but rebuilds frequently, no incremental updates
- **Progress**: Basic counter every 1000 items

## Requirements

### REQ-1: Performance Optimization

**Priority: HIGH**

1.1 **Quick Analysis Mode**

- Add `--quick` flag for faster insights with configurable data limits
- Default to most recent 1000 messages/30 days for quick overview
- Preserve current behavior as default for complete analysis

  1.2 **Incremental Processing**

- Only process new/modified files since last cache update
- Track file modification timestamps in cache metadata
- Implement differential updates instead of full rebuilds

  1.3 **Parallel Processing**

- Process message files concurrently using worker threads
- Batch file operations for better I/O efficiency
- Target 50% reduction in processing time for large datasets

### REQ-2: Progress & User Experience

**Priority: MEDIUM**

2.1 **Enhanced Progress Indicators**

- Show percentage completion with time estimates
- Display current operation (parsing, analyzing, caching)
- Add spinner/progress bar for better visual feedback
- Show processing rate (files/second)

  2.2 **Configurable Output Verbosity**

- Add `--verbose` flag for detailed progress logging
- Add `--quiet` flag to suppress all progress output
- Default to balanced progress information

  2.3 **Interruption Handling**

- Graceful shutdown on Ctrl+C with partial cache saving
- Resume capability for interrupted long-running operations

### REQ-3: Memory Management

**Priority: MEDIUM**

3.1 **Streaming Processing**

- Process files in chunks instead of loading all into memory
- Implement streaming JSON parsing for large message files
- Target max memory usage of 100MB regardless of dataset size

  3.2 **Memory-Efficient Data Structures**

- Use Maps/Sets for better memory efficiency vs arrays
- Implement data compression for cached statistics
- Add memory usage monitoring with optional reporting

  3.3 **Garbage Collection Optimization**

- Force GC after processing large batches
- Monitor memory pressure and adjust batch sizes dynamically

### REQ-4: Advanced Caching

**Priority: LOW**

4.1 **Smart Cache Invalidation**

- Invalidate only affected cache segments when data changes
- Implement cache versioning per data source
- Add cache health checks and auto-repair

  4.2 **Cache Compression**

- Compress cached data using built-in algorithms
- Implement LRU eviction for cache size management
- Add cache statistics and optimization recommendations

## Success Criteria

### Performance Targets

- **Quick mode**: ≤2 seconds for recent data analysis
- **Full analysis**: ≤5 seconds for 26K+ message dataset
- **Memory usage**: ≤100MB peak regardless of dataset size
- **Incremental updates**: ≤1 second for new data processing

### User Experience Targets

- **Progress visibility**: Clear completion percentage and ETA
- **Interruption recovery**: Resume within 1 second of restart
- **Verbosity control**: 3 levels (quiet, normal, verbose)

### Technical Targets

- **Cache hit rate**: ≥90% for repeat operations
- **Parallel efficiency**: 50% reduction in processing time
- **Memory efficiency**: Streaming processing with constant memory usage

## Non-Requirements

- Backward compatibility breaking changes
- External dependencies for core functionality
- Complex configuration files
- Database storage (maintain file-based approach)

## Risk Assessment

**HIGH RISK**: Memory streaming implementation complexity
**MEDIUM RISK**: Parallel processing race conditions
**LOW RISK**: Progress indicator implementation

## Acceptance Testing

Each requirement must pass:

1. Unit tests for performance functions
2. Integration tests with large datasets (50K+ messages)
3. Memory usage profiling under various loads
4. User experience testing with different verbosity levels
