export interface ModelData {
  name: string;
  provider_id: string;
  model_id: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  cost?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context?: number;
    output?: number;
  };
  modalities?: {
    input?: string[];
    output?: string[];
  };
  weights?: "Open" | "Closed";
}

export interface ProviderInfo {
  id: string;
  name: string;
  npm?: string;
  env?: string[];
  doc?: string;
  api?: string;
}

export interface ModelsDatabase {
  models: ModelData[];
  providers: ProviderInfo[];
}

const MODELS_API_URL = "https://models.dev/api.json";
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const CACHE = {
  data: null as ModelsDatabase | null,
  timestamp: 0
};

export const fetchModelsDatabase = async (): Promise<ModelsDatabase> => {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (CACHE.data && (now - CACHE.timestamp) < CACHE_DURATION) {
    return CACHE.data;
  }
  
  try {
    const response = await fetch(MODELS_API_URL, {
      headers: {
        'User-Agent': 'ocsight-cli/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models database: ${response.status}`);
    }
    
    const rawData = await response.json() as Record<string, any>;
    
    // Parse the API response structure
    const models: ModelData[] = [];
    const providers: ProviderInfo[] = [];
    
    for (const [providerId, providerData] of Object.entries(rawData)) {
      // Add provider info
      providers.push({
        id: providerId,
        name: providerData.name || providerId,
        npm: providerData.npm,
        env: providerData.env,
        doc: providerData.doc,
        api: providerData.api
      });
      
      // Add models from this provider
      if (providerData.models) {
        for (const [modelId, modelData] of Object.entries(providerData.models)) {
          models.push({
            ...modelData as any,
            provider_id: providerId,
            model_id: modelId,
            weights: (modelData as any).open_weights ? "Open" : "Closed"
          });
        }
      }
    }
    
    const data = { models, providers };
    
    // Update cache
    CACHE.data = data;
    CACHE.timestamp = now;
    
    return data;
  } catch (error) {
    console.warn("Warning: Failed to fetch models database, using cached or empty data");
    
    // Return cached data if available, otherwise empty database
    return CACHE.data || { models: [], providers: [] };
  }
};

export const findModel = async (modelId: string, providerId?: string): Promise<ModelData | null> => {
  const db = await fetchModelsDatabase();
  
  // First try exact match with provider/model format
  const fullModelId = modelId.includes("/") ? modelId : `${providerId}/${modelId}`;
  
  let model = db.models.find(m => 
    `${m.provider_id}/${m.model_id}` === fullModelId ||
    m.model_id === modelId
  );
  
  // Fallback: search by model name or partial match
  if (!model) {
    model = db.models.find(m => 
      m.name.toLowerCase().includes(modelId.toLowerCase()) ||
      m.model_id.toLowerCase().includes(modelId.toLowerCase())
    );
  }
  
  return model || null;
};

export const searchModels = async (query?: {
  provider?: string;
  hasReasoning?: boolean;
  hasToolCall?: boolean;
  minContext?: number;
  maxCostPerMillion?: number;
}): Promise<ModelData[]> => {
  const db = await fetchModelsDatabase();
  let results = db.models;
  
  if (query?.provider) {
    results = results.filter(m => 
      m.provider_id.toLowerCase().includes(query.provider!.toLowerCase())
    );
  }
  
  if (query?.hasReasoning !== undefined) {
    results = results.filter(m => m.reasoning === query.hasReasoning);
  }
  
  if (query?.hasToolCall !== undefined) {
    results = results.filter(m => m.tool_call === query.hasToolCall);
  }
  
  if (query?.minContext) {
    results = results.filter(m => 
      m.limit?.context && m.limit.context >= query.minContext!
    );
  }
  
  if (query?.maxCostPerMillion) {
    results = results.filter(m => 
      m.cost?.input && m.cost.input <= query.maxCostPerMillion!
    );
  }
  
  // Sort by name for consistent results
  return results.sort((a, b) => a.name.localeCompare(b.name));
};

export const calculateModelCost = (
  model: ModelData,
  tokens: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache_read?: number;
    cache_write?: number;
  }
): number => {
  if (!model.cost) return 0;
  
  let totalCost = 0;
  
  // Input tokens
  if (tokens.input && model.cost.input) {
    totalCost += (tokens.input / 1_000_000) * model.cost.input;
  }
  
  // Output tokens
  if (tokens.output && model.cost.output) {
    totalCost += (tokens.output / 1_000_000) * model.cost.output;
  }
  
  // Reasoning tokens
  if (tokens.reasoning && model.cost.reasoning) {
    totalCost += (tokens.reasoning / 1_000_000) * model.cost.reasoning;
  }
  
  // Cache read tokens
  if (tokens.cache_read && model.cost.cache_read) {
    totalCost += (tokens.cache_read / 1_000_000) * model.cost.cache_read;
  }
  
  // Cache write tokens
  if (tokens.cache_write && model.cost.cache_write) {
    totalCost += (tokens.cache_write / 1_000_000) * model.cost.cache_write;
  }
  
  return totalCost;
};

export const getProviderInfo = async (providerId: string) => {
  const db = await fetchModelsDatabase();
  return db.providers.find(p => p.id === providerId) || null;
};

export const getAllProviders = async () => {
  const db = await fetchModelsDatabase();
  return db.providers;
};