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

    if (now - this.lastUpdateTime < this.UPDATE_THROTTLE_MS) return;

    this.lastUpdateTime = now;
    this.processedItems = processed;

    const percentage =
      this.totalItems > 0 ? (processed / this.totalItems) * 100 : 0;
    const elapsed = now - this.startTime.getTime();
    const elapsedSeconds = elapsed / 1000;
    const rate =
      elapsedSeconds > 0 && processed > 0 ? processed / elapsedSeconds : 0;
    const eta =
      rate > 0 && this.totalItems > processed
        ? (this.totalItems - processed) / rate
        : 0;

    this.progressState = {
      processed,
      total: this.totalItems,
      operation,
      elapsed,
    };

    if (this.isQuiet) return;

    const etaStr = this.formatTime(eta);
    const rateStr = rate.toFixed(0);
    const percentStr = percentage.toFixed(1);

    const output = this.isVerbose
      ? `\r${operation}: ${percentStr}% (${processed}/${this.totalItems}) Rate: ${rateStr}/sec ETA: ${etaStr} Elapsed: ${this.formatTime(elapsed / 1000)}`
      : `\r${operation}: ${percentStr}% (${processed}/${this.totalItems}) ETA: ${etaStr}`;

    process.stdout.write(output);
  }

  private setupSignalHandlers(): void {
    process.on("SIGINT", async () => {
      console.log("\nInterrupted. Saving progress...");
      await this.saveProgressState();
      process.exit(0);
    });
  }

  private async saveProgressState(): Promise<void> {
    try {
      const stateFile = join(tmpdir(), "ocsight-progress.json");
      await Bun.write(stateFile, JSON.stringify(this.progressState));
    } catch {}
  }

  async resumeFromSavedState(): Promise<boolean> {
    try {
      const stateFile = join(tmpdir(), "ocsight-progress.json");
      const file = Bun.file(stateFile);
      if (await file.exists()) {
        const savedState = await file.json();
        this.progressState = savedState;
        this.processedItems = savedState.processed;
        console.log(
          `Resuming from ${savedState.processed}/${savedState.total} items...`,
        );
        return true;
      }
    } catch {}
    return false;
  }

  finish(): void {
    if (!this.isQuiet) {
      const totalTime = Date.now() - this.startTime.getTime();
      console.log(`\nCompleted in ${this.formatTime(totalTime / 1000)}`);
    }
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0 || isNaN(seconds)) return "--";

    if (seconds < 60) return `${Math.round(seconds)}s`;

    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
