/**
 * Custom Error Classes Module
 *
 * Provides a hierarchy of custom error classes for different failure scenarios.
 * Each error type carries semantic information that allows handlers to respond appropriately.
 *
 * Features:
 * - Base AppError class with HTTP status codes
 * - Specific error types for common scenarios
 * - Error codes for programmatic handling
 * - Optional error details for client feedback
 * - Stack trace preservation for debugging
 *
 * @module errors
 */

/**
 * Base application error class
 *
 * All application errors should extend this class to ensure consistent
 * error handling and HTTP status code mapping.
 *
 * @example
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 */
export class AppError extends Error {
  /**
   * HTTP status code for this error
   */
  public readonly statusCode: number;

  /**
   * Machine-readable error code for programmatic handling
   */
  public readonly code: string;

  /**
   * Additional error details for client response
   */
  public readonly details?: any;

  /**
   * Whether this error should be logged
   */
  public readonly shouldLog: boolean;

  /**
   * Whether this error message should be exposed to clients
   */
  public readonly isPublic: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    options: {
      details?: any;
      shouldLog?: boolean;
      isPublic?: boolean;
    } = {}
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.shouldLog = options.shouldLog !== false; // Log by default
    this.isPublic = options.isPublic !== false; // Expose message by default

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API response
   */
  toJSON() {
    return {
      status: 'error',
      code: this.code,
      message: this.isPublic ? this.message : 'An error occurred',
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Validation error for invalid input data
 *
 * @example
 * throw new ValidationError('Invalid email format', {
 *   field: 'email',
 *   value: 'invalid-email',
 *   reason: 'Invalid email format'
 * });
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(message, 400, 'VALIDATION_ERROR', {
      details,
      isPublic: true,
    });
    Object.setPrototypeOf(this, ValidationError.prototype);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error for auth-related failures
 *
 * @example
 * throw new AuthError('Invalid credentials');
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR', {
      isPublic: true,
    });
    Object.setPrototypeOf(this, AuthError.prototype);
    this.name = 'AuthError';
  }
}

/**
 * Authorization error for permission-related failures
 *
 * @example
 * throw new AuthorizationError('You do not have permission to access this resource');
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR', {
      isPublic: true,
    });
    Object.setPrototypeOf(this, AuthorizationError.prototype);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error for missing resources
 *
 * @example
 * throw new NotFoundError('User not found', { userId: 123 });
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    details?: Record<string, any>
  ) {
    super(message, 404, 'NOT_FOUND', {
      details,
      isPublic: true,
    });
    Object.setPrototypeOf(this, NotFoundError.prototype);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error for resource conflicts (e.g., duplicate entries)
 *
 * @example
 * throw new ConflictError('Email already exists', { email: 'user@example.com' });
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    details?: Record<string, any>
  ) {
    super(message, 409, 'CONFLICT', {
      details,
      isPublic: true,
    });
    Object.setPrototypeOf(this, ConflictError.prototype);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error for rate-limited requests
 *
 * @example
 * throw new RateLimitError('Too many requests', {
 *   retryAfter: 60,
 *   limit: 100,
 *   window: '1h'
 * });
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    details?: Record<string, any>
  ) {
    super(message, 429, 'RATE_LIMIT', {
      details,
      isPublic: true,
    });
    Object.setPrototypeOf(this, RateLimitError.prototype);
    this.name = 'RateLimitError';
  }
}

/**
 * External service error for third-party API failures
 *
 * @example
 * throw new ExternalServiceError('Payment gateway unavailable', {
 *   service: 'stripe',
 *   statusCode: 503,
 *   retryable: true
 * });
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', {
      details,
      isPublic: false, // Don't expose external service details
      shouldLog: true,
    });
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Database error for database-related failures
 *
 * @example
 * throw new DatabaseError('Connection timeout', {
 *   operation: 'query',
 *   table: 'users'
 * });
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(message, 500, 'DATABASE_ERROR', {
      details,
      isPublic: false, // Don't expose database details
      shouldLog: true,
    });
    Object.setPrototypeOf(this, DatabaseError.prototype);
    this.name = 'DatabaseError';
  }
}

/**
 * Configuration error for missing or invalid configuration
 *
 * @example
 * throw new ConfigError('Missing required environment variable: DATABASE_URL');
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, 'CONFIG_ERROR', {
      isPublic: false,
      shouldLog: true,
    });
    Object.setPrototypeOf(this, ConfigError.prototype);
    this.name = 'ConfigError';
  }
}

/**
 * Type guard to check if an error is an AppError
 *
 * @param error - Error to check
 * @returns True if error is an AppError instance
 *
 * @example
 * if (isAppError(error)) {
 *   res.status(error.statusCode).json(error.toJSON());
 * }
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to an AppError
 *
 * @param error - Error to convert
 * @returns AppError instance
 *
 * @example
 * const appError = toAppError(unknownError);
 */
export function toAppError(error: any): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      500,
      'INTERNAL_ERROR',
      {
        isPublic: false,
        shouldLog: true,
      }
    );
  }

  return new AppError(
    'An unexpected error occurred',
    500,
    'INTERNAL_ERROR',
    {
      isPublic: false,
      shouldLog: true,
    }
  );
}
