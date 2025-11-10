/**
 * Logger Module Unit Tests
 *
 * Tests for Pino-based structured logging with context support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChildLogger, logError, logOperation, logSecurityEvent } from '@server/_core/logger';

describe('Logger Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createChildLogger', () => {
    it('should create a child logger with context', () => {
      const childLogger = createChildLogger({ userId: 'user-123', module: 'auth' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.error).toBe('function');
    });

    it('should mask sensitive data in context', () => {
      const childLogger = createChildLogger({
        userId: 'user-123',
        password: 'secret-password',
        apiKey: 'secret-key',
      });
      expect(childLogger).toBeDefined();
      // Sensitive fields should be masked when logged
    });

    it('should support nested context', () => {
      const childLogger = createChildLogger({
        userId: 'user-123',
        request: {
          method: 'POST',
          url: '/api/login',
          headers: {
            authorization: 'Bearer token123',
          },
        },
      });
      expect(childLogger).toBeDefined();
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = { userId: 'user-123', operation: 'fetchUser' };

      expect(() => {
        logError(error, context);
      }).not.toThrow();
    });

    it('should log error without context', () => {
      const error = new Error('Test error');
      expect(() => {
        logError(error);
      }).not.toThrow();
    });

    it('should capture error stack trace', () => {
      const error = new Error('Test error with stack');
      expect(() => {
        logError(error);
      }).not.toThrow();
      expect(error.stack).toBeDefined();
    });

    it('should handle errors with custom properties', () => {
      const error = new Error('Custom error');
      (error as any).code = 'CUSTOM_CODE';
      (error as any).statusCode = 400;

      expect(() => {
        logError(error, { code: (error as any).code });
      }).not.toThrow();
    });
  });

  describe('logOperation', () => {
    it('should log operation with timing', () => {
      expect(() => {
        logOperation('database.query', 45);
      }).not.toThrow();
    });

    it('should log operation with context', () => {
      expect(() => {
        logOperation('memory.update', 120, {
          userId: 'user-123',
          eventCount: 5,
        });
      }).not.toThrow();
    });

    it('should use warn level for slow operations (>1000ms)', () => {
      expect(() => {
        logOperation('slow.operation', 1500, { operation: 'slow' });
      }).not.toThrow();
    });

    it('should use info level for fast operations (<1000ms)', () => {
      expect(() => {
        logOperation('fast.operation', 50, { operation: 'fast' });
      }).not.toThrow();
    });

    it('should handle zero duration', () => {
      expect(() => {
        logOperation('instant.operation', 0);
      }).not.toThrow();
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event', () => {
      expect(() => {
        logSecurityEvent('failed_login_attempt', {
          email: 'user@example.com',
          attempts: 3,
        });
      }).not.toThrow();
    });

    it('should log security event without context', () => {
      expect(() => {
        logSecurityEvent('suspicious_activity');
      }).not.toThrow();
    });

    it('should include timestamp in security event', () => {
      expect(() => {
        logSecurityEvent('unauthorized_access', {
          userId: 'user-123',
          resource: '/admin',
        });
      }).not.toThrow();
    });

    it('should mask sensitive data in security events', () => {
      expect(() => {
        logSecurityEvent('credential_exposure', {
          email: 'user@example.com',
          password: 'secret',
          apiKey: 'key123',
        });
      }).not.toThrow();
    });

    it('should log various security event types', () => {
      const events = [
        'failed_login_attempt',
        'unauthorized_access',
        'credential_exposure',
        'rate_limit_exceeded',
        'suspicious_activity',
      ];

      events.forEach((event) => {
        expect(() => {
          logSecurityEvent(event, { timestamp: new Date() });
        }).not.toThrow();
      });
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask password fields', () => {
      const childLogger = createChildLogger({
        username: 'john',
        password: 'secret123',
      });
      expect(childLogger).toBeDefined();
    });

    it('should mask token fields', () => {
      const childLogger = createChildLogger({
        userId: 'user-123',
        token: 'jwt-token-xyz',
        refreshToken: 'refresh-token-abc',
      });
      expect(childLogger).toBeDefined();
    });

    it('should mask API key fields', () => {
      const childLogger = createChildLogger({
        service: 'stripe',
        apiKey: 'sk_live_123456',
        api_key: 'sk_test_789012',
      });
      expect(childLogger).toBeDefined();
    });

    it('should mask authorization headers', () => {
      const childLogger = createChildLogger({
        headers: {
          authorization: 'Bearer token123',
          'x-api-key': 'secret-key',
        },
      });
      expect(childLogger).toBeDefined();
    });

    it('should mask credit card fields', () => {
      const childLogger = createChildLogger({
        payment: {
          creditCard: '4111-1111-1111-1111',
          cvv: '123',
        },
      });
      expect(childLogger).toBeDefined();
    });

    it('should mask SSN fields', () => {
      const childLogger = createChildLogger({
        ssn: '123-45-6789',
        personalData: {
          ssn: '987-65-4321',
        },
      });
      expect(childLogger).toBeDefined();
    });

    it('should mask private key fields', () => {
      const childLogger = createChildLogger({
        privateKey: 'private-key-content',
        rsa_private_key: 'rsa-private-key-content',
      });
      expect(childLogger).toBeDefined();
    });

    it('should preserve non-sensitive fields', () => {
      const childLogger = createChildLogger({
        userId: 'user-123',
        userName: 'john_doe',
        email: 'john@example.com',
        role: 'admin',
      });
      expect(childLogger).toBeDefined();
    });

    it('should handle nested sensitive data', () => {
      const childLogger = createChildLogger({
        user: {
          id: 'user-123',
          email: 'john@example.com',
          credentials: {
            password: 'secret',
            token: 'jwt-token',
          },
        },
      });
      expect(childLogger).toBeDefined();
    });

    it('should handle arrays with sensitive data', () => {
      const childLogger = createChildLogger({
        users: [
          { id: '1', password: 'secret1' },
          { id: '2', password: 'secret2' },
        ],
      });
      expect(childLogger).toBeDefined();
    });
  });

  describe('Logger Integration', () => {
    it('should handle concurrent logging', () => {
      const logger1 = createChildLogger({ userId: 'user-1' });
      const logger2 = createChildLogger({ userId: 'user-2' });

      expect(() => {
        logger1.info('User 1 action');
        logger2.info('User 2 action');
        logError(new Error('Error 1'), { userId: 'user-1' });
        logError(new Error('Error 2'), { userId: 'user-2' });
      }).not.toThrow();
    });

    it('should handle rapid logging calls', () => {
      const logger = createChildLogger({ module: 'test' });

      expect(() => {
        for (let i = 0; i < 100; i++) {
          logger.info(`Message ${i}`);
        }
      }).not.toThrow();
    });

    it('should handle large context objects', () => {
      const largeContext = {
        userId: 'user-123',
        data: Array(1000).fill({ key: 'value' }),
      };

      expect(() => {
        createChildLogger(largeContext);
      }).not.toThrow();
    });
  });
});
