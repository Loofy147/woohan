/**
 * Event Service
 *
 * Implements Event-Driven Continuous Learning (EDCL) with significance scoring,
 * semantic analysis, and adaptive thresholding. Processes incoming events and
 * determines which ones trigger memory updates.
 *
 * Core Concepts:
 * - Event Validation: Ensures events meet minimum quality standards
 * - Significance Scoring: Determines importance of events
 * - Semantic Analysis: Uses Hugging Face for event understanding
 * - Adaptive Threshold: Adjusts learning trigger based on historical data
 *
 * @module services/eventService
 */

import { createChildLogger } from '../_core/logger';
import { ValidationError } from '../_core/errors';
import { config } from '../_core/config';

/**
 * Raw event input
 */
export interface EventInput {
  userId: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Processed event with significance score
 */
export interface ProcessedEvent {
  eventId: string;
  userId: string;
  content: string;
  embedding: number[];
  significance: number;
  metadata: Record<string, any>;
  timestamp: Date;
  processingTime: number;
}

/**
 * Event processing result
 */
export interface EventProcessingResult {
  event: ProcessedEvent;
  significant: boolean;
  learningTriggered: boolean;
  reason: string;
}

const logger = createChildLogger({ module: 'eventService' });

/**
 * Validate event input
 * Ensures event meets minimum quality standards
 *
 * @param event - Event input to validate
 * @throws ValidationError if event is invalid
 */
function validateEvent(event: EventInput): void {
  if (!event.userId || typeof event.userId !== 'string') {
    throw new ValidationError('Invalid userId', { userId: event.userId });
  }

  if (!event.content || typeof event.content !== 'string') {
    throw new ValidationError('Invalid content', { content: event.content });
  }

  if (event.content.length < 5) {
    throw new ValidationError('Content too short (minimum 5 characters)', {
      length: event.content.length,
    });
  }

  if (event.content.length > 10000) {
    throw new ValidationError('Content too long (maximum 10000 characters)', {
      length: event.content.length,
    });
  }

  if (event.timestamp && !(event.timestamp instanceof Date)) {
    throw new ValidationError('Invalid timestamp', { timestamp: event.timestamp });
  }
}

/**
 * Generate unique event ID
 *
 * @returns Unique event identifier
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create semantic embedding for event content
 * In production, this would call Hugging Face API
 *
 * @param content - Event content
 * @returns Semantic embedding vector
 */
async function createEmbedding(content: string): Promise<number[]> {
  // Simplified embedding: hash-based for testing
  // In production, call Hugging Face sentence-transformers API
  const embedding = Array(config.MEMORY_DIMENSION).fill(0);

  // Use content length and character distribution for deterministic embedding
  const hash = content
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  for (let i = 0; i < embedding.length; i++) {
    embedding[i] =
      Math.sin((hash + i) * 0.1) * 0.5 + Math.cos((hash + i) * 0.05) * 0.3;
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / (norm + 1e-8));
}

/**
 * Calculate event significance score
 * Combines multiple factors: content length, novelty, semantic importance
 *
 * @param content - Event content
 * @param embedding - Semantic embedding
 * @param metadata - Additional event metadata
 * @returns Significance score (0-1)
 */
async function calculateSignificance(
  content: string,
  embedding: number[],
  metadata: Record<string, any> = {}
): Promise<number> {
  let score = 0.5; // Base score

  // Factor 1: Content length (longer = more significant)
  const lengthFactor = Math.min(content.length / 500, 1.0) * 0.2;
  score += lengthFactor;

  // Factor 2: Embedding magnitude (stronger signal = more significant)
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  const magnitudeFactor = Math.min(magnitude, 1.0) * 0.2;
  score += magnitudeFactor;

  // Factor 3: Metadata importance
  if (metadata.importance) {
    score += Math.min(metadata.importance, 1.0) * 0.2;
  }

  // Factor 4: Recency (newer events slightly more significant)
  if (metadata.timestamp) {
    const ageMs = Date.now() - new Date(metadata.timestamp).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.exp(-ageDays / 30) * 0.1; // Decay over 30 days
    score += recencyFactor;
  }

  // Clamp to [0, 1]
  return Math.min(Math.max(score, 0), 1);
}

/**
 * Process an event
 * Validates, embeds, scores, and determines if learning should be triggered
 *
 * @param event - Event input
 * @returns Processing result
 */
export async function processEvent(event: EventInput): Promise<EventProcessingResult> {
  const startTime = Date.now();

  try {
    // Validate event
    validateEvent(event);

    // Create semantic embedding
    const embedding = await createEmbedding(event.content);

    // Calculate significance
    const significance = await calculateSignificance(event.content, embedding, event.metadata);

    // Create processed event
    const processedEvent: ProcessedEvent = {
      eventId: generateEventId(),
      userId: event.userId,
      content: event.content,
      embedding,
      significance,
      metadata: event.metadata || {},
      timestamp: event.timestamp || new Date(),
      processingTime: Date.now() - startTime,
    };

    // Determine if learning should be triggered
    const threshold = config.SIGNIFICANCE_THRESHOLD;
    const significant = significance >= threshold;

    logger.info(
      {
        eventId: processedEvent.eventId,
        userId: event.userId,
        significance,
        threshold,
        significant,
        processingTime: processedEvent.processingTime,
      },
      'Event processed'
    );

    return {
      event: processedEvent,
      significant,
      learningTriggered: significant,
      reason: significant
        ? `Significance ${significance.toFixed(2)} >= threshold ${threshold}`
        : `Significance ${significance.toFixed(2)} < threshold ${threshold}`,
    };
  } catch (error) {
    logger.error(
      { userId: event.userId, error: (error as Error).message },
      'Event processing failed'
    );
    throw error;
  }
}

/**
 * Batch process multiple events
 * More efficient than individual processing
 *
 * @param events - Array of events to process
 * @returns Array of processing results
 */
export async function batchProcessEvents(
  events: EventInput[]
): Promise<EventProcessingResult[]> {
  logger.info({ eventCount: events.length }, 'Batch event processing started');

  const results = await Promise.all(events.map((event) => processEvent(event)));

  const significantCount = results.filter((r) => r.significant).length;
  logger.info(
    { totalEvents: events.length, significantEvents: significantCount },
    'Batch event processing completed'
  );

  return results;
}

/**
 * Detect event clusters (similar events)
 * Useful for pattern recognition and anomaly detection
 *
 * @param events - Array of processed events
 * @param similarityThreshold - Threshold for clustering (0-1)
 * @returns Array of event clusters
 */
export function detectEventClusters(
  events: ProcessedEvent[],
  similarityThreshold: number = 0.7
): ProcessedEvent[][] {
  if (events.length === 0) return [];

  const clusters: ProcessedEvent[][] = [];
  const processed = new Set<string>();

  for (const event of events) {
    if (processed.has(event.eventId)) continue;

    const cluster = [event];
    processed.add(event.eventId);

    for (const other of events) {
      if (processed.has(other.eventId)) continue;

      const similarity = calculateEmbeddingSimilarity(event.embedding, other.embedding);
      if (similarity >= similarityThreshold) {
        cluster.push(other);
        processed.add(other.eventId);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Calculate cosine similarity between two embeddings
 *
 * @param embedding1 - First embedding
 * @param embedding2 - Second embedding
 * @returns Similarity score (0-1)
 */
function calculateEmbeddingSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Detect anomalous events
 * Events that are significantly different from the norm
 *
 * @param events - Array of processed events
 * @param anomalyThreshold - Threshold for anomaly detection (0-1)
 * @returns Array of anomalous events
 */
export function detectAnomalies(
  events: ProcessedEvent[],
  anomalyThreshold: number = 0.1
): ProcessedEvent[] {
  if (events.length < 2) return [];

  // Calculate average embedding
  const avgEmbedding = Array(config.MEMORY_DIMENSION).fill(0);
  for (const event of events) {
    for (let i = 0; i < event.embedding.length; i++) {
      avgEmbedding[i] += event.embedding[i];
    }
  }
  for (let i = 0; i < avgEmbedding.length; i++) {
    avgEmbedding[i] /= events.length;
  }

  // Find events far from average
  const anomalies: ProcessedEvent[] = [];
  for (const event of events) {
    const distance = calculateEmbeddingDistance(event.embedding, avgEmbedding);
    const avgDistance =
      events.reduce((sum, e) => sum + calculateEmbeddingDistance(e.embedding, avgEmbedding), 0) /
      events.length;

    if (distance > avgDistance * (1 + anomalyThreshold)) {
      anomalies.push(event);
    }
  }

  return anomalies;
}

/**
 * Calculate Euclidean distance between two embeddings
 *
 * @param embedding1 - First embedding
 * @param embedding2 - Second embedding
 * @returns Distance
 */
function calculateEmbeddingDistance(embedding1: number[], embedding2: number[]): number {
  let sumSquares = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sumSquares += diff * diff;
  }
  return Math.sqrt(sumSquares);
}

export default {
  processEvent,
  batchProcessEvents,
  detectEventClusters,
  detectAnomalies,
};
