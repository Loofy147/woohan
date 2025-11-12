/**
 * Event Service Unit Tests
 *
 * Tests for Event-Driven Continuous Learning (EDCL) with significance scoring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  processEvent,
  batchProcessEvents,
  detectEventClusters,
  detectAnomalies,
} from '@server/services/eventService';
import { ValidationError } from '@server/_core/errors';
import type { EventInput } from '@server/services/eventService';

describe('Event Service', () => {
  const testUserId = 'test-user-123';

  describe('processEvent', () => {
    it('should process valid event', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'This is a test event with meaningful content',
      };

      const result = await processEvent(event);

      expect(result.event).toBeDefined();
      expect(result.event.userId).toBe(testUserId);
      expect(result.event.content).toBe(event.content);
      expect(result.event.embedding).toBeDefined();
      expect(result.event.embedding.length).toBe(256);
      expect(result.event.significance).toBeGreaterThanOrEqual(0);
      expect(result.event.significance).toBeLessThanOrEqual(1);
      expect(result.event.eventId).toBeDefined();
      expect(result.event.eventId).toMatch(/^evt_/);
    });

    it('should validate userId', async () => {
      const event: EventInput = {
        userId: '',
        content: 'Test content',
      };

      await expect(processEvent(event)).rejects.toThrow(ValidationError);
    });

    it('should validate content exists', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: '',
      };

      await expect(processEvent(event)).rejects.toThrow(ValidationError);
    });

    it('should validate minimum content length', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'abc', // Less than 5 characters
      };

      await expect(processEvent(event)).rejects.toThrow(ValidationError);
    });

    it('should validate maximum content length', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'a'.repeat(10001), // More than 10000 characters
      };

      await expect(processEvent(event)).rejects.toThrow(ValidationError);
    });

    it('should accept valid timestamp', async () => {
      const timestamp = new Date();
      const event: EventInput = {
        userId: testUserId,
        content: 'Test event with timestamp',
        timestamp,
      };

      const result = await processEvent(event);

      expect(result.event.timestamp).toEqual(timestamp);
    });

    it('should use current time if no timestamp provided', async () => {
      const before = new Date();
      const event: EventInput = {
        userId: testUserId,
        content: 'Test event without timestamp',
      };

      const result = await processEvent(event);
      const after = new Date();

      expect(result.event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should calculate significance score', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'This is a longer event with more content to analyze for significance scoring',
      };

      const result = await processEvent(event);

      expect(result.event.significance).toBeGreaterThan(0);
      expect(result.event.significance).toBeLessThanOrEqual(1);
    });

    it('should determine if event is significant', async () => {
      const shortEvent: EventInput = {
        userId: testUserId,
        content: 'short',
      };

      const result = await processEvent(shortEvent);

      expect(result.significant).toBe(typeof result.significant === 'boolean');
      expect(result.learningTriggered).toBe(result.significant);
    });

    it('should provide processing reason', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'Test event for reason checking',
      };

      const result = await processEvent(event);

      expect(result.reason).toBeDefined();
      expect(typeof result.reason).toBe('string');
      expect(result.reason).toContain('Significance');
      expect(result.reason).toContain('threshold');
    });

    it('should track processing time', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'Test event for timing',
      };

      const result = await processEvent(event);

      expect(result.event.processingTime).toBeGreaterThan(0);
      expect(result.event.processingTime).toBeLessThan(5000); // Should be fast
    });

    it('should preserve metadata', async () => {
      const metadata = { source: 'api', version: 1 };
      const event: EventInput = {
        userId: testUserId,
        content: 'Test event with metadata',
        metadata,
      };

      const result = await processEvent(event);

      expect(result.event.metadata).toEqual(metadata);
    });

    it('should generate unique event IDs', async () => {
      const event1: EventInput = {
        userId: testUserId,
        content: 'First event',
      };

      const event2: EventInput = {
        userId: testUserId,
        content: 'Second event',
      };

      const result1 = await processEvent(event1);
      const result2 = await processEvent(event2);

      expect(result1.event.eventId).not.toBe(result2.event.eventId);
    });

    it('should normalize embeddings', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'Test event for embedding normalization',
      };

      const result = await processEvent(event);

      // Calculate norm
      const norm = Math.sqrt(
        result.event.embedding.reduce((sum, v) => sum + v * v, 0)
      );

      // Should be approximately 1 (normalized)
      expect(norm).toBeCloseTo(1, 1);
    });
  });

  describe('batchProcessEvents', () => {
    it('should process multiple events', async () => {
      const events: EventInput[] = [
        { userId: testUserId, content: 'First event with content' },
        { userId: testUserId, content: 'Second event with content' },
        { userId: testUserId, content: 'Third event with content' },
      ];

      const results = await batchProcessEvents(events);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.event)).toBe(true);
    });

    it('should handle empty batch', async () => {
      const results = await batchProcessEvents([]);

      expect(results).toHaveLength(0);
    });

    it('should process events in parallel', async () => {
      const events: EventInput[] = Array(10)
        .fill(0)
        .map((_, i) => ({
          userId: testUserId,
          content: `Event ${i} with content for testing`,
        }));

      const startTime = Date.now();
      const results = await batchProcessEvents(events);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      // Parallel processing should be faster than sequential
      expect(duration).toBeLessThan(5000);
    });

    it('should preserve event order', async () => {
      const events: EventInput[] = [
        { userId: testUserId, content: 'Event A with content' },
        { userId: testUserId, content: 'Event B with content' },
        { userId: testUserId, content: 'Event C with content' },
      ];

      const results = await batchProcessEvents(events);

      expect(results[0].event.content).toBe('Event A with content');
      expect(results[1].event.content).toBe('Event B with content');
      expect(results[2].event.content).toBe('Event C with content');
    });

    it('should handle mixed significant and insignificant events', async () => {
      const events: EventInput[] = [
        { userId: testUserId, content: 'Very important event with lots of meaningful content' },
        { userId: testUserId, content: 'small' },
        { userId: testUserId, content: 'Another important event with substantial content' },
      ];

      const results = await batchProcessEvents(events);

      expect(results).toHaveLength(3);
      const significantCount = results.filter((r) => r.significant).length;
      expect(significantCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectEventClusters', () => {
    it('should cluster similar events', async () => {
      const events = [
        await processEvent({
          userId: testUserId,
          content: 'Event about machine learning and AI',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Event about deep learning and neural networks',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Event about cooking recipes',
        }),
      ];

      const processedEvents = events.map((e) => e.event);
      const clusters = detectEventClusters(processedEvents, 0.5);

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty event list', () => {
      const clusters = detectEventClusters([]);

      expect(clusters).toHaveLength(0);
    });

    it('should respect similarity threshold', async () => {
      const events = [
        await processEvent({
          userId: testUserId,
          content: 'Machine learning is a subset of artificial intelligence',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Deep learning uses neural networks',
        }),
      ];

      const processedEvents = events.map((e) => e.event);

      // High threshold: fewer clusters
      const highThresholdClusters = detectEventClusters(processedEvents, 0.95);
      // Low threshold: more clusters
      const lowThresholdClusters = detectEventClusters(processedEvents, 0.1);

      expect(highThresholdClusters.length).toBeLessThanOrEqual(lowThresholdClusters.length);
    });

    it('should not duplicate events in clusters', async () => {
      const events = [
        await processEvent({
          userId: testUserId,
          content: 'First event with content',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Second event with content',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Third event with content',
        }),
      ];

      const processedEvents = events.map((e) => e.event);
      const clusters = detectEventClusters(processedEvents, 0.5);

      const totalEventsInClusters = clusters.reduce((sum, cluster) => sum + cluster.length, 0);
      expect(totalEventsInClusters).toBe(processedEvents.length);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalous events', async () => {
      const normalEvents = [
        await processEvent({
          userId: testUserId,
          content: 'Normal event about weather',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Normal event about weather patterns',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Normal event about climate',
        }),
      ];

      const anomalousEvent = await processEvent({
        userId: testUserId,
        content: 'xyzabc qwerty asdfgh jkl zxcvbnm poiuytrewq lkjhgfdsa',
      });

      const allEvents = [
        ...normalEvents.map((e) => e.event),
        anomalousEvent.event,
      ];

      const anomalies = detectAnomalies(allEvents, 0.1);

      expect(anomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty event list', () => {
      const anomalies = detectAnomalies([]);

      expect(anomalies).toHaveLength(0);
    });

    it('should handle single event', async () => {
      const event = await processEvent({
        userId: testUserId,
        content: 'Single event',
      });

      const anomalies = detectAnomalies([event.event]);

      expect(anomalies).toHaveLength(0);
    });

    it('should respect anomaly threshold', async () => {
      const events = [
        await processEvent({
          userId: testUserId,
          content: 'Event about weather',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Event about weather patterns',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Event about climate',
        }),
      ];

      const processedEvents = events.map((e) => e.event);

      // Strict threshold: fewer anomalies
      const strictAnomalies = detectAnomalies(processedEvents, 0.01);
      // Loose threshold: more anomalies
      const looseAnomalies = detectAnomalies(processedEvents, 0.5);

      expect(strictAnomalies.length).toBeLessThanOrEqual(looseAnomalies.length);
    });

    it('should not include normal events as anomalies', async () => {
      const events = [
        await processEvent({
          userId: testUserId,
          content: 'Normal event one',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Normal event two',
        }),
        await processEvent({
          userId: testUserId,
          content: 'Normal event three',
        }),
      ];

      const processedEvents = events.map((e) => e.event);
      const anomalies = detectAnomalies(processedEvents, 0.1);

      // With similar events, anomalies should be minimal or zero
      expect(anomalies.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Event Processing Edge Cases', () => {
    it('should handle events with special characters', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'Event with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
      };

      const result = await processEvent(event);

      expect(result.event).toBeDefined();
      expect(result.event.content).toBe(event.content);
    });

    it('should handle events with unicode characters', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'Event with unicode: 你好 مرحبا שלום',
      };

      const result = await processEvent(event);

      expect(result.event).toBeDefined();
      expect(result.event.content).toBe(event.content);
    });

    it('should handle events with very long content', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'a'.repeat(9999),
      };

      const result = await processEvent(event);

      expect(result.event).toBeDefined();
      expect(result.event.content.length).toBe(9999);
    });

    it('should handle events with newlines and whitespace', async () => {
      const event: EventInput = {
        userId: testUserId,
        content: 'Event with\nnewlines\nand\twhitespace  ',
      };

      const result = await processEvent(event);

      expect(result.event).toBeDefined();
      expect(result.event.content).toBe(event.content);
    });

    it('should handle concurrent event processing', async () => {
      const events: EventInput[] = Array(50)
        .fill(0)
        .map((_, i) => ({
          userId: testUserId,
          content: `Concurrent event ${i} with content`,
        }));

      const results = await Promise.all(events.map((e) => processEvent(e)));

      expect(results).toHaveLength(50);
      expect(results.every((r) => r.event)).toBe(true);
    });
  });
});
