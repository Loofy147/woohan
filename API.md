# WOOHAN API Documentation

Complete reference for all tRPC procedures available in the WOOHAN system.

## Overview

WOOHAN provides a type-safe API through tRPC with end-to-end type safety. All procedures are organized into logical routers: `memory`, `identity`, `semantic`, `learning`, and `privacy`.

## Authentication

All procedures (except `auth.me` and `auth.logout`) require authentication. The system uses Manus OAuth for user authentication.

```typescript
import { useAuth } from "@/_core/hooks/useAuth";

const { user, isAuthenticated } = useAuth();
```

## Memory Router

### memory.submitEvent

Submit an event to the memory system for processing.

**Input:**
```typescript
{
  eventText: string;           // Description of the event
  eventType?: "interaction" | "observation" | "learning" | "milestone";
  metadata?: Record<string, any>;  // Additional context
}
```

**Output:**
```typescript
{
  success: boolean;
  eventId: string;
  processed: boolean;
  message: string;
}
```

**Example:**
```typescript
const { mutate } = trpc.memory.submitEvent.useMutation();

mutate({
  eventText: "User completed training module on neural networks",
  eventType: "learning",
  metadata: { duration: 3600, score: 95, module: "NN-101" }
});
```

### memory.getMemoryState

Retrieve the current memory state for the authenticated user.

**Input:** None

**Output:**
```typescript
{
  userId: number;
  memorySize: number;          // Dimension of memory vector
  lastUpdate: Date;
  eventCount: number;          // Total events processed
  significantEvents: number;   // Events that triggered updates
}
```

**Example:**
```typescript
const { data, isLoading } = trpc.memory.getMemoryState.useQuery();
```

### memory.getMemoryStats

Get detailed learning metrics and statistics.

**Input:** None

**Output:**
```typescript
{
  totalEvents: number;
  triggeredUpdates: number;
  averageLoss: number;
  updateRate: number;
  thresholdHistory: number[];
}
```

### memory.resetMemory

Reset the user's memory state (amnesia operation).

**Input:** None

**Output:**
```typescript
{
  success: boolean;
  message: string;
}
```

### memory.forceMemoryUpdate

Force a memory update regardless of significance threshold.

**Input:**
```typescript
{
  eventText: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  updateId: string;
  loss: number;
}
```

---

## Identity Router

### identity.encodeIdentity

Create or update user identity encoding with privacy preservation.

**Input:**
```typescript
{
  properties: Record<string, string>;  // User properties
  sensitiveFields?: string[];          // Fields containing PII
}
```

**Output:**
```typescript
{
  success: boolean;
  embeddingId: string;
  embeddingSize: number;
  privacyBudget: {
    epsilon: number;
    delta: number;
    consumed: number;
  };
}
```

**Example:**
```typescript
const { mutate } = trpc.identity.encodeIdentity.useMutation();

mutate({
  properties: {
    name: "Alice Johnson",
    role: "researcher",
    department: "AI Lab",
    experience: "5 years"
  },
  sensitiveFields: ["name", "email"]
});
```

### identity.getIdentityEmbedding

Retrieve the user's current identity embedding.

**Input:** None

**Output:**
```typescript
{
  userId: number;
  embeddingSize: number;
  robustness: number;          // 0-1 robustness score
  createdAt: Date;
}
```

### identity.computeIdentitySimilarity

Compute semantic similarity between two user identities.

**Input:**
```typescript
{
  otherUserId: string;
}
```

**Output:**
```typescript
{
  similarity: number;          // 0-1 similarity score
  userId1: number;
  userId2: number;
}
```

---

## Semantic Router

### semantic.analyzeEventSimilarity

Analyze semantic similarity between two events using Hugging Face embeddings.

**Input:**
```typescript
{
  event1: string;
  event2: string;
}
```

**Output:**
```typescript
{
  event1: string;
  event2: string;
  similarity: number;          // 0-1 similarity score
  interpretation: string;      // Human-readable interpretation
}
```

**Example:**
```typescript
const { mutate } = trpc.semantic.analyzeEventSimilarity.useMutation();

mutate({
  event1: "User completed task A successfully",
  event2: "User finished assignment A with high score"
});
// Returns: { similarity: 0.92, interpretation: "Events are semantically similar" }
```

### semantic.clusterEvents

Cluster events by semantic similarity.

**Input:**
```typescript
{
  events: string[];
  threshold?: number;          // Default: 0.7
}
```

**Output:**
```typescript
{
  clusterCount: number;
  clusters: Array<{
    id: number;
    events: string[];
  }>;
}
```

### semantic.findSimilarEvents

Find similar events from a pool.

**Input:**
```typescript
{
  queryEvent: string;
  eventPool: string[];
  topK?: number;               // Default: 5
}
```

**Output:**
```typescript
{
  queryEvent: string;
  results: Array<{
    event: string;
    similarity: number;
  }>;
}
```

---

## Learning Router

### learning.getLearningMetrics

Get current learning performance metrics.

**Input:** None

**Output:**
```typescript
{
  userId: number;
  totalEvents: number;
  triggeredUpdates: number;
  averageLoss: number;
  updateRate: number;
  learningRate: number;
}
```

### learning.adjustLearningParams

Adjust learning parameters for the user's system.

**Input:**
```typescript
{
  learningRate?: number;       // AdamW learning rate
  thresholdAlpha?: number;     // Threshold adaptation rate
  gradientClipNorm?: number;   // Gradient clipping threshold
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
  appliedParams: Record<string, number>;
}
```

### learning.forceMemoryUpdate

Force a memory update with custom event.

**Input:**
```typescript
{
  eventText: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  updateId: string;
  loss: number;
}
```

---

## Privacy Router

### privacy.getPrivacyReport

Get comprehensive privacy budget and compliance report.

**Input:** None

**Output:**
```typescript
{
  userId: number;
  epsilonBudget: number;
  deltaBudget: number;
  consumedEpsilon: number;
  remainingEpsilon: number;
  queriesPerformed: number;
  dpEnabled: boolean;
}
```

**Example:**
```typescript
const { data } = trpc.privacy.getPrivacyReport.useQuery();

// Monitor privacy budget
if (data.remainingEpsilon < 0.2) {
  console.warn("Privacy budget running low!");
}
```

### privacy.verifyPrivacyCompliance

Verify that the system maintains privacy compliance.

**Input:** None

**Output:**
```typescript
{
  compliant: boolean;
  epsilon: number;
  delta: number;
  message: string;
}
```

---

## Auth Router

### auth.me

Get current authenticated user information.

**Input:** None

**Output:**
```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  createdAt: Date;
} | null
```

### auth.logout

Logout the current user.

**Input:** None

**Output:**
```typescript
{
  success: boolean;
}
```

---

## Error Handling

All procedures return errors in a consistent format:

```typescript
{
  code: string;           // Error code (e.g., "UNAUTHORIZED", "BAD_REQUEST")
  message: string;        // Human-readable error message
  cause?: unknown;        // Underlying error cause
}
```

**Example:**
```typescript
const { mutate } = trpc.memory.submitEvent.useMutation({
  onError: (error) => {
    console.error(`Error: ${error.message}`);
    if (error.data?.code === "UNAUTHORIZED") {
      // Handle authentication error
    }
  }
});
```

---

## Rate Limiting

API procedures are rate-limited to prevent abuse:

- **Event Submission:** 100 events per minute per user
- **Query Operations:** 1000 queries per minute per user
- **Mutation Operations:** 500 mutations per minute per user

Rate limit information is included in response headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Pagination

List operations support pagination:

```typescript
{
  page?: number;        // Page number (1-indexed)
  pageSize?: number;    // Items per page (default: 20, max: 100)
}
```

---

## Sorting

Many list operations support sorting:

```typescript
{
  sortBy?: string;      // Field to sort by
  sortOrder?: "asc" | "desc";  // Sort direction
}
```

---

## Filtering

Query operations support filtering:

```typescript
{
  filter?: {
    eventType?: string;
    dateRange?: { start: Date; end: Date };
    significance?: { min: number; max: number };
  };
}
```

---

## Subscriptions (WebSocket)

Real-time updates are available through WebSocket subscriptions:

```typescript
// Subscribe to memory state changes
trpc.memory.onStateChange.subscribe(
  { userId: currentUser.id },
  {
    onData: (data) => {
      console.log("Memory updated:", data);
    },
    onError: (error) => {
      console.error("Subscription error:", error);
    }
  }
);
```

---

## Batch Operations

For bulk operations, use batch endpoints:

```typescript
// Submit multiple events at once
const { mutate } = trpc.memory.submitEventBatch.useMutation();

mutate({
  events: [
    { eventText: "Event 1", eventType: "interaction" },
    { eventText: "Event 2", eventType: "learning" }
  ]
});
```

---

## Versioning

The API uses semantic versioning. Current version: **v1.0.0**

Breaking changes will increment the major version. Minor updates are backward compatible.

---

## Support

For API issues or questions:
- Check the [README](./README.md)
- Review the [Technical Whitepaper](./WHITEPAPER.md)
- Open an issue on GitHub
- Contact the development team

---

**WOOHAN API Documentation** © 2025 | Manus AI
