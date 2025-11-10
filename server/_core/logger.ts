/**
 * Structured Logger Module
 *
 * Provides a centralized logging solution using Pino for production-grade observability.
 * All logs are output in JSON format for machine processing and searchability.
 *
 * Features:
 * - Structured JSON logging with context fields
 * - Automatic request ID tracking
 * - Sensitive data masking (passwords, tokens, PII)
 * - Environment-based log level configuration
 * - Pretty printing in development mode
 *
 * @module logger
 */

import pino from 'pino';
import pinoHttp from 'pino-http';
import { Request, Response } from 'express';

/**
 * Log level type definition
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Sensitive fields that should be masked in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'creditCard',
  'ssn',
  'privateKey',
  'refreshToken',
];

/**
 * Mask sensitive data in log objects
 * @param obj - Object to mask
 * @returns Masked object
 */
function maskSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const masked = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in masked) {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

/**
 * Create the base logger instance
 * Configures Pino with appropriate transport based on environment
 */
function createBaseLogger(): pino.Logger {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;

  const pinoConfig: pino.LoggerOptions = {
    level: logLevel,
    serializers: {
      req: (req: Request) => ({
        id: (req as any).id,
        method: req.method,
        url: req.url,
        headers: maskSensitiveData(req.headers),
        remoteAddress: req.ip,
      }),
      res: (res: Response) => ({
        statusCode: res.statusCode,
        headers: maskSensitiveData(res.getHeaders()),
      }),
      err: pino.stdSerializers.err,
    },
  };

  if (isDevelopment) {
    return pino(pinoConfig, pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    }));
  }

  return pino(pinoConfig);
}

/**
 * Global logger instance
 */
export const logger = createBaseLogger();

/**
 * HTTP request logger middleware
 * Automatically logs incoming requests and outgoing responses with timing
 *
 * @returns Express middleware function
 */
export function httpLogger() {
  return pinoHttp({
    logger,
    customLogLevel: (req: Request, res: Response, err?: Error) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      }
      if (res.statusCode >= 500 || err) {
        return 'error';
      }
      return 'info';
    },
    customSuccessMessage: (req: Request, res: Response) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req: Request, res: Response, err?: Error) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err?.message || 'Unknown error'}`;
    },
    genReqId: (req: Request) => {
      return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
  });
}

/**
 * Create a child logger with additional context
 *
 * @param context - Context object to attach to all logs from this logger
 * @returns Child logger instance
 *
 * @example
 * const userLogger = createChildLogger({ userId: user.id, module: 'auth' });
 * userLogger.info('User logged in');
 * // Output: { userId: 'user-123', module: 'auth', msg: 'User logged in' }
 */
export function createChildLogger(context: Record<string, any>): pino.Logger {
  return logger.child(maskSensitiveData(context));
}

/**
 * Log an error with full context and stack trace
 *
 * @param error - Error object to log
 * @param context - Additional context information
 *
 * @example
 * logError(new Error('Database connection failed'), {
 *   userId: user.id,
 *   operation: 'fetchUser',
 *   retryCount: 3
 * });
 */
export function logError(error: Error, context?: Record<string, any>): void {
  logger.error(
    {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    },
    'An error occurred'
  );
}

/**
 * Log an operation with timing information
 *
 * @param operation - Operation name
 * @param duration - Duration in milliseconds
 * @param context - Additional context
 *
 * @example
 * const start = Date.now();
 * // ... perform operation
 * logOperation('database.query', Date.now() - start, { query: 'SELECT ...' });
 */
export function logOperation(
  operation: string,
  duration: number,
  context?: Record<string, any>
): void {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level as LogLevel](
    {
      ...context,
      operation,
      duration,
    },
    `Operation completed: ${operation}`
  );
}

/**
 * Log a security-related event
 *
 * @param event - Security event type
 * @param context - Event context and details
 *
 * @example
 * logSecurityEvent('failed_login_attempt', {
 *   email: user.email,
 *   attempts: 3,
 *   ipAddress: req.ip
 * });
 */
export function logSecurityEvent(event: string, context?: Record<string, any>): void {
  logger.warn(
    {
      ...context,
      event,
      timestamp: new Date().toISOString(),
    },
    `Security event: ${event}`
  );
}

export default logger;
