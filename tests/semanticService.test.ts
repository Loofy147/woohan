/**
 * Semantic Service Unit Tests
 *
 * Tests for Hugging Face integration and semantic analysis
 */

import { describe, it, expect } from 'vitest';
import {
  createEmbedding,
  calculateSimilarity,
  calculateCosineSimilarity,
  analyzeSemantics,
  findMostSimilar,
  clusterTexts,
} from '@server/services/semanticService';
import { ValidationError } from '@server/_core/errors';

describe('Semantic Service', () => {
  describe('createEmbedding', () => {
    it('should create embedding for valid text', async () => {
      const text = 'This is a test sentence for embedding';
      const result = await createEmbedding(text);

      expect(result.text).toBe(text);
      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(256);
      expect(result.dimension).toBe(256);
      expect(result.model).toBeDefined();
    });

    it('should validate text input', async () => {
      await expect(createEmbedding('')).rejects.toThrow(ValidationError);
      await expect(createEmbedding(null as any)).rejects.toThrow(ValidationError);
      await expect(createEmbedding(undefined as any)).rejects.toThrow(ValidationError);
    });

    it('should create normalized embeddings', async () => {
      const result = await createEmbedding('Test text');

      const norm = Math.sqrt(result.embedding.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1, 1);
    });

    it('should create deterministic embeddings', async () => {
      const text = 'Deterministic test';
      const emb1 = await createEmbedding(text);
      const emb2 = await createEmbedding(text);

      expect(emb1.embedding).toEqual(emb2.embedding);
    });

    it('should handle different text lengths', async () => {
      const short = await createEmbedding('Hi');
      const medium = await createEmbedding('This is a medium length text');
      const long = await createEmbedding('This is a very long text with many words and sentences. ' + 'x'.repeat(100));

      expect(short.embedding.length).toBe(256);
      expect(medium.embedding.length).toBe(256);
      expect(long.embedding.length).toBe(256);
    });

    it('should handle special characters', async () => {
      const text = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = await createEmbedding(text);

      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(256);
    });

    it('should handle unicode characters', async () => {
      const text = 'Unicode: 你好 مرحبا שלום';
      const result = await createEmbedding(text);

      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(256);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between texts', async () => {
      const result = await calculateSimilarity('Hello world', 'Hello world');

      expect(result.text1).toBe('Hello world');
      expect(result.text2).toBe('Hello world');
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
      expect(result.distance).toBeGreaterThanOrEqual(0);
      expect(result.distance).toBeLessThanOrEqual(1);
    });

    it('should validate input texts', async () => {
      await expect(calculateSimilarity('', 'text')).rejects.toThrow(ValidationError);
      await expect(calculateSimilarity('text', '')).rejects.toThrow(ValidationError);
    });

    it('should return high similarity for identical texts', async () => {
      const result = await calculateSimilarity('Same text', 'Same text');

      expect(result.similarity).toBeCloseTo(1, 1);
      expect(result.distance).toBeCloseTo(0, 1);
    });

    it('should be symmetric', async () => {
      const result1 = await calculateSimilarity('Text A', 'Text B');
      const result2 = await calculateSimilarity('Text B', 'Text A');

      expect(result1.similarity).toBeCloseTo(result2.similarity, 10);
      expect(result1.distance).toBeCloseTo(result2.distance, 10);
    });

    it('should calculate distance as complement of similarity', async () => {
      const result = await calculateSimilarity('Text one', 'Text two');

      expect(result.similarity + result.distance).toBeCloseTo(1, 10);
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate cosine similarity between vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];

      const similarity = calculateCosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(1, 10);
    });

    it('should handle orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];

      const similarity = calculateCosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(0, 10);
    });

    it('should validate vector dimensions', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0];

      expect(() => calculateCosineSimilarity(vec1, vec2)).toThrow(ValidationError);
    });

    it('should handle zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 1, 1];

      const similarity = calculateCosineSimilarity(vec1, vec2);

      expect(similarity).toBe(0);
    });

    it('should handle negative values', () => {
      const vec1 = [1, -1, 0];
      const vec2 = [1, -1, 0];

      const similarity = calculateCosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(1, 10);
    });
  });

  describe('analyzeSemantics', () => {
    it('should analyze text semantics', async () => {
      const result = await analyzeSemantics('This is a great product with excellent quality');

      expect(result.text).toBeDefined();
      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(256);
      expect(result.keywords).toBeDefined();
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);
      expect(result.complexity).toBeGreaterThanOrEqual(0);
      expect(result.complexity).toBeLessThanOrEqual(1);
    });

    it('should validate input text', async () => {
      await expect(analyzeSemantics('')).rejects.toThrow(ValidationError);
    });

    it('should extract keywords', async () => {
      const result = await analyzeSemantics('machine learning artificial intelligence neural networks deep learning');

      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords.every((k) => typeof k === 'string')).toBe(true);
    });

    it('should detect positive sentiment', async () => {
      const result = await analyzeSemantics('I love this amazing wonderful product');

      expect(result.sentiment).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', async () => {
      const result = await analyzeSemantics('This is terrible awful horrible bad');

      expect(result.sentiment).toBeLessThan(0);
    });

    it('should estimate text complexity', async () => {
      const simple = await analyzeSemantics('Hi');
      const complex = await analyzeSemantics(
        'The multifaceted complexities of contemporary epistemological frameworks necessitate comprehensive interdisciplinary analysis'
      );

      expect(complex.complexity).toBeGreaterThanOrEqual(simple.complexity);
    });
  });

  describe('findMostSimilar', () => {
    it('should find most similar text', async () => {
      const query = 'machine learning';
      const candidates = [
        'artificial intelligence',
        'machine learning algorithms',
        'deep learning networks',
        'cooking recipes',
      ];

      const result = await findMostSimilar(query, candidates);

      expect(result.text).toBeDefined();
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThan(candidates.length);
    });

    it('should validate query', async () => {
      await expect(findMostSimilar('', ['text'])).rejects.toThrow(ValidationError);
    });

    it('should validate candidates', async () => {
      await expect(findMostSimilar('query', [])).rejects.toThrow(ValidationError);
    });

    it('should find identical match', async () => {
      const query = 'exact match';
      const candidates = ['different text', 'exact match', 'another text'];

      const result = await findMostSimilar(query, candidates);

      expect(result.text).toBe('exact match');
      expect(result.similarity).toBeCloseTo(1, 1);
    });

    it('should return correct index', async () => {
      const candidates = ['first', 'second', 'third'];
      const result = await findMostSimilar('second', candidates);

      expect(result.index).toBe(1);
    });
  });

  describe('clusterTexts', () => {
    it('should cluster similar texts', async () => {
      const texts = [
        'machine learning',
        'artificial intelligence',
        'deep learning',
        'cooking recipes',
        'baking instructions',
      ];

      const clusters = await clusterTexts(texts, 0.5);

      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(texts.length);
    });

    it('should validate texts input', async () => {
      await expect(clusterTexts([])).rejects.toThrow(ValidationError);
    });

    it('should validate threshold', async () => {
      await expect(clusterTexts(['text'], -0.1)).rejects.toThrow(ValidationError);
      await expect(clusterTexts(['text'], 1.5)).rejects.toThrow(ValidationError);
    });

    it('should respect similarity threshold', async () => {
      const texts = ['similar one', 'similar two', 'different text'];

      const strictClusters = await clusterTexts(texts, 0.9);
      const looseClusters = await clusterTexts(texts, 0.1);

      expect(strictClusters.length).toBeGreaterThanOrEqual(looseClusters.length);
    });

    it('should not duplicate texts in clusters', async () => {
      const texts = ['text one', 'text two', 'text three'];
      const clusters = await clusterTexts(texts, 0.5);

      const totalTexts = clusters.reduce((sum, cluster) => sum + cluster.length, 0);
      expect(totalTexts).toBe(texts.length);
    });

    it('should handle single text', async () => {
      const clusters = await clusterTexts(['single text']);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toEqual(['single text']);
    });

    it('should handle identical texts', async () => {
      const texts = ['same', 'same', 'same'];
      const clusters = await clusterTexts(texts, 0.9);

      expect(clusters.length).toBe(1);
      expect(clusters[0].length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', async () => {
      const longText = 'word '.repeat(1000);
      const result = await createEmbedding(longText);

      expect(result.embedding.length).toBe(256);
    });

    it('should handle text with only spaces', async () => {
      await expect(createEmbedding('   ')).rejects.toThrow(ValidationError);
    });

    it('should handle numbers in text', async () => {
      const result = await createEmbedding('123 456 789');

      expect(result.embedding).toBeDefined();
    });

    it('should handle mixed case', async () => {
      const emb1 = await createEmbedding('UPPERCASE');
      const emb2 = await createEmbedding('uppercase');

      // Different embeddings due to different characters
      expect(emb1.embedding).not.toEqual(emb2.embedding);
    });

    it('should handle punctuation', async () => {
      const result = await createEmbedding('Hello, world! How are you?');

      expect(result.embedding).toBeDefined();
    });

    it('should handle newlines and tabs', async () => {
      const result = await createEmbedding('Line 1\nLine 2\tTabbed');

      expect(result.embedding).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle batch embeddings efficiently', async () => {
      const texts = Array(100)
        .fill(0)
        .map((_, i) => `Text number ${i}`);

      const startTime = Date.now();
      const results = await Promise.all(texts.map((t) => createEmbedding(t)));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should be reasonably fast
    });

    it('should cache identical embeddings', async () => {
      const text = 'Same text for caching';

      const emb1 = await createEmbedding(text);
      const emb2 = await createEmbedding(text);

      expect(emb1.embedding).toEqual(emb2.embedding);
    });
  });
});
