import { z } from "zod";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const UIConfig = z.object({
  table_style: z.enum(["rich", "simple", "minimal"]).default("rich"),
  colors: z.boolean().default(true),
  progress_bars: z.boolean().default(true),
  live_refresh_interval: z.number().int().min(1).max(60).default(5)
});

const ExportConfig = z.object({
  default_format: z.enum(["csv", "json", "markdown"]).default("csv"),
  include_metadata: z.boolean().default(true),
  include_raw_data: z.boolean().default(false)
});

const PathsConfig = z.object({
  data_dir: z.string().default("~/.local/share/opencode/storage/message"),
  export_dir: z.string().default("./exports"),
  cache_dir: z.string().default("~/.cache/ocsight")
});

const ConfigSchema = z.object({
  ui: UIConfig.default({}),
  export: ExportConfig.default({}),
  paths: PathsConfig.default({})
});

type Config = z.infer<typeof ConfigSchema>;

const expandPath = (path: string): string => 
  path.replace(/^~(?=$|\/|\\)/, homedir());

const findConfigFile = async (): Promise<string | null> => {
  const candidates = [
    "ocsight.config.json",
    join(process.cwd(), "ocsight.config.json"),
    join(homedir(), ".config", "ocsight", "config.json"),
    join(homedir(), ".ocsight", "config.json")
  ];

  for (const candidate of candidates) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
};

export const loadConfig = async (configPath?: string): Promise<Config> => {
  const path = configPath || await findConfigFile();
  
  if (path) {
    try {
      const content = await readFile(path, "utf8");
      const raw = JSON.parse(content);
      return ConfigSchema.parse(raw);
    } catch (error) {
      console.warn(`Warning: Invalid config file at ${path}, using defaults`);
    }
  }
  
  return ConfigSchema.parse({});
};

export type BootstrapContext = {
  config: Config;
  verbose: boolean;
  colors: boolean;
};

export const bootstrap = async (
  configPath?: string, 
  verbose = false, 
  noColor = false
): Promise<BootstrapContext> => {
  const config = await loadConfig(configPath);
  const colors = !noColor && config.ui.colors;
  
  // Expand paths
  config.paths.data_dir = expandPath(config.paths.data_dir);
  config.paths.export_dir = expandPath(config.paths.export_dir);
  config.paths.cache_dir = expandPath(config.paths.cache_dir);
  
  return { config, verbose, colors };
};