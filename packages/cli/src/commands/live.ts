import { Command } from "commander";
import chalk from "chalk";
import { bootstrap } from "../lib/bootstrap.js";
import { LiveMonitor, LiveStatus } from "../lib/live.js";
import { statusIndicator } from "../lib/ui.js";
import { loadAllData } from "../lib/data.js";
import { calculateSessionMetrics } from "../lib/cost.js";
import { getQuotaStatus, loadQuotaConfig } from "../lib/quota-utils.js";

export const liveCommand = new Command("live")
  .description("Monitor OpenCode usage in real-time")
  .option("--config <path>", "Path to config file")
  .option("--refresh <seconds>", "Refresh interval in seconds", "5")
  .option("--session <id>", "Monitor specific session ID (e.g., ses_1234)")
  .option("--no-progress", "Hide progress bars")
  .option("--no-burn-rate", "Hide burn rate calculation")
  .option("--quota <amount>", "Set cost quota amount (e.g., 25.00)", parseFloat)
  .option("--quota-period <period>", "Set quota period: daily or monthly", "daily")
  .action(async (options) => {
    try {
      await bootstrap(options.config, false, false);
      const refreshInterval = parseInt(options.refresh, 10);
      
      if (refreshInterval < 1 || refreshInterval > 60) {
        console.error(statusIndicator("error", "Refresh interval must be between 1 and 60 seconds"));
        process.exit(1);
      }
      
      const monitor = new LiveMonitor();
      
      console.log(chalk.blue("Starting live monitoring..."));
      console.log(chalk.dim(`Refresh interval: ${refreshInterval}s`));
      if (options.session) {
        console.log(chalk.dim(`Monitoring specific session: ${options.session}`));
      } else {
        console.log(chalk.dim("Monitoring most recently updated session"));
      }
      console.log(chalk.dim("Press Ctrl+C to stop\n"));
      
      // Show recent sessions for debugging
      try {
        const DEBUG_SESSION_LIMIT = 50;
        const DEBUG_DAYS_BACK = 1;
        
        const debugData = await loadAllData({
          limit: DEBUG_SESSION_LIMIT,
          cache: true,
          days: DEBUG_DAYS_BACK,
          quiet: true
        });
        
        if (debugData.sessions.length > 0) {
          const RECENT_SESSIONS_DISPLAY = 5;
          
          const recentSessions = debugData.sessions
            .sort((a, b) => (b.time.updated || b.time.created) - (a.time.updated || a.time.created))
            .slice(0, RECENT_SESSIONS_DISPLAY);
          
          if (!options.session) {
            console.log(chalk.cyan("Recent Sessions (use --session <id> to monitor specific one):"));
            recentSessions.forEach((session, index) => {
              const isActive = index === 0 ? "[ACTIVE] " : "        ";
              const lastUpdate = new Date(session.time.updated || session.time.created).toLocaleTimeString();
              const modelName = session.model.model === 'claude-sonnet-4-20250514' ? 'claude-sonnet-4' : session.model.model;
              console.log(`  ${isActive}${session.id.slice(0, 8)}: ${session.model.provider}/${modelName} (${lastUpdate})`);
            });
            console.log("");
          }
        }
      } catch (error) {
        // Ignore debug error
      }
      
      const getStatus = async (): Promise<LiveStatus | null> => {
        try {
          const LIVE_MONITORING_LIMIT = 500;
          const LIVE_MONITORING_DAYS = 30;
          
          // Load recent data efficiently
          const data = await loadAllData({
            limit: LIVE_MONITORING_LIMIT,
            cache: false, // Don't use cache for live monitoring
            days: LIVE_MONITORING_DAYS,
            quiet: true
          });
          
          if (!data.sessions.length) return null;
          
          let activeSession;
          
          // If specific session ID is provided, use that
          if (options.session) {
            const sessionIdToFind = options.session.startsWith('ses_') ? options.session : `ses_${options.session}`;
            activeSession = data.sessions.find(s => s.id === sessionIdToFind || s.id.startsWith(sessionIdToFind));
            
            if (!activeSession) {
              console.error(chalk.red(`Session '${options.session}' not found in recent data.`));
              console.log(chalk.yellow("Available sessions:"));
              const AVAILABLE_SESSIONS_DISPLAY = 5;
              
              data.sessions.slice(0, AVAILABLE_SESSIONS_DISPLAY).forEach(s => {
                console.log(`  ${s.id.slice(0, 8)}: ${s.model.provider}/${s.model.model}`);
              });
              return null;
            }
          } else {
            // Find the truly active session by checking message timestamps
            // This is more accurate than just looking at session metadata
            const { findMostRecentlyActiveSession, getActiveSessionInfo } = await import("../lib/session-utils.js");
            const activeSessionId = await findMostRecentlyActiveSession();
            
            if (activeSessionId) {
              activeSession = data.sessions.find(s => s.id === activeSessionId);
              
              // If the truly active session is not in our dataset, get info directly from files
              if (!activeSession) {
                console.log(chalk.yellow(`Found active session ${activeSessionId.slice(0, 8)} not in dataset, reading directly...`));
                const directSessionInfo = await getActiveSessionInfo(activeSessionId);
                
                if (directSessionInfo) {
                  // Create a session object using real token data from message files
                  activeSession = {
                    id: directSessionInfo.sessionId,
                    title: "Active Session (Direct)",
                    time: {
                      created: Math.floor(directSessionInfo.lastActivity.getTime()),
                      updated: Math.floor(directSessionInfo.lastActivity.getTime())
                    },
                    messages: [], // We'll estimate activity without loading all messages
                    tokens_used: directSessionInfo.totalTokens.total, // Real token data from message files
                    cost_cents: Math.round(directSessionInfo.totalCost * 100), // Real cost data
                    model: {
                      provider: directSessionInfo.provider,
                      model: directSessionInfo.model
                    }
                  } as any; // Type assertion for compatibility
                  
                  console.log(chalk.green(`Using direct session: ${directSessionInfo.provider}/${directSessionInfo.model}`));
                  console.log(chalk.blue(`Real token data: ${directSessionInfo.totalTokens.total.toLocaleString()} tokens, $${directSessionInfo.totalCost.toFixed(4)}`));
                }
              }
            }
            
            // Fallback to session metadata if file-based detection fails
            if (!activeSession) {
              const sortedSessions = data.sessions.sort(
                (a, b) => (b.time.updated || b.time.created) - (a.time.updated || a.time.created)
              );
              activeSession = sortedSessions[0];
            }
          }
          
          if (!activeSession) return null;
          
          // ALWAYS use direct session reading for accurate context calculation
          const { getActiveSessionInfo } = await import("../lib/session-utils.js");
          const realSessionInfo = await getActiveSessionInfo(activeSession.id);
          
          const ACTIVITY_WINDOW_MINUTES = 5;
          const BURN_RATE_SMOOTHING_MINUTES = 5;
          const MIN_MESSAGES_FOR_RATE = 1;
          const MS_TO_MINUTES = 1000 * 60;
          
          // Calculate realistic activity rate
          let burnRate = 0;
          if (realSessionInfo && realSessionInfo.messageCount > MIN_MESSAGES_FOR_RATE) {
            // Check how long ago the last activity was
            const minutesAgo = (Date.now() - realSessionInfo.lastActivity.getTime()) / MS_TO_MINUTES;
            
            // Only show activity rate if there was recent activity
            if (minutesAgo < ACTIVITY_WINDOW_MINUTES) {
              // Estimate tokens per minute based on recent activity
              const avgTokensPerMessage = realSessionInfo.totalTokens.total / realSessionInfo.messageCount;
              burnRate = Math.floor(avgTokensPerMessage / BURN_RATE_SMOOTHING_MINUTES);
            }
          }
          
          const FALLBACK_CONTEXT_RATIO = 0.01;
          
          let sessionTokenData;
          let currentContextTokens = Math.floor(activeSession.tokens_used * FALLBACK_CONTEXT_RATIO);
          
          if (realSessionInfo) {
            sessionTokenData = {
              input: realSessionInfo.totalTokens.input,
              output: realSessionInfo.totalTokens.output,
              reasoning: realSessionInfo.totalTokens.reasoning,
              cache: {
                write: realSessionInfo.totalTokens.cache_write,
                read: realSessionInfo.totalTokens.cache_read
              }
            };
            currentContextTokens = realSessionInfo.currentContextTokens;
            
            // Context calculation now accurate!
            
            // Override session data with accurate totals
            activeSession.tokens_used = realSessionInfo.totalTokens.total;
            activeSession.cost_cents = Math.round(realSessionInfo.totalCost * 100);
          }
          
          const TOKEN_ESTIMATES = {
            INPUT_RATIO: 0.7,
            OUTPUT_RATIO: 0.2,
            REASONING_RATIO: 0.05,
            CACHE_WRITE_RATIO: 0.03,
            CACHE_READ_RATIO: 0.02
          };
          
          // Use real token data if available, otherwise estimate
          const mockSessionData = {
            tokens: sessionTokenData || {
              input: Math.floor(activeSession.tokens_used * TOKEN_ESTIMATES.INPUT_RATIO),
              output: Math.floor(activeSession.tokens_used * TOKEN_ESTIMATES.OUTPUT_RATIO),
              reasoning: Math.floor(activeSession.tokens_used * TOKEN_ESTIMATES.REASONING_RATIO),
              cache: {
                write: Math.floor(activeSession.tokens_used * TOKEN_ESTIMATES.CACHE_WRITE_RATIO),
                read: Math.floor(activeSession.tokens_used * TOKEN_ESTIMATES.CACHE_READ_RATIO)
              }
            },
            modelID: `${activeSession.model.provider}/${activeSession.model.model}`,
            cost_cents: activeSession.cost_cents
          };
          
          const metrics = await calculateSessionMetrics(mockSessionData);
          
          const DEFAULT_CONTEXT_LIMIT = 200000;
          
          // Get model info for context window
          const { findModel } = await import("../lib/models-db.js");
          const modelInfo = await findModel(mockSessionData.modelID);
          const contextLimit = modelInfo?.limit?.context || DEFAULT_CONTEXT_LIMIT;
          
          return {
            sessionId: activeSession.id.slice(0, 8),
            interactions: activeSession.messages.length,
            totalTokens: activeSession.tokens_used,
            estimatedCost: metrics.cost.total,
            currentModel: metrics.model_id,
            tokenBreakdown: metrics.tokens,
            costBreakdown: metrics.cost,
            cacheHitRate: metrics.cache_hit_rate,
            recentActivity: realSessionInfo ? {
              tokens: Math.floor(realSessionInfo.totalTokens.total / realSessionInfo.messageCount), // Avg per message
              timestamp: realSessionInfo.lastActivity
            } : undefined,
            burnRate,
            // Time-based quota with proper period resets
            quota: await (async () => {
              const quotaConfig = loadQuotaConfig({
                amount: options.quota,
                period: options.quotaPeriod === 'monthly' ? 'monthly' : 'daily'
              });
              const quotaStatus = await getQuotaStatus(quotaConfig, data.sessions);
              return {
                amount: quotaStatus.amount,
                used: quotaStatus.used,
                periodType: quotaStatus.periodType
              };
            })(),
            // Use actual model context window - show current context usage, not total session tokens
            context: {
              used: currentContextTokens, // Use calculated current context tokens
              total: contextLimit
            }
          };
          
        } catch (error) {
          console.error(chalk.red("Error loading session data:"), error);
          return null;
        }
      };
      
      await monitor.start(getStatus, {
        refreshInterval,
        showProgress: options.progress !== false,
        showBurnRate: options.burnRate !== false
      });
      
    } catch (error) {
      console.error(statusIndicator("error", "Failed to start live monitoring"));
      console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });