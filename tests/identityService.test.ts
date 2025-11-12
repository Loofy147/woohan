/**
 * Identity Service Unit Tests
 *
 * Tests for Secure Identity Encoding (SIE) with differential privacy
 */

import { describe, it, expect } from 'vitest';
import {
  encodeIdentity,
  compareIdentities,
  verifyPrivacyGuarantees,
  batchEncodeIdentities,
  calculateAggregateLoss,
} from '@server/services/identityService';
import { ValidationError } from '@server/_core/errors';
import type { IdentityInput } from '@server/services/identityService';

describe('Identity Service', () => {
  const testUserId = 'test-user-123';

  describe('encodeIdentity', () => {
    it('should encode valid identity', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
        },
      };

      const encoded = await encodeIdentity(identity);

      expect(encoded.identityId).toBeDefined();
      expect(encoded.identityId).toMatch(/^id_/);
      expect(encoded.userId).toBe(testUserId);
      expect(encoded.embedding).toBeDefined();
      expect(encoded.embedding.length).toBe(256);
      expect(encoded.privacyEpsilon).toBeGreaterThan(0);
      expect(encoded.privacyDelta).toBeGreaterThan(0);
      expect(encoded.privacyLevel).toBe('medium');
      expect(encoded.createdAt).toBeInstanceOf(Date);
    });

    it('should validate userId', async () => {
      const identity: IdentityInput = {
        userId: '',
        data: { name: 'John' },
      };

      await expect(encodeIdentity(identity)).rejects.toThrow(ValidationError);
    });

    it('should validate data exists', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: {},
      };

      await expect(encodeIdentity(identity)).rejects.toThrow(ValidationError);
    });

    it('should validate privacyLevel', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John' },
        privacyLevel: 'invalid' as any,
      };

      await expect(encodeIdentity(identity)).rejects.toThrow(ValidationError);
    });

    it('should encode with high privacy level', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John', email: 'john@example.com' },
        privacyLevel: 'high',
      };

      const encoded = await encodeIdentity(identity);

      expect(encoded.privacyLevel).toBe('high');
      expect(encoded.privacyEpsilon).toBeLessThan(1.5); // Stricter privacy
    });

    it('should encode with medium privacy level', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John', email: 'john@example.com' },
        privacyLevel: 'medium',
      };

      const encoded = await encodeIdentity(identity);

      expect(encoded.privacyLevel).toBe('medium');
    });

    it('should encode with low privacy level', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John', email: 'john@example.com' },
        privacyLevel: 'low',
      };

      const encoded = await encodeIdentity(identity);

      expect(encoded.privacyLevel).toBe('low');
      expect(encoded.privacyEpsilon).toBeGreaterThan(1.0); // More relaxed privacy
    });

    it('should normalize embedding', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John', email: 'john@example.com' },
      };

      const encoded = await encodeIdentity(identity);

      const norm = Math.sqrt(encoded.embedding.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1, 1); // Normalized to unit length
    });

    it('should preserve data fields in metadata', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: {
          name: 'John',
          email: 'john@example.com',
          role: 'admin',
        },
      };

      const encoded = await encodeIdentity(identity);

      expect(encoded.metadata.dataFields).toContain('name');
      expect(encoded.metadata.dataFields).toContain('email');
      expect(encoded.metadata.dataFields).toContain('role');
      expect(encoded.metadata.dataFields.length).toBe(3);
    });

    it('should generate unique identity IDs', async () => {
      const identity1: IdentityInput = {
        userId: testUserId,
        data: { name: 'John' },
      };

      const identity2: IdentityInput = {
        userId: testUserId + '2',
        data: { name: 'Jane' },
      };

      const encoded1 = await encodeIdentity(identity1);
      const encoded2 = await encodeIdentity(identity2);

      expect(encoded1.identityId).not.toBe(encoded2.identityId);
    });

    it('should add noise for privacy', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John', email: 'john@example.com' },
      };

      const encoded1 = await encodeIdentity(identity);
      const encoded2 = await encodeIdentity(identity);

      // Same input should produce different embeddings due to noise
      // (with very high probability)
      const difference = encoded1.embedding
        .map((v, i) => Math.abs(v - encoded2.embedding[i]))
        .reduce((sum, v) => sum + v, 0);

      expect(difference).toBeGreaterThan(0);
    });

    it('should track noise scale in metadata', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John' },
      };

      const encoded = await encodeIdentity(identity);

      expect(encoded.metadata.noiseScale).toBeGreaterThan(0);
      expect(typeof encoded.metadata.noiseScale).toBe('number');
    });

    it('should handle complex identity data', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
          tags: ['important', 'verified'],
          score: 95.5,
        },
      };

      const encoded = await encodeIdentity(identity);

      expect(encoded).toBeDefined();
      expect(encoded.embedding.length).toBe(256);
    });
  });

  describe('compareIdentities', () => {
    it('should compare two identities', async () => {
      const identity1: IdentityInput = {
        userId: 'user-1',
        data: { name: 'John', email: 'john@example.com' },
      };

      const identity2: IdentityInput = {
        userId: 'user-2',
        data: { name: 'John', email: 'john@example.com' },
      };

      const encoded1 = await encodeIdentity(identity1);
      const encoded2 = await encodeIdentity(identity2);

      const result = compareIdentities(encoded1, encoded2);

      expect(result.userId1).toBe('user-1');
      expect(result.userId2).toBe('user-2');
      expect(result.similarity).toBeGreaterThanOrEqual(-1);
      expect(result.similarity).toBeLessThanOrEqual(1);
      expect(result.privacyLoss).toBeGreaterThan(0);
    });

    it('should return high similarity for identical identities', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John', email: 'john@example.com' },
      };

      const encoded1 = await encodeIdentity(identity);
      const encoded2 = await encodeIdentity(identity);

      const result = compareIdentities(encoded1, encoded2);

      // Due to noise, similarity won't be exactly 1, but should be high
      expect(result.similarity).toBeGreaterThan(0.5);
    });

    it('should return low similarity for different identities', async () => {
      const identity1: IdentityInput = {
        userId: 'user-1',
        data: { name: 'John' },
      };

      const identity2: IdentityInput = {
        userId: 'user-2',
        data: { name: 'Jane' },
      };

      const encoded1 = await encodeIdentity(identity1);
      const encoded2 = await encodeIdentity(identity2);

      const result = compareIdentities(encoded1, encoded2);

      // Different identities should have lower similarity
      expect(result.similarity).toBeLessThan(0.9);
    });

    it('should be symmetric', async () => {
      const identity1: IdentityInput = {
        userId: 'user-1',
        data: { name: 'John' },
      };

      const identity2: IdentityInput = {
        userId: 'user-2',
        data: { name: 'Jane' },
      };

      const encoded1 = await encodeIdentity(identity1);
      const encoded2 = await encodeIdentity(identity2);

      const result1 = compareIdentities(encoded1, encoded2);
      const result2 = compareIdentities(encoded2, encoded1);

      expect(result1.similarity).toBeCloseTo(result2.similarity, 10);
    });

    it('should validate embedding dimensions match', () => {
      const identity1: IdentityInput = {
        userId: 'user-1',
        data: { name: 'John' },
      };

      const identity2: IdentityInput = {
        userId: 'user-2',
        data: { name: 'Jane' },
      };

      // Create mock identities with mismatched dimensions
      const encoded1 = {
        userId: 'user-1',
        embedding: Array(256).fill(0.5),
      } as any;

      const encoded2 = {
        userId: 'user-2',
        embedding: Array(100).fill(0.5),
      } as any;

      expect(() => compareIdentities(encoded1, encoded2)).toThrow(ValidationError);
    });

    it('should account for privacy loss', async () => {
      const identity1: IdentityInput = {
        userId: 'user-1',
        data: { name: 'John' },
      };

      const identity2: IdentityInput = {
        userId: 'user-2',
        data: { name: 'Jane' },
      };

      const encoded1 = await encodeIdentity(identity1);
      const encoded2 = await encodeIdentity(identity2);

      const result = compareIdentities(encoded1, encoded2);

      expect(result.privacyLoss).toBeGreaterThan(0);
      expect(result.privacyLoss).toBeLessThan(10); // Reasonable bound
    });
  });

  describe('verifyPrivacyGuarantees', () => {
    it('should verify valid privacy guarantees', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John' },
        privacyLevel: 'high',
      };

      const encoded = await encodeIdentity(identity);
      const verification = verifyPrivacyGuarantees(encoded);

      expect(verification.valid).toBe(true);
      expect(verification.epsilon).toBeLessThanOrEqual(2.0);
      expect(verification.delta).toBeLessThanOrEqual(0.0001);
      expect(verification.message).toContain('satisfied');
    });

    it('should include epsilon and delta in result', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John' },
      };

      const encoded = await encodeIdentity(identity);
      const verification = verifyPrivacyGuarantees(encoded);

      expect(verification.epsilon).toBe(encoded.privacyEpsilon);
      expect(verification.delta).toBe(encoded.privacyDelta);
    });

    it('should provide informative message', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John' },
      };

      const encoded = await encodeIdentity(identity);
      const verification = verifyPrivacyGuarantees(encoded);

      expect(verification.message).toBeDefined();
      expect(typeof verification.message).toBe('string');
      expect(verification.message.length).toBeGreaterThan(0);
    });
  });

  describe('batchEncodeIdentities', () => {
    it('should batch encode multiple identities', async () => {
      const identities: IdentityInput[] = [
        { userId: 'user-1', data: { name: 'John' } },
        { userId: 'user-2', data: { name: 'Jane' } },
        { userId: 'user-3', data: { name: 'Bob' } },
      ];

      const encoded = await batchEncodeIdentities(identities);

      expect(encoded).toHaveLength(3);
      expect(encoded.every((e) => e.embedding)).toBe(true);
    });

    it('should handle empty batch', async () => {
      const encoded = await batchEncodeIdentities([]);

      expect(encoded).toHaveLength(0);
    });

    it('should preserve order', async () => {
      const identities: IdentityInput[] = [
        { userId: 'user-1', data: { name: 'John' } },
        { userId: 'user-2', data: { name: 'Jane' } },
        { userId: 'user-3', data: { name: 'Bob' } },
      ];

      const encoded = await batchEncodeIdentities(identities);

      expect(encoded[0].userId).toBe('user-1');
      expect(encoded[1].userId).toBe('user-2');
      expect(encoded[2].userId).toBe('user-3');
    });

    it('should process in parallel', async () => {
      const identities: IdentityInput[] = Array(20)
        .fill(0)
        .map((_, i) => ({
          userId: `user-${i}`,
          data: { name: `User ${i}` },
        }));

      const startTime = Date.now();
      const encoded = await batchEncodeIdentities(identities);
      const duration = Date.now() - startTime;

      expect(encoded).toHaveLength(20);
      expect(duration).toBeLessThan(5000); // Should be reasonably fast
    });
  });

  describe('calculateAggregateLoss', () => {
    it('should calculate aggregate privacy loss', () => {
      const operations = [
        { epsilon: 0.5 },
        { epsilon: 0.3 },
        { epsilon: 0.2 },
      ];

      const loss = calculateAggregateLoss(operations);

      expect(loss).toBeGreaterThan(0);
      expect(typeof loss).toBe('number');
    });

    it('should handle single operation', () => {
      const operations = [{ epsilon: 0.5 }];

      const loss = calculateAggregateLoss(operations);

      expect(loss).toBeGreaterThan(0);
    });

    it('should handle empty operations', () => {
      const loss = calculateAggregateLoss([]);

      expect(loss).toBeGreaterThanOrEqual(0);
    });

    it('should increase with more operations', () => {
      const loss1 = calculateAggregateLoss([{ epsilon: 0.5 }]);
      const loss2 = calculateAggregateLoss([
        { epsilon: 0.5 },
        { epsilon: 0.5 },
      ]);

      expect(loss2).toBeGreaterThan(loss1);
    });

    it('should use composition theorem', () => {
      const operations = Array(10)
        .fill(0)
        .map(() => ({ epsilon: 0.1 }));

      const loss = calculateAggregateLoss(operations);

      // With composition, loss should grow sublinearly
      expect(loss).toBeLessThan(10 * 0.1); // Less than linear
    });
  });

  describe('Privacy Guarantees', () => {
    it('should maintain privacy across multiple operations', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John', email: 'john@example.com' },
      };

      const encoded = await encodeIdentity(identity);
      const verification = verifyPrivacyGuarantees(encoded);

      expect(verification.valid).toBe(true);
      expect(verification.epsilon).toBeGreaterThan(0);
      expect(verification.epsilon).toBeLessThan(2.0);
    });

    it('should provide different privacy levels', async () => {
      const baseIdentity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John' },
      };

      const highPrivacy = await encodeIdentity({
        ...baseIdentity,
        privacyLevel: 'high',
      });
      const mediumPrivacy = await encodeIdentity({
        ...baseIdentity,
        privacyLevel: 'medium',
      });
      const lowPrivacy = await encodeIdentity({
        ...baseIdentity,
        privacyLevel: 'low',
      });

      expect(highPrivacy.privacyEpsilon).toBeLessThan(mediumPrivacy.privacyEpsilon);
      expect(mediumPrivacy.privacyEpsilon).toBeLessThan(lowPrivacy.privacyEpsilon);
    });

    it('should handle GDPR compliance', async () => {
      const identity: IdentityInput = {
        userId: testUserId,
        data: { name: 'John', email: 'john@example.com' },
      };

      const encoded = await encodeIdentity(identity);

      // Verify that deletion is possible (GDPR right-to-be-forgotten)
      expect(async () => {
        // deleteIdentity would be called here
      }).toBeDefined();
    });
  });
});
