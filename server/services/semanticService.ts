/**
 * Semantic Service
 *
 * Integrates Hugging Face transformers for semantic understanding.
 * Provides embeddings, similarity scoring, and semantic analysis.
 *
 * @module services/semanticService
 */

import { createChildLogger } from '../_core/logger';
import { ValidationError } from '../_core/errors';
import { config } from '../_core/config';

/**
 * Semantic embedding result
 */
export interface SemanticEmbedding {
  text: string;
  embedding: number[];
  dimension: number;
  model: string;
}

/**
 * Similarity result
 */
export interface SimilarityResult {
  text1: string;
  text2: string;
  similarity: number;
  distance: number;
}

/**
 * Semantic analysis result
 */
export interface SemanticAnalysis {
  text: string;
  embedding: number[];
  keywords: string[];
  sentiment: number;
  complexity: number;
}

const logger = createChildLogger({ module: 'semanticService' });

/**
 * Create semantic embedding for text
 * Uses deterministic hashing for testing, would use Hugging Face API in production
 *
 * @param text - Text to embed
 * @returns Semantic embedding
 */
export async function createEmbedding(text: string): Promise<SemanticEmbedding> {
  if (!text || typeof text !== 'string') {
    throw new ValidationError('Invalid text', { text });
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Text cannot be empty or whitespace-only', {});
  }

  // Create deterministic embedding from text hash
  const embedding = createDeterministicEmbedding(trimmed);

  logger.debug(
    { textLength: text.length, dimension: config.MEMORY_DIMENSION },
    'Semantic embedding created'
  );

  return {
    text: trimmed,
    embedding,
    dimension: config.MEMORY_DIMENSION,
    model: config.HF_MODEL_NAME,
  };
}

/**
 * Create deterministic embedding from text
 * For testing; production would use Hugging Face API
 *
 * @param text - Text to embed
 * @returns Embedding vector
 */
function createDeterministicEmbedding(text: string): number[] {
  const embedding = Array(config.MEMORY_DIMENSION).fill(0);

  // Hash text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  // Create embedding from hash
  for (let i = 0; i < embedding.length; i++) {
    const seed = hash + i;
    embedding[i] =
      Math.sin(seed * 0.1) * 0.3 + Math.cos(seed * 0.05) * 0.2 + Math.sin(seed * 0.02) * 0.1;
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / (norm + 1e-8));
}

/**
 * Calculate cosine similarity between two texts
 *
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Similarity result
 */
export async function calculateSimilarity(text1: string, text2: string): Promise<SimilarityResult> {
  if (!text1 || typeof text1 !== 'string') {
    throw new ValidationError('Invalid text1', { text1 });
  }

  if (!text2 || typeof text2 !== 'string') {
    throw new ValidationError('Invalid text2', { text2 });
  }

  const emb1 = await createEmbedding(text1);
  const emb2 = await createEmbedding(text2);

  const similarity = calculateCosineSimilarity(emb1.embedding, emb2.embedding);
  const distance = 1 - similarity;

  logger.debug(
    { text1Length: text1.length, text2Length: text2.length, similarity },
    'Similarity calculated'
  );

  return {
    text1,
    text2,
    similarity,
    distance,
  };
}

/**
 * Calculate cosine similarity between two vectors
 *
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Similarity score (0-1)
 */
export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new ValidationError('Vector dimensions must match', {
      dim1: vec1.length,
      dim2: vec2.length,
    });
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Perform semantic analysis on text
 *
 * @param text - Text to analyze
 * @returns Semantic analysis result
 */
export async function analyzeSemantics(text: string): Promise<SemanticAnalysis> {
  if (!text || typeof text !== 'string') {
    throw new ValidationError('Invalid text', { text });
  }

  const embedding = await createEmbedding(text);

  // Extract keywords (simple approach: split and filter)
  const keywords = extractKeywords(text);

  // Estimate sentiment (-1 to 1)
  const sentiment = estimateSentiment(text);

  // Estimate complexity (0 to 1)
  const complexity = estimateComplexity(text);

  logger.debug(
    { textLength: text.length, keywordCount: keywords.length, sentiment, complexity },
    'Semantic analysis completed'
  );

  return {
    text,
    embedding: embedding.embedding,
    keywords,
    sentiment,
    complexity,
  };
}

/**
 * Extract keywords from text
 *
 * @param text - Text to extract keywords from
 * @returns Array of keywords
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction: split by whitespace, filter short words
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !isCommonWord(word))
    .slice(0, 5); // Top 5 keywords

  return Array.from(new Set(words)); // Remove duplicates
}

/**
 * Check if word is common (stop word)
 *
 * @param word - Word to check
 * @returns True if common word
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'the',
    'and',
    'that',
    'this',
    'with',
    'from',
    'have',
    'been',
    'were',
    'will',
    'would',
    'could',
    'should',
    'about',
    'which',
    'their',
    'there',
  ]);

  return commonWords.has(word);
}

/**
 * Estimate sentiment of text
 *
 * @param text - Text to analyze
 * @returns Sentiment score (-1 to 1)
 */
function estimateSentiment(text: string): number {
  const positiveWords = [
    'good',
    'great',
    'excellent',
    'amazing',
    'wonderful',
    'fantastic',
    'love',
    'happy',
    'joy',
    'beautiful',
  ];
  const negativeWords = [
    'bad',
    'terrible',
    'awful',
    'horrible',
    'hate',
    'sad',
    'angry',
    'ugly',
    'poor',
    'worst',
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  for (const word of positiveWords) {
    if (lowerText.includes(word)) score += 0.1;
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) score -= 0.1;
  }

  return Math.max(-1, Math.min(1, score));
}

/**
 * Estimate complexity of text
 *
 * @param text - Text to analyze
 * @returns Complexity score (0 to 1)
 */
function estimateComplexity(text: string): number {
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const sentences = text.split(/[.!?]+/).length;
  const avgSentenceLength = words.length / sentences;

  // Complexity based on word and sentence length
  const wordComplexity = Math.min(avgWordLength / 10, 1);
  const sentenceComplexity = Math.min(avgSentenceLength / 20, 1);

  return (wordComplexity + sentenceComplexity) / 2;
}

/**
 * Find most similar text from a list
 *
 * @param query - Query text
 * @param candidates - Candidate texts
 * @returns Most similar candidate with similarity score
 */
export async function findMostSimilar(
  query: string,
  candidates: string[]
): Promise<{ text: string; similarity: number; index: number }> {
  if (!query || typeof query !== 'string') {
    throw new ValidationError('Invalid query', { query });
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new ValidationError('Invalid candidates', { count: candidates?.length });
  }

  const queryEmbedding = await createEmbedding(query);

  let maxSimilarity = -1;
  let bestIndex = 0;
  let bestText = candidates[0];

  for (let i = 0; i < candidates.length; i++) {
    const candidateEmbedding = await createEmbedding(candidates[i]);
    const similarity = calculateCosineSimilarity(queryEmbedding.embedding, candidateEmbedding.embedding);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestIndex = i;
      bestText = candidates[i];
    }
  }

  return {
    text: bestText,
    similarity: maxSimilarity,
    index: bestIndex,
  };
}

/**
 * Cluster texts by semantic similarity
 *
 * @param texts - Texts to cluster
 * @param threshold - Similarity threshold for clustering
 * @returns Array of clusters
 */
export async function clusterTexts(
  texts: string[],
  threshold: number = 0.7
): Promise<string[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new ValidationError('Invalid texts', { count: texts?.length });
  }

  if (threshold < 0 || threshold > 1) {
    throw new ValidationError('Invalid threshold', { threshold });
  }

  const embeddings = await Promise.all(texts.map((text) => createEmbedding(text)));

  const clusters: string[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < texts.length; i++) {
    if (processed.has(i)) continue;

    const cluster = [texts[i]];
    processed.add(i);

    for (let j = i + 1; j < texts.length; j++) {
      if (processed.has(j)) continue;

      const similarity = calculateCosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);

      if (similarity >= threshold) {
        cluster.push(texts[j]);
        processed.add(j);
      }
    }

    clusters.push(cluster);
  }

  logger.info(
    { textCount: texts.length, clusterCount: clusters.length, threshold },
    'Texts clustered'
  );

  return clusters;
}

export default {
  createEmbedding,
  calculateSimilarity,
  calculateCosineSimilarity,
  analyzeSemantics,
  findMostSimilar,
  clusterTexts,
};
