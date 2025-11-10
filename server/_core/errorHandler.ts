/**
 * Error Handler Middleware
 *
 * Centralized error handling for Express applications.
 * Catches all errors, logs them appropriately, and returns consistent error responses.
 *
 * Features:
 * - Unified error response format
 * - Sensitive data masking
 * - Appropriate HTTP status codes
 * - Structured error logging
 * - Development vs production error details
 *
 * @module errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { isAppError, AppError, toAppError } from './errors';
import { isDevelopment } from './config';

/**
 * Error handler middleware
 * Should be registered as the last middleware in the Express app
 *
 * @example
 * app.use(errorHandler);
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Convert to AppError if needed
  const appError = toAppError(error);

  // Log the error if appropriate
  if (appError.shouldLog) {
    logger.error(
      {
        error: {
          name: appError.name,
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode,
          stack: isDevelopment() ? appError.stack : undefined,
        },
        request: {
          method: req.method,
          url: req.url,
          ip: req.ip,
          userId: (req as any).user?.id,
        },
      },
      `Error: ${appError.message}`
    );
  }

  // Build error response
  const errorResponse = {
    status: 'error',
    code: appError.code,
    message: appError.isPublic
      ? appError.message
      : 'An error occurred processing your request',
    ...(appError.details && { details: appError.details }),
    ...(isDevelopment() && {
      debug: {
        stack: appError.stack,
        originalError: error.message,
      },
    }),
  };

  // Send response
  res.status(appError.statusCode).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 * Catches errors in async route handlers and passes them to error handler
 *
 * @param fn - Async route handler function
 * @returns Wrapped route handler
 *
 * @example
 * app.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await getUserById(req.params.id);
 *   res.json(user);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * Should be registered after all other routes
 *
 * @example
 * app.use(notFoundHandler);
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new AppError(
    `Cannot ${req.method} ${req.path}`,
    404,
    'NOT_FOUND',
    { isPublic: true }
  );
  next(error);
}

/**
 * Validation error handler
 * Formats validation errors from libraries like Zod or Joi
 *
 * @param error - Validation error
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * app.use(validationErrorHandler);
 */
export function validationErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if it's a Zod validation error
  if (error.name === 'ZodError') {
    const details = error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const appError = new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      {
        details,
        isPublic: true,
      }
    );

    return errorHandler(appError, req, res, next);
  }

  // Pass to next handler if not a validation error
  next(error);
}
