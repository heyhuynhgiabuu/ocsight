// Time constants
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = MS_PER_SECOND * 60;
export const MS_PER_HOUR = MS_PER_MINUTE * 60;
export const MS_PER_DAY = MS_PER_HOUR * 24;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;

// Token constants
export const TOKENS_PER_K = 1000;
export const TOKENS_PER_M = 1000000;
export const MIN_SIGNIFICANT_TOKENS = 1000;

// Cost constants
export const CENTS_PER_DOLLAR = 100;
export const DEFAULT_SESSION_LIMIT = 1000;
export const HIGH_COST_THRESHOLD = 100; // $100

// Performance constants
export const DEFAULT_BATCH_SIZE = 100;
export const MAX_CACHE_ENTRIES = 1000;
export const MAX_CACHE_SIZE_MB = 500;
export const PROGRESS_UPDATE_THROTTLE_MS = 100;
export const PROGRESS_UPDATE_INTERVAL = 1000;

// Live monitoring constants
export const LIVE_MONITORING_LIMIT = 50000;
export const ACTIVITY_WINDOW_MINUTES = 5;
export const BURN_RATE_SMOOTHING_MINUTES = 5;
export const MIN_MESSAGES_FOR_RATE = 1;
export const BURN_RATE_HIGH_THRESHOLD = 50000;
export const FALLBACK_CONTEXT_RATIO = 0.01;

// UI constants
export const DEFAULT_BOX_WIDTH = 100;
export const DEFAULT_PROGRESS_BAR_WIDTH = 20;
export const MAX_PERCENTAGE = 100;

// Time periods
export const QUICK_MODE_DAYS = 30;
export const WEEK_DAYS = 7;
export const MONTH_DAYS = 30;
export const YEAR_DAYS = 365;

// Cache duration
export const MODELS_CACHE_HOURS = 4;
export const MODELS_CACHE_DURATION_MS = MODELS_CACHE_HOURS * MS_PER_HOUR;

// Session constants
export const SESSION_START_TIME_HOURS_AGO = 3;

// Token estimates for fallback calculations
export const TOKEN_ESTIMATES = {
  INPUT_RATIO: 0.7,
  OUTPUT_RATIO: 0.2,
  REASONING_RATIO: 0.05,
  CACHE_WRITE_RATIO: 0.03,
  CACHE_READ_RATIO: 0.02,
};

// Refresh intervals
export const DEFAULT_REFRESH_INTERVAL = 5; // seconds
export const MIN_REFRESH_INTERVAL = 1;
export const MAX_REFRESH_INTERVAL = 60;

// Display limits
export const RECENT_SESSIONS_DISPLAY = 5;
export const AVAILABLE_SESSIONS_DISPLAY = 5;
export const DEBUG_SESSION_LIMIT = 50;
export const DEBUG_DAYS_BACK = 1;

// Memory limits
export const DEFAULT_MAX_MEMORY_MB = 100;
export const DEFAULT_STREAMING_BATCH = 50;
