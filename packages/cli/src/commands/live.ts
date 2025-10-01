import { Command } from "commander";
import chalk from "chalk";
import { bootstrap } from "../lib/bootstrap.js";
import { LiveMonitor, LiveStatus } from "../lib/live.js";
import { statusIndicator } from "../lib/ui.js";
import { SessionManager } from "../lib/session-manager.js";
import { calculateSessionMetrics } from "../lib/cost.js";
import { findOpenCodeDataDirectory } from "../lib/data.js";
import {
  MIN_REFRESH_INTERVAL,
  MAX_REFRESH_INTERVAL,
  DEFAULT_REFRESH_INTERVAL,
} from "../lib/constants.js";
import { BudgetTracker } from "../lib/budget-tracker.js";

export const liveCommand = new Command("live")
  .description("Monitor OpenCode usage in real-time")
  .option("--config <path>", "Path to config file")
  .option(
    "--refresh <seconds>",
    "Refresh interval in seconds",
    String(DEFAULT_REFRESH_INTERVAL),
  )
  .option("--session <id>", "Monitor specific session ID (e.g., ses_1234)")
  .option("--no-progress", "Hide progress bars")
  .action(async (options) => {
    try {
      const ctx = await bootstrap(options.config, false, false);
      const refreshInterval = parseInt(options.refresh, 10);

      if (
        refreshInterval < MIN_REFRESH_INTERVAL ||
        refreshInterval > MAX_REFRESH_INTERVAL
      ) {
        console.error(
          statusIndicator(
            "error",
            `Refresh interval must be between ${MIN_REFRESH_INTERVAL} and ${MAX_REFRESH_INTERVAL} seconds`,
          ),
        );
        process.exit(1);
      }

      const dataDir = await findOpenCodeDataDirectory();
      const sessionManager = new SessionManager();
      await sessionManager.init(dataDir);

      const budgetTracker = new BudgetTracker(
        sessionManager,
        ctx.config.budget,
      );

      const monitor = new LiveMonitor();

      console.log(chalk.blue("Starting live monitoring..."));
      console.log(chalk.dim(`Refresh interval: ${refreshInterval}s`));
      console.log(chalk.dim("Press Ctrl+C to stop\n"));

      // Show recent sessions (metadata only - very fast!)
      const recentSessions = sessionManager.getRecentSessions(5);
      if (recentSessions.length > 0 && !options.session) {
        console.log(
          chalk.cyan(
            "Recent Sessions (use --session <id> to monitor specific one):",
          ),
        );
        recentSessions.forEach((session, index) => {
          const isActive = index === 0 ? "[ACTIVE] " : "        ";
          const lastUpdate = new Date(session.mtime).toLocaleTimeString();
          console.log(`  ${isActive}${session.id}: ${lastUpdate}`);
        });
        console.log("");
      }

      // Get status function (NO MORE loadAllData - lazy loading!)
      const getStatus = async (): Promise<LiveStatus | null> => {
        try {
          // Determine which session to monitor
          let sessionId = options.session;

          if (!sessionId) {
            const mostRecent = sessionManager.getMostRecentSession();
            if (!mostRecent) {
              return null;
            }
            sessionId = mostRecent.id;
          }

          // Normalize session ID
          if (!sessionId.startsWith("ses_")) {
            sessionId = `ses_${sessionId}`;
          }

          // Load session (lazy - only 1 session loaded!)
          const session = await sessionManager.loadSession(sessionId);

          if (!session) {
            return null;
          }

          // Calculate token breakdown from messages
          const tokens = {
            input: session.messages
              .filter((m) => m.role === "user")
              .reduce((sum, m) => sum + (m.tokens?.input || 0), 0),
            output: session.messages
              .filter((m) => m.role === "assistant")
              .reduce((sum, m) => sum + (m.tokens?.output || 0), 0),
            reasoning: session.messages.reduce(
              (sum, m) => sum + (m.tokens?.reasoning || 0),
              0,
            ),
            cache: {
              write: session.messages.reduce(
                (sum, m) => sum + (m.tokens?.cache?.write || 0),
                0,
              ),
              read: session.messages.reduce(
                (sum, m) => sum + (m.tokens?.cache?.read || 0),
                0,
              ),
            },
          };

          // Calculate metrics
          const metrics = await calculateSessionMetrics({
            tokens,
            modelID: `${session.model.provider}/${session.model.model}`,
            cost_cents: session.cost_cents,
          });

          // Get model info for context window
          const { findModel } = await import("../lib/models-db.js");
          const modelInfo = await findModel(metrics.model_id);
          const contextLimit = modelInfo?.limit?.context || 128000;

          const recentActivity = await sessionManager.getRecentActivity(
            sessionId,
            30,
          );

          const monthlySpend = await budgetTracker.getMonthlySpend();
          const [budgetHealth, providerBudgets, budgetAlerts] =
            await Promise.all([
              budgetTracker.getBudgetHealth(monthlySpend),
              budgetTracker.getProviderBudgetStatus(monthlySpend),
              budgetTracker.getAlerts(monthlySpend),
            ]);

          return {
            sessionId: session.id.slice(0, 8),
            interactions: session.message_count,
            totalTokens: session.tokens_used,
            estimatedCost: metrics.cost.total,
            currentModel: metrics.model_id,
            tokenBreakdown: metrics.tokens,
            costBreakdown: metrics.cost,
            cacheHitRate: metrics.cache_hit_rate,
            context: {
              used: session.context_used,
              total: contextLimit,
            },
            burnRate: recentActivity.cost_per_minute * 60,
            recentActivity: {
              tokens: recentActivity.tokens,
              timestamp: new Date(recentActivity.last_message_time),
            },
            budgetHealth,
            providerBudgets,
            budgetAlerts,
          };
        } catch (error) {
          console.error(chalk.red("Error loading session data:"), error);
          return null;
        }
      };

      // Start file watcher (event-driven - replaces polling!)
      sessionManager.startWatcher((changedSessionId) => {
        console.log(
          chalk.dim(`Session ${changedSessionId} changed, refreshing...`),
        );
        // Watcher will trigger display update automatically
      });

      // Cleanup on exit
      const cleanup = () => {
        sessionManager.stopWatcher();
        monitor.stop();
        console.log(chalk.yellow("\nLive monitoring stopped."));
        process.exit(0);
      };

      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);

      await monitor.start(getStatus, {
        refreshInterval,
        showProgress: options.progress !== false,
        showBurnRate: options.burnRate !== false,
      });
    } catch (error) {
      console.error(
        statusIndicator("error", "Failed to start live monitoring"),
      );
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });
