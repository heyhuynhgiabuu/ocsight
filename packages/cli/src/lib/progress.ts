import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

interface ProgressState {
  processed: number;
  total: number;
  operation: string;
  elapsed: number;
}

export class ProgressManager {
  private startTime: Date;
  private processedItems: number = 0;
  private totalItems: number;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_THROTTLE_MS = 100;
  private progressState!: ProgressState;
  private isQuiet: boolean = false;
  private isVerbose: boolean = false;

  constructor(
    totalItems: number,
    options?: { quiet?: boolean; verbose?: boolean },
  ) {
    this.startTime = new Date();
    this.totalItems = totalItems;
    this.isQuiet = options?.quiet || false;
    this.isVerbose = options?.verbose || false;
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

    const percentage =
      this.totalItems > 0 ? (processed / this.totalItems) * 100 : 0;
    const elapsed = now - this.startTime.getTime();
    const elapsedSeconds = elapsed / 1000;

    // Calculate rate with protection against division by zero
    const rate =
      elapsedSeconds > 0 && processed > 0 ? processed / elapsedSeconds : 0;

    // Calculate ETA with protection against invalid values
    const eta =
      rate > 0 && this.totalItems > processed
        ? (this.totalItems - processed) / rate
        : 0;

    // Save progress state for recovery
    this.progressState = {
      processed,
      total: this.totalItems,
      operation,
      elapsed,
    };

    if (!this.isQuiet) {
      const etaStr = this.formatTime(eta);
      const rateStr = rate.toFixed(0);
      const percentStr = percentage.toFixed(1);

      if (this.isVerbose) {
        process.stdout.write(
          `\r${operation}: ${percentStr}% (${processed}/${this.totalItems}) ` +
            `Rate: ${rateStr}/sec ETA: ${etaStr} ` +
            `Elapsed: ${this.formatTime(elapsed / 1000)}`,
        );
      } else {
        process.stdout.write(
          `\r${operation}: ${percentStr}% (${processed}/${this.totalItems}) ETA: ${etaStr}`,
        );
      }
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
    try {
      const stateFile = join(tmpdir(), "ocsight-progress.json");
      writeFileSync(stateFile, JSON.stringify(this.progressState));
    } catch (error) {
      // Ignore errors, continue with exit
    }
  }

  resumeFromSavedState(): boolean {
    try {
      const stateFile = join(tmpdir(), "ocsight-progress.json");
      if (existsSync(stateFile)) {
        const savedState = JSON.parse(readFileSync(stateFile, "utf8"));
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

  finish(): void {
    if (!this.isQuiet) {
      const totalTime = Date.now() - this.startTime.getTime();
      console.log(`\nCompleted in ${this.formatTime(totalTime / 1000)}`);
    }
  }

  private formatTime(seconds: number): string {
    // Handle invalid inputs
    if (!isFinite(seconds) || seconds <= 0 || isNaN(seconds)) {
      return "--";
    }

    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}
