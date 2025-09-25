import { Command } from "commander";
import chalk from "chalk";
import { renderTable, section } from "../lib/table.js";
import { statusIndicator } from "../lib/ui.js";
import { formatCost, formatTokens } from "../lib/cost.js";
import { 
  findModel, 
  searchModels, 
  getAllProviders,
  calculateModelCost 
} from "../lib/models-db.js";

export const modelsCommand = new Command("models")
  .description("Browse and analyze AI models database");

modelsCommand
  .command("list")
  .description("List available AI models")
  .option("--provider <provider>", "Filter by provider")
  .option("--reasoning", "Show only reasoning-capable models")
  .option("--tools", "Show only tool-calling models")
  .option("--min-context <tokens>", "Minimum context window", parseInt)
  .option("--max-cost <cost>", "Maximum cost per million input tokens", parseFloat)
  .option("--limit <n>", "Limit results", parseInt, 20)
  .action(async (options) => {
    try {
      console.log(chalk.blue("🔍 Fetching models database..."));
      
      const models = await searchModels({
        provider: options.provider,
        hasReasoning: options.reasoning,
        hasToolCall: options.tools,
        minContext: options.minContext,
        maxCostPerMillion: options.maxCost
      });
      
      if (!models.length) {
        console.log(statusIndicator("warning", "No models found matching criteria"));
        return;
      }
      
      const displayModels = models.slice(0, options.limit);
      
      const rows = displayModels.map(model => [
        `${model.provider_id}/${model.model_id}`,
        model.name,
        model.cost?.input ? formatCost(model.cost.input) : "Free",
        model.limit?.context ? formatTokens(model.limit.context) : "Unknown",
        [
          model.reasoning ? "💭" : "",
          model.tool_call ? "🔧" : "",
          model.attachment ? "📎" : ""
        ].filter(Boolean).join(" ") || "📝"
      ]);
      
      const totals = [
        "TOTAL",
        `${displayModels.length} models`,
        "",
        "",
        ""
      ];
      
      const table = renderTable({
        head: ["Model ID", "Name", "Input Cost/1M", "Context", "Capabilities"],
        rows,
        totals,
        summary: [
          ["Total results", models.length],
          ["Showing", displayModels.length]
        ]
      });
      
      console.log(section(`🤖 AI Models (${models.length} found):`, table));
      
      if (models.length > options.limit) {
        console.log(chalk.dim(`\nShowing ${options.limit} of ${models.length} models. Use --limit to see more.`));
      }
      
    } catch (error) {
      console.error(statusIndicator("error", "Failed to fetch models"));
      console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });

modelsCommand
  .command("show <model-id>")
  .description("Show detailed information about a specific model")
  .option("--calculate <tokens>", "Calculate cost for token usage (format: input,output,reasoning)")
  .action(async (modelId: string, options) => {
    try {
      console.log(chalk.blue(`🔍 Looking up model: ${modelId}`));
      
      const model = await findModel(modelId);
      
      if (!model) {
        console.log(statusIndicator("error", `Model '${modelId}' not found`));
        console.log(chalk.dim("\nTry using 'ocsight models list' to see available models"));
        process.exit(1);
      }
      
      // Basic info
      const basicInfo = [
        ["Model ID", `${model.provider_id}/${model.model_id}`],
        ["Display Name", model.name],
        ["Provider", model.provider_id],
        ["Release Date", model.release_date || "Unknown"],
        ["Last Updated", model.last_updated || "Unknown"],
        ["Knowledge Cutoff", model.knowledge || "Unknown"],
        ["Weights", model.weights || "Unknown"]
      ];
      
      console.log(section("📋 Model Information:", renderTable({
        head: ["Property", "Value"],
        rows: basicInfo
      })));
      
      // Capabilities
      const capabilities = [
        ["Tool Calling", model.tool_call ? "✅ Yes" : "❌ No"],
        ["Reasoning", model.reasoning ? "✅ Yes" : "❌ No"],
        ["File Attachments", model.attachment ? "✅ Yes" : "❌ No"],
        ["Temperature Control", model.temperature ? "✅ Yes" : "❌ No"]
      ];
      
      console.log(section("🔧 Capabilities:", renderTable({
        head: ["Feature", "Supported"],
        rows: capabilities
      })));
      
      // Limits
      if (model.limit) {
        const limits = [
          ["Context Window", model.limit.context ? formatTokens(model.limit.context) : "Unknown"],
          ["Max Output", model.limit.output ? formatTokens(model.limit.output) : "Unknown"]
        ];
        
        console.log(section("📏 Limits:", renderTable({
          head: ["Type", "Tokens"],
          rows: limits
        })));
      }
      
      // Pricing
      if (model.cost) {
        const pricing = [
          ["Input", model.cost.input ? `${formatCost(model.cost.input)}/1M` : "Free"],
          ["Output", model.cost.output ? `${formatCost(model.cost.output)}/1M` : "Free"],
          ...(model.cost.reasoning ? [["Reasoning", `${formatCost(model.cost.reasoning)}/1M`]] : []),
          ...(model.cost.cache_read ? [["Cache Read", `${formatCost(model.cost.cache_read)}/1M`]] : []),
          ...(model.cost.cache_write ? [["Cache Write", `${formatCost(model.cost.cache_write)}/1M`]] : [])
        ];
        
        console.log(section("💰 Pricing:", renderTable({
          head: ["Token Type", "Cost"],
          rows: pricing
        })));
      }
      
      // Modalities
      if (model.modalities) {
        const modalities = [
          ["Input", model.modalities.input?.join(", ") || "text"],
          ["Output", model.modalities.output?.join(", ") || "text"]
        ];
        
        console.log(section("🎛️ Supported Modalities:", renderTable({
          head: ["Type", "Formats"],
          rows: modalities
        })));
      }
      
      // Cost calculation
      if (options.calculate) {
        const tokenParts = options.calculate.split(",").map((s: string) => parseInt(s.trim()));
        if (tokenParts.length >= 2 && !tokenParts.some(isNaN)) {
          const [input = 0, output = 0, reasoning = 0] = tokenParts;
          
          const cost = calculateModelCost(model, {
            input,
            output,
            reasoning
          });
          
          const calculation = [
            ["Input Tokens", `${formatTokens(input)} × ${formatCost(model.cost?.input || 0)}/1M = ${formatCost((input / 1_000_000) * (model.cost?.input || 0))}`],
            ["Output Tokens", `${formatTokens(output)} × ${formatCost(model.cost?.output || 0)}/1M = ${formatCost((output / 1_000_000) * (model.cost?.output || 0))}`],
            ...(reasoning > 0 ? [["Reasoning Tokens", `${formatTokens(reasoning)} × ${formatCost(model.cost?.reasoning || 0)}/1M = ${formatCost((reasoning / 1_000_000) * (model.cost?.reasoning || 0))}`]] : [])
          ];
          
          console.log(section(`💵 Cost Calculation:`, renderTable({
            head: ["Type", "Calculation"],
            rows: calculation,
            totals: ["TOTAL COST", formatCost(cost)]
          })));
        }
      }
      
    } catch (error) {
      console.error(statusIndicator("error", "Failed to fetch model information"));
      console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });

modelsCommand
  .command("providers")
  .description("List all model providers")
  .action(async () => {
    try {
      console.log(chalk.blue("🔍 Fetching providers..."));
      
      const providers = await getAllProviders();
      
      if (!providers.length) {
        console.log(statusIndicator("warning", "No providers found"));
        return;
      }
      
      const rows = providers.map(provider => [
        provider.id,
        provider.name,
        provider.npm || "N/A",
        provider.doc ? "📖" : ""
      ]);
      
      const table = renderTable({
        head: ["Provider ID", "Name", "SDK Package", "Docs"],
        rows,
        summary: [
          ["Total providers", providers.length]
        ]
      });
      
      console.log(section("🏢 Model Providers:", table));
      
    } catch (error) {
      console.error(statusIndicator("error", "Failed to fetch providers"));
      console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });

modelsCommand
  .command("compare <model1> <model2>")
  .description("Compare two models side by side")
  .action(async (model1Id: string, model2Id: string) => {
    try {
      console.log(chalk.blue(`🔍 Comparing ${model1Id} vs ${model2Id}`));
      
      const [model1, model2] = await Promise.all([
        findModel(model1Id),
        findModel(model2Id)
      ]);
      
      if (!model1) {
        console.log(statusIndicator("error", `Model '${model1Id}' not found`));
        process.exit(1);
      }
      
      if (!model2) {
        console.log(statusIndicator("error", `Model '${model2Id}' not found`));
        process.exit(1);
      }
      
      const comparison = [
        ["Model ID", `${model1.provider_id}/${model1.model_id}`, `${model2.provider_id}/${model2.model_id}`],
        ["Name", model1.name, model2.name],
        ["Provider", model1.provider_id, model2.provider_id],
        ["Input Cost/1M", model1.cost?.input ? formatCost(model1.cost.input) : "Free", model2.cost?.input ? formatCost(model2.cost.input) : "Free"],
        ["Output Cost/1M", model1.cost?.output ? formatCost(model1.cost.output) : "Free", model2.cost?.output ? formatCost(model2.cost.output) : "Free"],
        ["Context Window", model1.limit?.context ? formatTokens(model1.limit.context) : "Unknown", model2.limit?.context ? formatTokens(model2.limit.context) : "Unknown"],
        ["Max Output", model1.limit?.output ? formatTokens(model1.limit.output) : "Unknown", model2.limit?.output ? formatTokens(model2.limit.output) : "Unknown"],
        ["Tool Calling", model1.tool_call ? "✅" : "❌", model2.tool_call ? "✅" : "❌"],
        ["Reasoning", model1.reasoning ? "✅" : "❌", model2.reasoning ? "✅" : "❌"],
        ["Attachments", model1.attachment ? "✅" : "❌", model2.attachment ? "✅" : "❌"],
        ["Release Date", model1.release_date || "Unknown", model2.release_date || "Unknown"]
      ];
      
      const table = renderTable({
        head: ["Property", model1.name, model2.name],
        rows: comparison
      });
      
      console.log(section("⚖️ Model Comparison:", table));
      
      // Cost comparison for common usage
      const commonTokens = [1000, 10000, 100000]; // 1K, 10K, 100K tokens
      
      console.log(chalk.cyan.bold("\n💰 Cost Comparison (Input + Output):"));
      
      commonTokens.forEach(tokens => {
        const cost1 = calculateModelCost(model1, { input: tokens, output: tokens });
        const cost2 = calculateModelCost(model2, { input: tokens, output: tokens });
        const savings = Math.abs(cost1 - cost2);
        const cheaper = cost1 < cost2 ? model1.name : model2.name;
        
        console.log(`${formatTokens(tokens)} tokens: ${formatCost(cost1)} vs ${formatCost(cost2)} (${cheaper} saves ${formatCost(savings)})`);
      });
      
    } catch (error) {
      console.error(statusIndicator("error", "Failed to compare models"));
      console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });