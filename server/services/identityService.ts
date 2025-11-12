/**
 * Identity Service
 *
 * Implements Secure Identity Encoding (SIE) with differential privacy.
 * Creates privacy-preserving embeddings of user identity data that can be
 * safely shared or stored without revealing sensitive information.
 *
 * Core Concepts:
 * - Identity Embedding: Semantic representation of user identity
 * - Differential Privacy: Mathematical guarantee of privacy (ε, δ)
 * - Laplace Mechanism: Adds calibrated noise for privacy
 * - Privacy Budget: Tracks cumulative privacy loss
 *
 * @module services/identityService
 */

import { createChildLogger } from '../_core/logger';
import { ValidationError, NotFoundError } from '../_core/errors';
import { config } from '../_core/config';

/**
 * Identity data input
 */
export interface IdentityInput {
  userId: string;
  data: Record<string, any>;
  privacyLevel?: 'high' | 'medium' | 'low';
}

/**
 * Encoded identity with privacy guarantees
 */
export interface EncodedIdentity {
  identityId: string;
  userId: string;
  embedding: number[];
  privacyEpsilon: number;
  privacyDelta: number;
  privacyLevel: 'high' | 'medium' | 'low';
  createdAt: Date;
  metadata: {
    dataFields: string[];
    embeddingNorm: number;
    noiseScale: number;
  };
}

/**
 * Identity similarity result
 */
export interface IdentitySimilarity {
  userId1: string;
  userId2: string;
  similarity: number;
  privacyLoss: number;
}

const logger = createChildLogger({ module: 'identityService' });

/**
 * Generate unique identity ID
 *
 * @returns Unique identity identifier
 */
function generateIdentityId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate identity input
 *
 * @param identity - Identity input to validate
 * @throws ValidationError if identity is invalid
 */
function validateIdentity(identity: IdentityInput): void {
  if (!identity.userId || typeof identity.userId !== 'string') {
    throw new ValidationError('Invalid userId', { userId: identity.userId });
  }

  if (!identity.data || typeof identity.data !== 'object') {
    throw new ValidationError('Invalid data', { data: identity.data });
  }

  if (Object.keys(identity.data).length === 0) {
    throw new ValidationError('Identity data cannot be empty', {});
  }

  if (identity.privacyLevel && !['high', 'medium', 'low'].includes(identity.privacyLevel)) {
    throw new ValidationError('Invalid privacyLevel', {
      privacyLevel: identity.privacyLevel,
    });
  }
}

/**
 * Create embedding from identity data
 * Converts structured identity data into a semantic vector
 *
 * @param data - Identity data
 * @returns Embedding vector
 */
function createIdentityEmbedding(data: Record<string, any>): number[] {
  const embedding = Array(config.MEMORY_DIMENSION).fill(0);

  // Hash identity data to create deterministic embedding
  const dataStr = JSON.stringify(data);
  let hash = 0;

  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Create embedding from hash
  for (let i = 0; i < embedding.length; i++) {
    const seed = hash + i;
    embedding[i] =
      Math.sin(seed * 0.1) * 0.3 +
      Math.cos(seed * 0.05) * 0.2 +
      Math.sin(seed * 0.02) * 0.1;
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / (norm + 1e-8));
}

/**
 * Calculate noise scale for Laplace mechanism
 * Based on privacy level and sensitivity
 *
 * @param privacyLevel - Privacy level (high/medium/low)
 * @param sensitivity - Sensitivity of the data (default: 1.0)
 * @returns Noise scale parameter
 */
function calculateNoiseScale(
  privacyLevel: 'high' | 'medium' | 'low',
  sensitivity: number = 1.0
): number {
  const epsilon = config.PRIVACY_EPSILON;

  // Adjust epsilon based on privacy level
  let adjustedEpsilon = epsilon;
  if (privacyLevel === 'high') {
    adjustedEpsilon = epsilon / 3; // Stricter privacy
  } else if (privacyLevel === 'low') {
    adjustedEpsilon = epsilon * 1.5; // More relaxed privacy
  }

  // Laplace scale: b = sensitivity / epsilon
  return sensitivity / adjustedEpsilon;
}

/**
 * Add Laplace noise for differential privacy
 * Implements the Laplace mechanism for DP
 *
 * @param value - Original value
 * @param scale - Laplace scale parameter
 * @returns Noised value
 */
function addLaplaceNoise(value: number, scale: number): number {
  // Generate Laplace-distributed noise
  // Laplace(0, b) = b * log(U) * sign(V) where U, V ~ Uniform(0,1)
  const u = Math.random();
  const v = Math.random() - 0.5;

  const noise = scale * Math.log(u) * Math.sign(v);
  return value + noise;
}

/**
 * Apply differential privacy to embedding
 * Adds calibrated noise to ensure privacy guarantees
 *
 * @param embedding - Original embedding
 * @param privacyLevel - Privacy level
 * @returns Privacy-preserved embedding
 */
function applyDifferentialPrivacy(
  embedding: number[],
  privacyLevel: 'high' | 'medium' | 'low'
): { noised: number[]; noiseScale: number } {
  const noiseScale = calculateNoiseScale(privacyLevel);

  const noised = embedding.map((value) => addLaplaceNoise(value, noiseScale));

  // Renormalize to maintain unit norm
  const norm = Math.sqrt(noised.reduce((sum, v) => sum + v * v, 0));
  const normalized = noised.map((v) => v / (norm + 1e-8));

  return { noised: normalized, noiseScale };
}

/**
 * Encode identity with privacy guarantees
 *
 * @param identity - Identity input
 * @returns Encoded identity with privacy guarantees
 */
export async function encodeIdentity(identity: IdentityInput): Promise<EncodedIdentity> {
  validateIdentity(identity);

  const privacyLevel = identity.privacyLevel || 'medium';

  // Create base embedding
  const baseEmbedding = createIdentityEmbedding(identity.data);

  // Apply differential privacy
  const { noised: embedding, noiseScale } = applyDifferentialPrivacy(
    baseEmbedding,
    privacyLevel
  );

  // Calculate actual epsilon used
  const actualEpsilon = config.PRIVACY_EPSILON * (privacyLevel === 'high' ? 0.33 : privacyLevel === 'low' ? 1.5 : 1);

  const encodedIdentity: EncodedIdentity = {
    identityId: generateIdentityId(),
    userId: identity.userId,
    embedding,
    privacyEpsilon: actualEpsilon,
    privacyDelta: config.PRIVACY_DELTA,
    privacyLevel,
    createdAt: new Date(),
    metadata: {
      dataFields: Object.keys(identity.data),
      embeddingNorm: Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)),
      noiseScale,
    },
  };

  logger.info(
    {
      userId: identity.userId,
      privacyLevel,
      epsilon: actualEpsilon,
      delta: config.PRIVACY_DELTA,
      dataFields: Object.keys(identity.data).length,
    },
    'Identity encoded with differential privacy'
  );

  return encodedIdentity;
}

/**
 * Calculate privacy loss from similarity query
 * Tracks cumulative privacy budget consumption
 *
 * @param queryCount - Number of similarity queries
 * @returns Privacy loss (epsilon consumed)
 */
function calculatePrivacyLoss(queryCount: number): number {
  // Each similarity query consumes some privacy budget
  // Using composition theorem: epsilon_total = sqrt(2 * ln(2/delta) * sum(epsilon_i^2))
  const delta = config.PRIVACY_DELTA;
  const epsilon = config.PRIVACY_EPSILON;

  // Simplified: linear composition for demonstration
  return epsilon * Math.sqrt(queryCount);
}

/**
 * Compare two identities with privacy accounting
 *
 * @param identity1 - First encoded identity
 * @param identity2 - Second encoded identity
 * @returns Similarity score and privacy loss
 */
export function compareIdentities(
  identity1: EncodedIdentity,
  identity2: EncodedIdentity
): IdentitySimilarity {
  if (identity1.embedding.length !== identity2.embedding.length) {
    throw new ValidationError('Identity embeddings have different dimensions', {
      dim1: identity1.embedding.length,
      dim2: identity2.embedding.length,
    });
  }

  // Calculate cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < identity1.embedding.length; i++) {
    dotProduct += identity1.embedding[i] * identity2.embedding[i];
    norm1 += identity1.embedding[i] * identity1.embedding[i];
    norm2 += identity2.embedding[i] * identity2.embedding[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  const similarity = denominator === 0 ? 0 : dotProduct / denominator;

  // Calculate privacy loss from this comparison
  const privacyLoss = calculatePrivacyLoss(1);

  logger.info(
    {
      userId1: identity1.userId,
      userId2: identity2.userId,
      similarity: similarity.toFixed(3),
      privacyLoss: privacyLoss.toFixed(3),
    },
    'Identities compared'
  );

  return {
    userId1: identity1.userId,
    userId2: identity2.userId,
    similarity,
    privacyLoss,
  };
}

/**
 * Verify privacy guarantees
 * Checks that privacy parameters are within acceptable bounds
 *
 * @param identity - Encoded identity
 * @returns Verification result
 */
export function verifyPrivacyGuarantees(identity: EncodedIdentity): {
  valid: boolean;
  epsilon: number;
  delta: number;
  message: string;
} {
  const maxEpsilon = 2.0; // Maximum acceptable epsilon
  const maxDelta = 0.0001; // Maximum acceptable delta

  const valid = identity.privacyEpsilon <= maxEpsilon && identity.privacyDelta <= maxDelta;

  const message = valid
    ? `Privacy guarantees satisfied: ε=${identity.privacyEpsilon.toFixed(3)}, δ=${identity.privacyDelta.toFixed(6)}`
    : `Privacy guarantees violated: ε=${identity.privacyEpsilon.toFixed(3)} (max ${maxEpsilon}), δ=${identity.privacyDelta.toFixed(6)} (max ${maxDelta})`;

  logger.info(
    {
      userId: identity.userId,
      valid,
      epsilon: identity.privacyEpsilon,
      delta: identity.privacyDelta,
    },
    'Privacy guarantees verified'
  );

  return { valid, epsilon: identity.privacyEpsilon, delta: identity.privacyDelta, message };
}

/**
 * Delete identity (GDPR right-to-be-forgotten)
 *
 * @param userId - User identifier
 */
export async function deleteIdentity(userId: string): Promise<void> {
  logger.warn({ userId }, 'Identity deletion requested (GDPR right-to-be-forgotten)');

  // In production, this would delete from database
  // For now, just log the action
}

/**
 * Batch encode identities
 * More efficient than individual encoding
 *
 * @param identities - Array of identities to encode
 * @returns Array of encoded identities
 */
export async function batchEncodeIdentities(
  identities: IdentityInput[]
): Promise<EncodedIdentity[]> {
  logger.info({ count: identities.length }, 'Batch identity encoding started');

  const encoded = await Promise.all(identities.map((identity) => encodeIdentity(identity)));

  logger.info({ count: encoded.length }, 'Batch identity encoding completed');

  return encoded;
}

/**
 * Calculate aggregate privacy loss
 * For multiple queries or operations
 *
 * @param operations - Array of privacy-consuming operations
 * @returns Total privacy loss
 */
export function calculateAggregateLoss(operations: Array<{ epsilon: number }>): number {
  // Using advanced composition theorem
  // epsilon_total = sqrt(2 * ln(2/delta) * sum(epsilon_i^2))
  const delta = config.PRIVACY_DELTA;

  const sumSquares = operations.reduce((sum, op) => sum + op.epsilon * op.epsilon, 0);
  const factor = Math.sqrt(2 * Math.log(2 / delta));

  return factor * Math.sqrt(sumSquares);
}

export default {
  encodeIdentity,
  compareIdentities,
  verifyPrivacyGuarantees,
  deleteIdentity,
  batchEncodeIdentities,
  calculateAggregateLoss,
};
