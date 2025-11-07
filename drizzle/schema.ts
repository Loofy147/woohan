import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Memory States - Stores the current and historical memory states for each user.
 */
export const memoryStates = mysqlTable("memoryStates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // LSTM hidden state and cell state (serialized as JSON)
  hiddenState: json("hiddenState").notNull(),
  cellState: json("cellState").notNull(),
  
  // Memory metadata
  memorySize: int("memorySize").notNull(),
  lastUpdateTime: timestamp("lastUpdateTime").defaultNow().notNull(),
  eventCount: int("eventCount").default(0).notNull(),
  significantEvents: int("significantEvents").default(0).notNull(),
  
  // Time decay factor for memory consolidation
  timeDecayFactor: decimal("timeDecayFactor", { precision: 5, scale: 4 }).default("0.99").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MemoryState = typeof memoryStates.$inferSelect;
export type InsertMemoryState = typeof memoryStates.$inferInsert;

/**
 * Events - Stores all events submitted to the system.
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Event content and metadata
  eventText: text("eventText").notNull(),
  eventType: mysqlEnum("eventType", ["interaction", "observation", "learning", "milestone"]).default("interaction").notNull(),
  metadata: json("metadata"),
  
  // Significance scoring
  significanceScore: decimal("significanceScore", { precision: 5, scale: 4 }).notNull(),
  thresholdValue: decimal("thresholdValue", { precision: 5, scale: 4 }).notNull(),
  triggered: boolean("triggered").default(false).notNull(),
  
  // Semantic analysis
  semanticEmbedding: json("semanticEmbedding"), // Hugging Face embedding
  semanticCluster: int("semanticCluster"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Identity Embeddings - Stores secure identity encodings for each user.
 */
export const identityEmbeddings = mysqlTable("identityEmbeddings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Embedding data (serialized as JSON)
  embedding: json("embedding").notNull(),
  embeddingSize: int("embeddingSize").notNull(),
  
  // Privacy metadata
  dpEnabled: boolean("dpEnabled").default(true).notNull(),
  epsilonBudget: decimal("epsilonBudget", { precision: 5, scale: 4 }).default("1.0").notNull(),
  deltaBudget: decimal("deltaBudget", { precision: 10, scale: 8 }).default("0.00001").notNull(),
  consumedEpsilon: decimal("consumedEpsilon", { precision: 5, scale: 4 }).default("0.0").notNull(),
  
  // Robustness metrics
  robustness: decimal("robustness", { precision: 5, scale: 4 }).default("0.95").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IdentityEmbedding = typeof identityEmbeddings.$inferSelect;
export type InsertIdentityEmbedding = typeof identityEmbeddings.$inferInsert;

/**
 * Learning Metrics - Tracks learning performance and convergence.
 */
export const learningMetrics = mysqlTable("learningMetrics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Event statistics
  totalEvents: int("totalEvents").default(0).notNull(),
  triggeredUpdates: int("triggeredUpdates").default(0).notNull(),
  
  // Loss and convergence
  totalLoss: decimal("totalLoss", { precision: 10, scale: 6 }).default("0.0").notNull(),
  averageLoss: decimal("averageLoss", { precision: 10, scale: 6 }).default("0.0").notNull(),
  updateRate: decimal("updateRate", { precision: 5, scale: 4 }).default("0.0").notNull(),
  
  // Learning parameters
  learningRate: decimal("learningRate", { precision: 5, scale: 4 }).default("0.001").notNull(),
  gradientClipNorm: decimal("gradientClipNorm", { precision: 5, scale: 4 }).default("1.0").notNull(),
  
  // Threshold adaptation
  currentThreshold: decimal("currentThreshold", { precision: 5, scale: 4 }).default("0.5").notNull(),
  thresholdAlpha: decimal("thresholdAlpha", { precision: 5, scale: 4 }).default("0.1").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningMetric = typeof learningMetrics.$inferSelect;
export type InsertLearningMetric = typeof learningMetrics.$inferInsert;

/**
 * Event Clusters - Stores semantic clusters of events from Hugging Face analysis.
 */
export const eventClusters = mysqlTable("eventClusters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Cluster metadata
  clusterId: int("clusterId").notNull(),
  clusterSize: int("clusterSize").default(0).notNull(),
  
  // Semantic information
  centroid: json("centroid"), // Centroid embedding of the cluster
  averageSimilarity: decimal("averageSimilarity", { precision: 5, scale: 4 }).notNull(),
  diversity: decimal("diversity", { precision: 5, scale: 4 }).notNull(),
  
  // Event IDs in this cluster (stored as JSON array)
  eventIds: json("eventIds").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventCluster = typeof eventClusters.$inferSelect;
export type InsertEventCluster = typeof eventClusters.$inferInsert;

/**
 * Privacy Audit Log - Tracks privacy-sensitive operations for compliance.
 */
export const privacyAuditLog = mysqlTable("privacyAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Operation details
  operation: varchar("operation", { length: 64 }).notNull(), // e.g., "identity_encoding", "memory_query"
  operationType: mysqlEnum("operationType", ["read", "write", "delete", "compute"]).notNull(),
  
  // Privacy impact
  epsilonConsumed: decimal("epsilonConsumed", { precision: 5, scale: 4 }).default("0.0").notNull(),
  dataAccessed: varchar("dataAccessed", { length: 256 }), // Description of data accessed
  
  // Compliance info
  dpEnabled: boolean("dpEnabled").default(true).notNull(),
  noiseAdded: boolean("noiseAdded").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PrivacyAuditLog = typeof privacyAuditLog.$inferSelect;
export type InsertPrivacyAuditLog = typeof privacyAuditLog.$inferInsert;
