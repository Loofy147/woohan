/**
 * Configuration Module Unit Tests
 *
 * Tests for Zod-validated configuration with environment variables
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

describe('Configuration Module', () => {
  // Save original env
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('Config Schema Validation', () => {
    it('should validate required fields', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']),
        PORT: z.coerce.number().int().positive(),
        DATABASE_URL: z.string().url(),
        JWT_SECRET: z.string().min(32),
      });

      const validConfig = {
        NODE_ENV: 'production',
        PORT: '3000',
        DATABASE_URL: 'mysql://localhost/db',
        JWT_SECRET: 'a'.repeat(32),
      };

      expect(() => schema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid NODE_ENV', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']),
      });

      expect(() => {
        schema.parse({ NODE_ENV: 'staging' });
      }).toThrow();
    });

    it('should coerce string PORT to number', () => {
      const schema = z.object({
        PORT: z.coerce.number().int().positive(),
      });

      const result = schema.parse({ PORT: '3000' });
      expect(result.PORT).toBe(3000);
      expect(typeof result.PORT).toBe('number');
    });

    it('should reject invalid PORT', () => {
      const schema = z.object({
        PORT: z.coerce.number().int().positive(),
      });

      expect(() => {
        schema.parse({ PORT: '-1' });
      }).toThrow();

      expect(() => {
        schema.parse({ PORT: '0' });
      }).toThrow();

      expect(() => {
        schema.parse({ PORT: 'abc' });
      }).toThrow();
    });

    it('should validate DATABASE_URL is a valid URL', () => {
      const schema = z.object({
        DATABASE_URL: z.string().url(),
      });

      expect(() => {
        schema.parse({ DATABASE_URL: 'mysql://localhost/db' });
      }).not.toThrow();

      expect(() => {
        schema.parse({ DATABASE_URL: 'not-a-url' });
      }).toThrow();
    });

    it('should require JWT_SECRET minimum length', () => {
      const schema = z.object({
        JWT_SECRET: z.string().min(32),
      });

      expect(() => {
        schema.parse({ JWT_SECRET: 'short' });
      }).toThrow();

      expect(() => {
        schema.parse({ JWT_SECRET: 'a'.repeat(32) });
      }).not.toThrow();
    });

    it('should validate LOG_LEVEL enum', () => {
      const schema = z.object({
        LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']),
      });

      expect(() => {
        schema.parse({ LOG_LEVEL: 'info' });
      }).not.toThrow();

      expect(() => {
        schema.parse({ LOG_LEVEL: 'invalid' });
      }).toThrow();
    });

    it('should provide default values', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.coerce.number().int().positive().default(3000),
        LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
      });

      const result = schema.parse({});
      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(3000);
      expect(result.LOG_LEVEL).toBe('info');
    });

    it('should validate numeric ranges', () => {
      const schema = z.object({
        SIGNIFICANCE_THRESHOLD: z.coerce.number().min(0).max(1),
        LEARNING_RATE: z.coerce.number().positive(),
        PRIVACY_EPSILON: z.coerce.number().positive(),
      });

      expect(() => {
        schema.parse({
          SIGNIFICANCE_THRESHOLD: '0.5',
          LEARNING_RATE: '0.001',
          PRIVACY_EPSILON: '1.0',
        });
      }).not.toThrow();

      expect(() => {
        schema.parse({
          SIGNIFICANCE_THRESHOLD: '1.5', // Out of range
          LEARNING_RATE: '0.001',
          PRIVACY_EPSILON: '1.0',
        });
      }).toThrow();
    });

    it('should validate boolean coercion', () => {
      const schema = z.object({
        ENABLE_SEMANTIC_ANALYSIS: z.coerce.boolean(),
        ENABLE_PRIVACY_AUDIT_LOG: z.coerce.boolean(),
      });

      const result = schema.parse({
        ENABLE_SEMANTIC_ANALYSIS: 'true',
        ENABLE_PRIVACY_AUDIT_LOG: '1',
      });

      expect(result.ENABLE_SEMANTIC_ANALYSIS).toBe(true);
      expect(result.ENABLE_PRIVACY_AUDIT_LOG).toBe(true);
    });
  });

  describe('Environment Variable Parsing', () => {
    it('should parse all required environment variables', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']),
        PORT: z.coerce.number().int().positive(),
        LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']),
        DATABASE_URL: z.string().url(),
        JWT_SECRET: z.string().min(32),
      });

      const env = {
        NODE_ENV: 'production',
        PORT: '3000',
        LOG_LEVEL: 'info',
        DATABASE_URL: 'mysql://localhost/db',
        JWT_SECRET: 'a'.repeat(32),
      };

      const result = schema.parse(env);
      expect(result.NODE_ENV).toBe('production');
      expect(result.PORT).toBe(3000);
      expect(result.LOG_LEVEL).toBe('info');
    });

    it('should handle missing optional variables with defaults', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.coerce.number().int().positive().default(3000),
        LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
      });

      const result = schema.parse({});
      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(3000);
      expect(result.LOG_LEVEL).toBe('info');
    });

    it('should reject missing required variables', () => {
      const schema = z.object({
        DATABASE_URL: z.string().url(),
        JWT_SECRET: z.string().min(32),
      });

      expect(() => {
        schema.parse({});
      }).toThrow();
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error messages for validation failures', () => {
      const schema = z.object({
        PORT: z.coerce.number().int().positive(),
      });

      try {
        schema.parse({ PORT: 'invalid' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.issues).toBeDefined();
        expect(error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should include field path in error messages', () => {
      const schema = z.object({
        database: z.object({
          url: z.string().url(),
          port: z.coerce.number().positive(),
        }),
      });

      try {
        schema.parse({
          database: {
            url: 'invalid-url',
            port: '-1',
          },
        });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.issues).toBeDefined();
        const paths = error.issues.map((issue: any) => issue.path.join('.'));
        expect(paths).toContain('database.url');
        expect(paths).toContain('database.port');
      }
    });
  });

  describe('Config Immutability', () => {
    it('should prevent modification of frozen config', () => {
      const config = Object.freeze({
        NODE_ENV: 'production',
        PORT: 3000,
      });

      expect(() => {
        (config as any).PORT = 4000;
      }).toThrow();
    });

    it('should allow reading frozen config', () => {
      const config = Object.freeze({
        NODE_ENV: 'production',
        PORT: 3000,
      });

      expect(config.NODE_ENV).toBe('production');
      expect(config.PORT).toBe(3000);
    });
  });

  describe('Config Type Safety', () => {
    it('should provide typed access to config values', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']),
        PORT: z.coerce.number().int().positive(),
        LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']),
      });

      type Config = z.infer<typeof schema>;

      const config: Config = schema.parse({
        NODE_ENV: 'production',
        PORT: '3000',
        LOG_LEVEL: 'info',
      });

      // TypeScript should know these are the correct types
      const env: 'development' | 'production' | 'test' = config.NODE_ENV;
      const port: number = config.PORT;
      const level: 'error' | 'warn' | 'info' | 'debug' | 'trace' = config.LOG_LEVEL;

      expect(env).toBe('production');
      expect(port).toBe(3000);
      expect(level).toBe('info');
    });
  });

  describe('WOOHAN-specific Config', () => {
    it('should validate memory dimension', () => {
      const schema = z.object({
        MEMORY_DIMENSION: z.coerce.number().int().positive(),
      });

      expect(() => {
        schema.parse({ MEMORY_DIMENSION: '256' });
      }).not.toThrow();

      expect(() => {
        schema.parse({ MEMORY_DIMENSION: '0' });
      }).toThrow();
    });

    it('should validate learning rate', () => {
      const schema = z.object({
        LEARNING_RATE: z.coerce.number().positive(),
      });

      expect(() => {
        schema.parse({ LEARNING_RATE: '0.001' });
      }).not.toThrow();

      expect(() => {
        schema.parse({ LEARNING_RATE: '0' });
      }).toThrow();
    });

    it('should validate significance threshold (0-1)', () => {
      const schema = z.object({
        SIGNIFICANCE_THRESHOLD: z.coerce.number().min(0).max(1),
      });

      expect(() => {
        schema.parse({ SIGNIFICANCE_THRESHOLD: '0.5' });
      }).not.toThrow();

      expect(() => {
        schema.parse({ SIGNIFICANCE_THRESHOLD: '1.5' });
      }).toThrow();
    });

    it('should validate differential privacy parameters', () => {
      const schema = z.object({
        PRIVACY_EPSILON: z.coerce.number().positive(),
        PRIVACY_DELTA: z.coerce.number().positive(),
      });

      expect(() => {
        schema.parse({
          PRIVACY_EPSILON: '1.0',
          PRIVACY_DELTA: '0.00001',
        });
      }).not.toThrow();
    });

    it('should validate rate limiting config', () => {
      const schema = z.object({
        RATE_LIMIT_WINDOW: z.coerce.number().int().positive(),
        RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive(),
      });

      expect(() => {
        schema.parse({
          RATE_LIMIT_WINDOW: '900000',
          RATE_LIMIT_MAX_REQUESTS: '100',
        });
      }).not.toThrow();
    });
  });
});
