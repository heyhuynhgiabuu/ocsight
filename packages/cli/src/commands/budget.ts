import { Command } from "commander";
import { writeFile } from "fs/promises";
import { join } from "path";
import chalk from "chalk";
import { bootstrap } from "../lib/bootstrap.js";
import { statusIndicator } from "../lib/ui.js";
import { fetchModelsDatabase } from "../lib/models-db.js";
import {
  providerSelectPrompt,
  budgetInputPrompt,
  confirmPrompt,
} from "../lib/budget-prompts.js";
import { BudgetTracker } from "../lib/budget-tracker.js";
import { findOpenCodeDataDirectory } from "../lib/data.js";
import { formatCost } from "../lib/cost.js";
import { SessionManager } from "../lib/session-manager.js";

interface BudgetConfig {
  global_monthly_limit?: number;
  alert_thresholds?: {
    warning: number;
    critical: number;
  };
  providers: {
    [providerId: string]: {
      name: string;
      monthly_limit: number;
      enabled: boolean;
    };
  };
}

interface OCSightConfig {
  ui?: any;
  export?: any;
  paths?: any;
  budget?: BudgetConfig;
}

export const budgetCommand = new Command("budget").description(
  "Manage budget limits and cost tracking",
);

budgetCommand
  .command("add")
  .description("Add budget limit for a provider")
  .option("--config <path>", "Path to config file")
  .action(async (options) => {
    try {
      console.log(chalk.bold.cyan("\n💰 Configure Budget Limits\n"));

      const database = await fetchModelsDatabase();

      if (database.providers.length === 0) {
        console.log(statusIndicator("error", "No providers found"));
        process.exit(1);
      }

      const selectedProvider = await providerSelectPrompt(database.providers);

      if (!selectedProvider) {
        console.log(chalk.yellow("\nCancelled"));
        process.exit(0);
      }

      const monthlyLimit = await budgetInputPrompt();

      if (monthlyLimit === null) {
        console.log(chalk.yellow("\nCancelled"));
        process.exit(0);
      }

      const provider = database.providers.find(
        (p) => p.id === selectedProvider,
      );
      console.log(
        chalk.white("  Provider: ") +
          chalk.cyan(provider?.name || selectedProvider),
      );
      console.log(
        chalk.white("  Monthly limit: ") +
          chalk.green(`$${monthlyLimit.toFixed(2)}`),
      );
      console.log("");

      const confirmed = await confirmPrompt("Save this configuration?");

      if (!confirmed) {
        console.log(chalk.yellow("\nCancelled"));
        process.exit(0);
      }

      const ctx = await bootstrap(options.config);
      const configPath =
        options.config || join(process.cwd(), "ocsight.config.json");

      let fullConfig: OCSightConfig = ctx.config;

      if (!fullConfig.budget) {
        fullConfig.budget = {
          providers: {},
        };
      }

      fullConfig.budget.providers[selectedProvider] = {
        name: provider?.name || selectedProvider,
        monthly_limit: monthlyLimit,
        enabled: true,
      };

      await writeFile(configPath, JSON.stringify(fullConfig, null, 2), "utf8");

      console.log(
        statusIndicator(
          "success",
          `Budget limit saved: ${provider?.name} → $${monthlyLimit}/month`,
        ),
      );
      console.log(
        chalk.dim(
          `\nRun ${chalk.cyan("ocsight budget show")} to view all limits`,
        ),
      );
    } catch (error) {
      console.error(statusIndicator("error", "Failed to configure budget"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

budgetCommand
  .command("set")
  .description("Set global monthly budget limit")
  .option("--monthly <amount>", "Monthly budget limit in USD")
  .option("--warning <percent>", "Warning threshold (default: 70%)")
  .option("--critical <percent>", "Critical threshold (default: 90%)")
  .option("--config <path>", "Path to config file")
  .action(async (options) => {
    try {
      if (!options.monthly) {
        console.error(statusIndicator("error", "Missing --monthly option"));
        console.log(chalk.dim("\nUsage: ocsight budget set --monthly 200"));
        process.exit(1);
      }

      const monthlyLimit = parseFloat(options.monthly);
      const warningThreshold = options.warning
        ? parseFloat(options.warning)
        : 70;
      const criticalThreshold = options.critical
        ? parseFloat(options.critical)
        : 90;

      if (isNaN(monthlyLimit) || monthlyLimit <= 0) {
        console.error(statusIndicator("error", "Invalid monthly limit"));
        process.exit(1);
      }

      const ctx = await bootstrap(options.config);
      const configPath =
        options.config || join(process.cwd(), "ocsight.config.json");

      let fullConfig: OCSightConfig = ctx.config;

      if (!fullConfig.budget) {
        fullConfig.budget = {
          providers: {},
        };
      }

      fullConfig.budget.global_monthly_limit = monthlyLimit;
      fullConfig.budget.alert_thresholds = {
        warning: warningThreshold,
        critical: criticalThreshold,
      };

      await writeFile(configPath, JSON.stringify(fullConfig, null, 2), "utf8");

      console.log(
        statusIndicator(
          "success",
          `Global budget limit set to $${monthlyLimit}/month`,
        ),
      );
      console.log(
        chalk.dim(
          `  Warning at ${warningThreshold}% ($${((monthlyLimit * warningThreshold) / 100).toFixed(2)})`,
        ),
      );
      console.log(
        chalk.dim(
          `  Critical at ${criticalThreshold}% ($${((monthlyLimit * criticalThreshold) / 100).toFixed(2)})`,
        ),
      );
    } catch (error) {
      console.error(statusIndicator("error", "Failed to set budget"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

budgetCommand
  .command("show")
  .description("Show configured budget limits")
  .option("--config <path>", "Path to config file")
  .action(async (options) => {
    try {
      const ctx = await bootstrap(options.config);
      const config = ctx.config;

      console.log(chalk.bold.cyan("\n💰 Budget Configuration\n"));

      if (!config.budget) {
        console.log(chalk.yellow("No budget limits configured"));
        console.log(chalk.dim("\nRun:"));
        console.log(chalk.cyan("  ocsight budget set --monthly 200"));
        console.log(chalk.dim("or:"));
        console.log(chalk.cyan("  ocsight budget add"));
        return;
      }

      if (config.budget.global_monthly_limit) {
        console.log(
          chalk.white("Global Monthly Limit: ") +
            chalk.green(`$${config.budget.global_monthly_limit}`),
        );

        if (config.budget.alert_thresholds) {
          const warning = config.budget.alert_thresholds.warning;
          const critical = config.budget.alert_thresholds.critical;
          console.log(
            chalk.dim(
              `  🟡 Warning at ${warning}% ($${((config.budget.global_monthly_limit * warning) / 100).toFixed(2)})`,
            ),
          );
          console.log(
            chalk.dim(
              `  🔴 Critical at ${critical}% ($${((config.budget.global_monthly_limit * critical) / 100).toFixed(2)})`,
            ),
          );
        }
        console.log("");
      }

      if (
        config.budget.providers &&
        Object.keys(config.budget.providers).length > 0
      ) {
        console.log(chalk.white("Provider Limits:\n"));

        for (const [, providerConfig] of Object.entries(
          config.budget.providers,
        )) {
          const status = providerConfig.enabled
            ? chalk.green("●")
            : chalk.dim("○");
          console.log(`  ${status} ${chalk.white(providerConfig.name)}`);
          console.log(
            chalk.dim(`    Monthly: $${providerConfig.monthly_limit}`),
          );
        }
      } else {
        console.log(chalk.dim("No provider-specific limits set"));
        console.log(chalk.dim("\nRun: ") + chalk.cyan("ocsight budget add"));
      }
    } catch (error) {
      console.error(
        statusIndicator("error", "Failed to show budget configuration"),
      );
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

budgetCommand
  .command("remove")
  .description("Remove budget limit for a provider")
  .argument("<provider>", "Provider ID to remove")
  .option("--config <path>", "Path to config file")
  .action(async (providerId: string, options) => {
    try {
      const ctx = await bootstrap(options.config);
      const configPath =
        options.config || join(process.cwd(), "ocsight.config.json");

      let fullConfig: OCSightConfig = ctx.config;

      if (!fullConfig.budget?.providers?.[providerId]) {
        console.log(
          statusIndicator(
            "error",
            `No budget configured for provider: ${providerId}`,
          ),
        );
        process.exit(1);
      }

      const providerName = fullConfig.budget.providers[providerId].name;

      const confirmed = await confirmPrompt(
        `Remove budget limit for ${providerName}?`,
      );

      if (!confirmed) {
        console.log(chalk.yellow("\nCancelled"));
        process.exit(0);
      }

      delete fullConfig.budget.providers[providerId];

      await writeFile(configPath, JSON.stringify(fullConfig, null, 2), "utf8");

      console.log(
        statusIndicator("success", `Removed budget limit for ${providerName}`),
      );
    } catch (error) {
      console.error(statusIndicator("error", "Failed to remove budget"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

budgetCommand
  .command("status")
  .description("Show current month budget status")
  .option("--config <path>", "Path to config file")
  .option("--months <count>", "Number of months to show", "1")
  .action(async (options) => {
    try {
      const ctx = await bootstrap(options.config);
      const dataDir = await findOpenCodeDataDirectory();
      const sessionManager = new SessionManager();
      await sessionManager.init(dataDir, { quiet: true });
      const tracker = new BudgetTracker(sessionManager, ctx.config.budget);

      const months = parseInt(options.months, 10) || 1;

      console.log(chalk.bold.cyan("\n💰 Spending History\n"));

      const history = await tracker.getHistoricalSpend(months);

      for (const spend of history) {
        const date = new Date(spend.year, spend.month);
        const monthName = date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });

        console.log(chalk.white(`${monthName}:`));
        console.log(`  Total: ${formatCost(spend.total)}`);

        if (Object.keys(spend.by_provider).length > 0) {
          for (const [providerId, cost] of Object.entries(spend.by_provider)) {
            const providerConfig = ctx.config.budget?.providers?.[providerId];
            const name = providerConfig?.name || providerId;
            console.log(`    ${name}: ${formatCost(cost)}`);
          }
        }
        console.log("");
      }
    } catch (error) {
      console.error(statusIndicator("error", "Failed to get spending history"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

budgetCommand
  .command("forecast")
  .description("Project end-of-month costs")
  .option("--config <path>", "Path to config file")
  .action(async (options) => {
    try {
      const ctx = await bootstrap(options.config);
      const dataDir = await findOpenCodeDataDirectory();
      const sessionManager = new SessionManager();
      await sessionManager.init(dataDir, { quiet: true });
      const tracker = new BudgetTracker(sessionManager, ctx.config.budget);

      const now = new Date();
      const monthName = now.toLocaleString("default", { month: "long" });
      const year = now.getFullYear();

      console.log(
        chalk.bold.cyan(`\n💰 Cost Forecast - ${monthName} ${year}\n`),
      );

      const monthlySpend = await tracker.getMonthlySpend();
      const currentDay = now.getDate();
      const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - currentDay;

      // Smart projection: for early month, use weighted average to reduce volatility
      const activeDays = await tracker.getActiveDaysInMonth();

      // Show efficiency metrics
      console.log(
        chalk.dim(`📊 Analyzed ${activeDays} active day(s) in October`),
      );

      let dailyAverage: number;
      if (currentDay <= 3) {
        // Early month: use conservative estimate to account for spending variability
        // Assume current spending represents 70% of typical daily spending
        const observedDailyAverage =
          activeDays > 0 ? monthlySpend.total / activeDays : 0;
        dailyAverage = observedDailyAverage * 0.7; // Conservative 30% reduction
      } else {
        // Later in month: use actual observed average
        dailyAverage = activeDays > 0 ? monthlySpend.total / activeDays : 0;
      }

      const projectedTotal = dailyAverage * daysInMonth;

      console.log(
        chalk.white("Current Spending: ") +
          chalk.cyan(formatCost(monthlySpend.total)),
      );
      console.log(
        chalk.white("Days Elapsed: ") +
          chalk.cyan(`${currentDay} / ${daysInMonth}`),
      );
      console.log(
        chalk.white("Daily Average: ") +
          (currentDay > 0
            ? chalk.cyan(formatCost(dailyAverage))
            : chalk.yellow("Insufficient data")),
      );
      console.log(
        chalk.white("Days Remaining: ") + chalk.cyan(daysRemaining.toString()),
      );

      // Show warning for early month projections
      if (currentDay <= 3) {
        console.log("");
        console.log(
          chalk.yellow(
            "⚠️  Early month projection - using conservative estimate",
          ),
        );
        console.log(
          chalk.dim(
            `   Based on ${activeDays} active day(s) with 30% reduction for variability`,
          ),
        );
      }

      console.log("");
      console.log(
        chalk.white("Projected Total: ") +
          (currentDay > 0
            ? chalk.yellow.bold(formatCost(projectedTotal))
            : chalk.yellow("Insufficient data")),
      );

      const budgetHealth = await tracker.getBudgetHealth();
      if (budgetHealth) {
        const projectedPercentage = (projectedTotal / budgetHealth.limit) * 100;
        const statusIcon =
          projectedPercentage >= 100
            ? "🔴"
            : projectedPercentage >= 90
              ? "🔴"
              : projectedPercentage >= 70
                ? "🟡"
                : "🟢";

        console.log(
          chalk.white("Projected Usage: ") +
            `${statusIcon} ${projectedPercentage.toFixed(1)}%`,
        );

        if (projectedTotal > budgetHealth.limit) {
          const overage = projectedTotal - budgetHealth.limit;
          console.log("");
          console.log(
            chalk.red(
              `⚠️  Warning: Projected to exceed budget by ${formatCost(overage)}`,
            ),
          );
        }
      }
    } catch (error) {
      console.error(statusIndicator("error", "Failed to forecast costs"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });
