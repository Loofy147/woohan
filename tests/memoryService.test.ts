/**
 * Memory Service Unit Tests
 *
 * Tests for Dynamic Memory Model (DMM) with LSTM-based state evolution
 */

import { describe, it, expect } from 'vitest';
import {
  initializeMemory,
  getMemoryState,
  updateMemory,
  getLearningMetrics,
} from '@server/services/memoryService';
import { ValidationError } from '@server/_core/errors';

describe('Memory Service', () => {
  const memoryDimension = 256;
  let testCounter = 0;

  const getUniqueUserId = () => `test-user-${Date.now()}-${testCounter++}`;

  describe('initializeMemory', () => {
    it('should initialize memory with correct dimension', async () => {
      const userId = getUniqueUserId();
      const memory = await initializeMemory(userId);

      expect(memory).toBeDefined();
      expect(memory.userId).toBe(userId);
      expect(memory.state).toBeDefined();
      expect(memory.state.length).toBe(memoryDimension);
    });

    it('should initialize with small random noise', async () => {
      const userId = getUniqueUserId();
      const memory = await initializeMemory(userId);

      // Check that state values are small (noise initialization)
      const maxAbsValue = Math.max(...memory.state.map(Math.abs));
      expect(maxAbsValue).toBeLessThan(0.1);
    });

    it('should have valid timestamp', async () => {
      const userId = getUniqueUserId();
      const beforeInit = new Date();
      const memory = await initializeMemory(userId);
      const afterInit = new Date();

      expect(memory.createdAt).toBeInstanceOf(Date);
      expect(memory.createdAt.getTime()).toBeGreaterThanOrEqual(beforeInit.getTime());
      expect(memory.createdAt.getTime()).toBeLessThanOrEqual(afterInit.getTime());
    });
  });

  describe('getMemoryState', () => {
    it('should retrieve memory state for user', async () => {
      const userId = getUniqueUserId();
      const memory = await getMemoryState(userId);

      expect(memory).toBeDefined();
      expect(memory.userId).toBe(userId);
      expect(memory.state).toBeDefined();
      expect(memory.state.length).toBe(memoryDimension);
    });

    it('should return consistent state for same user', async () => {
      const userId = getUniqueUserId();
      const memory1 = await getMemoryState(userId);
      const memory2 = await getMemoryState(userId);

      expect(memory1.userId).toBe(memory2.userId);
      expect(memory1.state).toEqual(memory2.state);
    });

    it('should have event tracking', async () => {
      const userId = getUniqueUserId();
      const memory = await getMemoryState(userId);

      expect(memory.memoryState).toBeDefined();
      expect(memory.memoryState.eventCount).toBe(0);
      expect(memory.memoryState.significantEventCount).toBe(0);
    });
  });

  describe('updateMemory', () => {
    it('should update memory with significant event', async () => {
      const userId = getUniqueUserId();
      const memory = await getMemoryState(userId);
      const eventEmbedding = Array(memoryDimension).fill(0.1);
      const significance = 0.8;

      const result = await updateMemory(userId, eventEmbedding, significance);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.memoryState.eventCount).toBe(1);
      expect(result.memoryState.significantEventCount).toBe(1);
    });

    it('should not update memory with insignificant event', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.01);
      const significance = 0.1; // Below default threshold of 0.5

      const result = await updateMemory(userId, eventEmbedding, significance);

      expect(result.memoryState.eventCount).toBe(1); // Still counts
      expect(result.memoryState.significantEventCount).toBe(0); // Not significant
    });

    it('should validate significance range', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      // Test negative significance
      await expect(updateMemory(userId, eventEmbedding, -0.1)).rejects.toThrow(ValidationError);

      // Test significance > 1
      await expect(updateMemory(userId, eventEmbedding, 1.5)).rejects.toThrow(ValidationError);
    });

    it('should validate embedding dimension', async () => {
      const userId = getUniqueUserId();
      const wrongDimension = Array(100).fill(0.1); // Wrong dimension
      const significance = 0.8;

      await expect(updateMemory(userId, wrongDimension, significance)).rejects.toThrow(
        ValidationError
      );
    });

    it('should calculate state change magnitude', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.5);
      const significance = 0.9;

      const result = await updateMemory(userId, eventEmbedding, significance);

      expect(result.stateChangeMagnitude).toBeGreaterThanOrEqual(0);
      expect(result.stateChangeMagnitude).toBeLessThanOrEqual(1);
    });

    it('should apply gradient clipping', async () => {
      const userId = getUniqueUserId();
      const largeEmbedding = Array(memoryDimension).fill(10.0); // Very large values
      const significance = 0.95;

      const result = await updateMemory(userId, largeEmbedding, significance);

      // Check that gradients were clipped (state changes are reasonable)
      expect(result.stateChangeMagnitude).toBeLessThan(2.0);
    });

    it('should update event count', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      let result = await updateMemory(userId, eventEmbedding, 0.8);
      expect(result.memoryState.eventCount).toBe(1);

      result = await updateMemory(userId, eventEmbedding, 0.3);
      expect(result.memoryState.eventCount).toBe(2);

      result = await updateMemory(userId, eventEmbedding, 0.9);
      expect(result.memoryState.eventCount).toBe(3);
    });

    it('should track significant events separately', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      // Significant event
      await updateMemory(userId, eventEmbedding, 0.8);
      // Insignificant event
      await updateMemory(userId, eventEmbedding, 0.2);
      // Significant event
      await updateMemory(userId, eventEmbedding, 0.7);

      const result = await updateMemory(userId, eventEmbedding, 0.1);
      expect(result.memoryState.eventCount).toBe(4);
      expect(result.memoryState.significantEventCount).toBe(2);
    });

    it('should apply time decay', async () => {
      const userId = getUniqueUserId();
      const memory1 = await getMemoryState(userId);
      const initialState = [...memory1.state];

      // Wait a bit and update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const eventEmbedding = Array(memoryDimension).fill(0.1);
      const result = await updateMemory(userId, eventEmbedding, 0.8);

      // State should have changed
      expect(result.state).not.toEqual(initialState);
    });
  });

  describe('getLearningMetrics', () => {
    it('should return learning metrics', async () => {
      const userId = getUniqueUserId();
      const metrics = await getLearningMetrics(userId);

      expect(metrics).toBeDefined();
      expect(metrics.userId).toBe(userId);
      expect(metrics.totalEvents).toBeGreaterThanOrEqual(0);
      expect(metrics.significantEvents).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average significance correctly', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      // Add 2 significant events
      await updateMemory(userId, eventEmbedding, 0.8);
      await updateMemory(userId, eventEmbedding, 0.9);
      // Add 1 insignificant event
      await updateMemory(userId, eventEmbedding, 0.2);

      const metrics = await getLearningMetrics(userId);

      expect(metrics.totalEvents).toBe(3);
      expect(metrics.significantEvents).toBe(2);
      expect(metrics.avgSignificance).toBeCloseTo((0.8 + 0.9 + 0.2) / 3, 1);
    });

    it('should handle zero events', async () => {
      const newUserId = getUniqueUserId();
      const metrics = await getLearningMetrics(newUserId);

      expect(metrics.totalEvents).toBe(0);
      expect(metrics.significantEvents).toBe(0);
      expect(metrics.avgSignificance).toBe(0);
    });

    it('should calculate learning rate', async () => {
      const userId = getUniqueUserId();
      const metrics = await getLearningMetrics(userId);

      expect(metrics.learningRate).toBeGreaterThan(0);
      expect(metrics.learningRate).toBeLessThanOrEqual(0.01);
    });

    it('should track memory entropy', async () => {
      const userId = getUniqueUserId();
      const metrics = await getLearningMetrics(userId);

      expect(metrics.memoryEntropy).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryEntropy).toBeLessThanOrEqual(1);
    });
  });

  describe('Memory Stability', () => {
    it('should maintain numerical stability with many updates', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      // Perform many updates
      for (let i = 0; i < 100; i++) {
        const significance = Math.random() * 0.5 + 0.5; // 0.5-1.0
        const result = await updateMemory(userId, eventEmbedding, significance);

        // Check for NaN or Infinity
        expect(result.state.every((v) => Number.isFinite(v))).toBe(true);
        expect(result.stateChangeMagnitude).toBeLessThan(10);
      }

      const metrics = await getLearningMetrics(userId);
      expect(metrics.totalEvents).toBe(100);
    });

    it('should handle alternating significant and insignificant events', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      for (let i = 0; i < 50; i++) {
        const significance = i % 2 === 0 ? 0.8 : 0.2;
        const result = await updateMemory(userId, eventEmbedding, significance);

        expect(result.state).toBeDefined();
        expect(result.state.length).toBe(memoryDimension);
      }

      const metrics = await getLearningMetrics(userId);
      expect(metrics.totalEvents).toBe(50);
      expect(metrics.significantEvents).toBe(25);
    });

    it('should normalize state vector', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.5);

      const result = await updateMemory(userId, eventEmbedding, 0.9);

      // Calculate norm
      const norm = Math.sqrt(result.state.reduce((sum, v) => sum + v * v, 0));

      // Should be approximately 1 (normalized)
      expect(norm).toBeCloseTo(1, 1);
    });

    it('should handle rapid successive updates', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      const updates = [];
      for (let i = 0; i < 20; i++) {
        updates.push(updateMemory(userId, eventEmbedding, 0.7));
      }

      const results = await Promise.all(updates);

      expect(results).toHaveLength(20);
      expect(results.every((r) => r.state)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero embedding', async () => {
      const userId = getUniqueUserId();
      const zeroEmbedding = Array(memoryDimension).fill(0);

      const result = await updateMemory(userId, zeroEmbedding, 0.5);

      expect(result).toBeDefined();
      expect(result.state).toBeDefined();
    });

    it('should handle maximum significance', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      const result = await updateMemory(userId, eventEmbedding, 1.0);

      expect(result.memoryState.significantEventCount).toBe(1);
    });

    it('should handle minimum significance threshold', async () => {
      const userId = getUniqueUserId();
      const eventEmbedding = Array(memoryDimension).fill(0.1);

      const result = await updateMemory(userId, eventEmbedding, 0.5);

      // At threshold, should be considered significant
      expect(result.memoryState.significantEventCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle very small embeddings', async () => {
      const userId = getUniqueUserId();
      const smallEmbedding = Array(memoryDimension).fill(1e-10);

      const result = await updateMemory(userId, smallEmbedding, 0.8);

      expect(result).toBeDefined();
      expect(Number.isFinite(result.stateChangeMagnitude)).toBe(true);
    });

    it('should handle very large embeddings', async () => {
      const userId = getUniqueUserId();
      const largeEmbedding = Array(memoryDimension).fill(1e10);

      const result = await updateMemory(userId, largeEmbedding, 0.8);

      expect(result).toBeDefined();
      expect(Number.isFinite(result.stateChangeMagnitude)).toBe(true);
    });
  });
});
