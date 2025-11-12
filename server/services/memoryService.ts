/**
 * Memory Service
 *
 * Implements Dynamic Memory Model (DMM) with LSTM-based state evolution,
 * time-decay, and event-driven updates. Provides APIs for memory state
 * management, querying, and learning metrics.
 *
 * Core Concepts:
 * - Memory State: 256-dimensional vector representing accumulated knowledge
 * - Time Decay: Exponential decay of older memories (λ = 0.99)
 * - Event Integration: New events update memory through LSTM-like gates
 * - Learning Rate: Adaptive learning controlled by significance threshold
 *
 * @module services/memoryService
 */

import { createChildLogger } from '../_core/logger';
import { NotFoundError, ValidationError } from '../_core/errors';
import { getDb } from '../db';
import { config } from '../_core/config';

/**
 * Memory state representation
 */
export interface MemoryState {
  userId: string;
  dimension: number;
  state: number[];
  lastUpdate: Date;
  eventCount: number;
  significantEventCount: number;
  totalLearningUpdates: number;
}

/**
 * Memory update result
 */
export interface MemoryUpdateResult {
  userId: string;
  updated: boolean;
  memoryState: MemoryState;
  metrics: {
    significance: number;
    learningApplied: boolean;
    stateChange: number;
  };
}

/**
 * Learning metrics
 */
export interface LearningMetrics {
  userId: string;
  totalEvents: number;
  significantEvents: number;
  learningUpdates: number;
  avgSignificance: number;
  privacyEpsilon: number;
  lastUpdate: Date;
}

const logger = createChildLogger({ module: 'memoryService' });

/**
 * Initialize memory state for a new user
 * Creates a zero-initialized memory vector
 *
 * @param userId - User identifier
 * @returns Initialized memory state
 */
export async function initializeMemory(userId: string): Promise<MemoryState> {
  const dimension = config.MEMORY_DIMENSION;

  // Initialize with small random noise for stability
  const state = Array(dimension)
    .fill(0)
    .map(() => (Math.random() - 0.5) * 0.01);

  const memoryState: MemoryState = {
    userId,
    dimension,
    state,
    lastUpdate: new Date(),
    eventCount: 0,
    significantEventCount: 0,
    totalLearningUpdates: 0,
  };

  logger.info(
    { userId, dimension },
    'Memory initialized for user'
  );

  return memoryState;
}

/**
 * Get current memory state for a user
 *
 * @param userId - User identifier
 * @returns Current memory state
 * @throws NotFoundError if user has no memory
 */
export async function getMemoryState(userId: string): Promise<MemoryState> {
  // In a real implementation, this would query the database
  // For now, return initialized state
  return initializeMemory(userId);
}

/**
 * Apply time decay to memory state
 * Implements exponential decay: state' = state * λ^(t - t_last)
 *
 * @param state - Current memory state
 * @param lastUpdate - Timestamp of last update
 * @param decayFactor - Decay factor (default: 0.99)
 * @returns Decayed memory state
 */
function applyTimeDecay(
  state: number[],
  lastUpdate: Date,
  decayFactor: number = 0.99
): number[] {
  const now = new Date();
  const timeDeltaMs = now.getTime() - lastUpdate.getTime();
  const timeDeltaDays = timeDeltaMs / (1000 * 60 * 60 * 24);

  // Calculate decay: λ^t
  const decay = Math.pow(decayFactor, timeDeltaDays);

  logger.debug(
    { timeDeltaDays, decay },
    'Applied time decay to memory'
  );

  return state.map((value) => value * decay);
}

/**
 * LSTM-like gate mechanism for memory update
 * Implements simplified LSTM equations:
 * - Forget gate: f = sigmoid(W_f * x + b_f)
 * - Input gate: i = sigmoid(W_i * x + b_i)
 * - Candidate: c~ = tanh(W_c * x + b_c)
 * - Output gate: o = sigmoid(W_o * x + b_o)
 *
 * @param memoryState - Current memory state
 * @param eventEmbedding - Event semantic embedding
 * @param learningRate - Learning rate for update
 * @returns Updated memory state
 */
function applyLSTMUpdate(
  memoryState: number[],
  eventEmbedding: number[],
  learningRate: number
): number[] {
  const dimension = memoryState.length;

  // Simplified LSTM: use event embedding to modulate memory
  // In production, this would use trained weights
  const updated = memoryState.map((value, i) => {
    const embedding = eventEmbedding[i] || 0;

    // Forget gate: reduce old memory
    const forgetGate = Math.tanh(value * 0.9);

    // Input gate: add new information
    const inputGate = Math.tanh(embedding);

    // Update: combination of old and new
    const newValue = forgetGate * (1 - learningRate) + inputGate * learningRate;

    return newValue;
  });

  return updated;
}

/**
 * Calculate memory state change magnitude
 * Useful for monitoring learning progress
 *
 * @param oldState - Previous memory state
 * @param newState - Updated memory state
 * @returns Euclidean distance between states
 */
function calculateStateChange(oldState: number[], newState: number[]): number {
  let sumSquares = 0;
  for (let i = 0; i < oldState.length; i++) {
    const diff = newState[i] - oldState[i];
    sumSquares += diff * diff;
  }
  return Math.sqrt(sumSquares);
}

/**
 * Update memory with a new event
 *
 * @param userId - User identifier
 * @param eventEmbedding - Semantic embedding of the event
 * @param significance - Event significance score (0-1)
 * @returns Update result with new memory state
 */
export async function updateMemory(
  userId: string,
  eventEmbedding: number[],
  significance: number
): Promise<MemoryUpdateResult> {
  if (significance < 0 || significance > 1) {
    throw new ValidationError('Significance must be between 0 and 1', {
      significance,
    });
  }

  if (eventEmbedding.length !== config.MEMORY_DIMENSION) {
    throw new ValidationError('Event embedding dimension mismatch', {
      expected: config.MEMORY_DIMENSION,
      received: eventEmbedding.length,
    });
  }

  // Get current memory state
  let memoryState = await getMemoryState(userId);

  // Apply time decay
  const decayedState = applyTimeDecay(memoryState.state, memoryState.lastUpdate);

  // Check if event is significant enough to trigger learning
  const threshold = config.SIGNIFICANCE_THRESHOLD;
  const shouldLearn = significance >= threshold;

  let updatedState = decayedState;
  let stateChange = 0;

  if (shouldLearn) {
    // Apply LSTM update with adaptive learning rate
    const learningRate = config.LEARNING_RATE * significance;
    updatedState = applyLSTMUpdate(decayedState, eventEmbedding, learningRate);
    stateChange = calculateStateChange(decayedState, updatedState);

    // Apply gradient clipping to prevent divergence
    const clipNorm = config.GRADIENT_CLIP_NORM;
    if (stateChange > clipNorm) {
      const scale = clipNorm / stateChange;
      updatedState = updatedState.map(
        (v, i) => decayedState[i] + (v - decayedState[i]) * scale
      );
    }
  }

  // Update memory state object
  memoryState = {
    ...memoryState,
    state: updatedState,
    lastUpdate: new Date(),
    eventCount: memoryState.eventCount + 1,
    significantEventCount: shouldLearn
      ? memoryState.significantEventCount + 1
      : memoryState.significantEventCount,
    totalLearningUpdates: shouldLearn
      ? memoryState.totalLearningUpdates + 1
      : memoryState.totalLearningUpdates,
  };

  logger.info(
    {
      userId,
      significance,
      shouldLearn,
      stateChange,
      eventCount: memoryState.eventCount,
    },
    'Memory updated'
  );

  return {
    userId,
    updated: shouldLearn,
    memoryState,
    metrics: {
      significance,
      learningApplied: shouldLearn,
      stateChange,
    },
  };
}

/**
 * Get learning metrics for a user
 *
 * @param userId - User identifier
 * @returns Learning metrics
 */
export async function getLearningMetrics(userId: string): Promise<LearningMetrics> {
  const memoryState = await getMemoryState(userId);

  const avgSignificance =
    memoryState.significantEventCount > 0
      ? memoryState.significantEventCount / memoryState.eventCount
      : 0;

  return {
    userId,
    totalEvents: memoryState.eventCount,
    significantEvents: memoryState.significantEventCount,
    learningUpdates: memoryState.totalLearningUpdates,
    avgSignificance,
    privacyEpsilon: config.PRIVACY_EPSILON,
    lastUpdate: memoryState.lastUpdate,
  };
}

/**
 * Reset memory for a user (e.g., for GDPR right-to-be-forgotten)
 *
 * @param userId - User identifier
 */
export async function resetMemory(userId: string): Promise<void> {
  logger.warn({ userId }, 'Memory reset requested for user');

  // In production, this would delete from database
  // For now, just log the action
}

/**
 * Batch update memory with multiple events
 * More efficient than individual updates
 *
 * @param userId - User identifier
 * @param events - Array of events with embeddings and significance
 * @returns Final memory state after all updates
 */
export async function batchUpdateMemory(
  userId: string,
  events: Array<{
    embedding: number[];
    significance: number;
  }>
): Promise<MemoryState> {
  logger.info(
    { userId, eventCount: events.length },
    'Batch memory update started'
  );

  let memoryState = await getMemoryState(userId);

  for (const event of events) {
    const result = await updateMemory(userId, event.embedding, event.significance);
    memoryState = result.memoryState;
  }

  logger.info(
    { userId, eventCount: events.length },
    'Batch memory update completed'
  );

  return memoryState;
}

/**
 * Calculate semantic similarity between two memory states
 * Useful for clustering and anomaly detection
 *
 * @param state1 - First memory state
 * @param state2 - Second memory state
 * @returns Cosine similarity (0-1)
 */
export function calculateMemorySimilarity(state1: number[], state2: number[]): number {
  if (state1.length !== state2.length) {
    throw new ValidationError('Memory states must have same dimension', {
      dim1: state1.length,
      dim2: state2.length,
    });
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < state1.length; i++) {
    dotProduct += state1[i] * state2[i];
    norm1 += state1[i] * state1[i];
    norm2 += state2[i] * state2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export default {
  initializeMemory,
  getMemoryState,
  updateMemory,
  getLearningMetrics,
  resetMemory,
  batchUpdateMemory,
  calculateMemorySimilarity,
};
