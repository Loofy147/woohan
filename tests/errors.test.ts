/**
 * Error Classes Unit Tests
 *
 * Tests for custom error classes and error handling utilities
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  isAppError,
  toAppError,
} from '@server/_core/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.shouldLog).toBe(true);
      expect(error.isPublic).toBe(true);
    });

    it('should create an error with custom values', () => {
      const error = new AppError('Not found', 404, 'NOT_FOUND', {
        isPublic: true,
      });
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should convert to JSON', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', {
        details: { field: 'email' },
      });
      const json = error.toJSON();
      expect(json).toEqual({
        status: 'error',
        code: 'TEST_ERROR',
        message: 'Test error',
        details: { field: 'email' },
      });
    });

    it('should hide message when not public', () => {
      const error = new AppError('Secret error', 500, 'SECRET', {
        isPublic: false,
      });
      const json = error.toJSON();
      expect(json.message).toBe('An error occurred');
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error', () => {
      const error = new ValidationError('Invalid email', {
        field: 'email',
        reason: 'Invalid format',
      });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({
        field: 'email',
        reason: 'Invalid format',
      });
    });
  });

  describe('AuthError', () => {
    it('should create an auth error', () => {
      const error = new AuthError('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_ERROR');
    });
  });

  describe('AuthorizationError', () => {
    it('should create an authorization error', () => {
      const error = new AuthorizationError('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError('User not found', { userId: 123 });
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ userId: 123 });
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error', () => {
      const error = new ConflictError('Email already exists', {
        email: 'test@example.com',
      });
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('isAppError', () => {
    it('should identify AppError instances', () => {
      const appError = new AppError('Test');
      const regularError = new Error('Test');

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(regularError)).toBe(false);
      expect(isAppError(null)).toBe(false);
    });
  });

  describe('toAppError', () => {
    it('should convert AppError to AppError', () => {
      const appError = new AppError('Test');
      const result = toAppError(appError);
      expect(result).toBe(appError);
    });

    it('should convert Error to AppError', () => {
      const error = new Error('Test error');
      const result = toAppError(error);
      expect(isAppError(result)).toBe(true);
      expect(result.message).toBe('Test error');
      expect(result.statusCode).toBe(500);
    });

    it('should convert unknown error to AppError', () => {
      const result = toAppError('unknown error');
      expect(isAppError(result)).toBe(true);
      expect(result.statusCode).toBe(500);
    });
  });
});
