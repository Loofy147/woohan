/**
 * Configuration Management Module
 *
 * Centralizes all application configuration with schema validation.
 * Supports environment-based overrides and validates all required values at startup.
 *
 * Features:
 * - Zod schema validation for type safety
 * - Environment variable support
 * - Default values for optional settings
 * - Startup validation with clear error messages
 * - Configuration freezing to prevent mutations
 *
 * @module config
 */

import { z } from 'zod';
import { logger } from './logger';

/**
 * Configuration schema definition
 * All configuration values must conform to this schema
 */
const configSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Database
  DATABASE_URL: z.string().url().describe('MySQL/TiDB connection string'),

  // Authentication
  JWT_SECRET: z.string().min(32).describe('JWT signing secret (min 32 chars)'),
  OAUTH_SERVER_URL: z.string().url().describe('OAuth server base URL'),

  // API Configuration
  API_TIMEOUT: z.coerce.number().int().positive().default(30000).describe('API request timeout in ms'),
  MAX_RETRIES: z.coerce.number().int().min(0).default(3).describe('Maximum retry attempts'),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(900000).describe('Rate limit window in ms'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100).describe('Max requests per window'),

  // WOOHAN-specific
  MEMORY_DIMENSION: z.coerce.number().int().positive().default(256).describe('Memory state dimension'),
  LEARNING_RATE: z.coerce.number().positive().default(0.001).describe('Learning rate for memory updates'),
  GRADIENT_CLIP_NORM: z.coerce.number().positive().default(1.0).describe('Gradient clipping norm'),
  SIGNIFICANCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5).describe('Event significance threshold'),
  PRIVACY_EPSILON: z.coerce.number().positive().default(1.0).describe('Differential privacy epsilon'),
  PRIVACY_DELTA: z.coerce.number().positive().default(0.00001).describe('Differential privacy delta'),

  // Feature flags
  ENABLE_SEMANTIC_ANALYSIS: z.coerce.boolean().default(true),
  ENABLE_PRIVACY_AUDIT_LOG: z.coerce.boolean().default(true),
  ENABLE_PERFORMANCE_MONITORING: z.coerce.boolean().default(true),

  // Hugging Face
  HF_MODEL_NAME: z.string().default('sentence-transformers/all-MiniLM-L6-v2'),
  HF_CACHE_DIR: z.string().default('./models'),
});

/**
 * Type definition for configuration
 */
export type Config = z.infer<typeof configSchema>;

/**
 * Validate and load configuration from environment variables
 * Throws ConfigError if validation fails
 *
 * @returns Validated configuration object
 * @throws ConfigError if validation fails
 */
function loadConfig(): Config {
  try {
    const config = configSchema.parse(process.env);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      const message = `Configuration validation failed:\n${issues}`;
      logger.error(message);
      throw new Error(message);
    }
    throw error;
  }
}

/**
 * Global configuration instance
 * Frozen to prevent accidental mutations
 */
export const config = Object.freeze(loadConfig());

/**
 * Validate that all required configuration is present
 * Called at application startup
 *
 * @throws Error if configuration is invalid
 */
export function validateConfig(): void {
  try {
    configSchema.parse(config);
    logger.info(
      {
        environment: config.NODE_ENV,
        port: config.PORT,
        logLevel: config.LOG_LEVEL,
      },
      'Configuration validated successfully'
    );
  } catch (error) {
    logger.error('Configuration validation failed');
    throw error;
  }
}

/**
 * Get a configuration value with type safety
 *
 * @param key - Configuration key
 * @returns Configuration value
 *
 * @example
 * const port = getConfig('PORT');
 * const timeout = getConfig('API_TIMEOUT');
 */
export function getConfig<K extends keyof Config>(key: K): Config[K] {
  return config[key];
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return config.NODE_ENV === 'development';
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return config.NODE_ENV === 'production';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return config.NODE_ENV === 'test';
}

export default config;
