CREATE TABLE `eventClusters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clusterId` int NOT NULL,
	`clusterSize` int NOT NULL DEFAULT 0,
	`centroid` json,
	`averageSimilarity` decimal(5,4) NOT NULL,
	`diversity` decimal(5,4) NOT NULL,
	`eventIds` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventClusters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventText` text NOT NULL,
	`eventType` enum('interaction','observation','learning','milestone') NOT NULL DEFAULT 'interaction',
	`metadata` json,
	`significanceScore` decimal(5,4) NOT NULL,
	`thresholdValue` decimal(5,4) NOT NULL,
	`triggered` boolean NOT NULL DEFAULT false,
	`semanticEmbedding` json,
	`semanticCluster` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `identityEmbeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`embedding` json NOT NULL,
	`embeddingSize` int NOT NULL,
	`dpEnabled` boolean NOT NULL DEFAULT true,
	`epsilonBudget` decimal(5,4) NOT NULL DEFAULT '1.0',
	`deltaBudget` decimal(10,8) NOT NULL DEFAULT '0.00001',
	`consumedEpsilon` decimal(5,4) NOT NULL DEFAULT '0.0',
	`robustness` decimal(5,4) NOT NULL DEFAULT '0.95',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `identityEmbeddings_id` PRIMARY KEY(`id`),
	CONSTRAINT `identityEmbeddings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `learningMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalEvents` int NOT NULL DEFAULT 0,
	`triggeredUpdates` int NOT NULL DEFAULT 0,
	`totalLoss` decimal(10,6) NOT NULL DEFAULT '0.0',
	`averageLoss` decimal(10,6) NOT NULL DEFAULT '0.0',
	`updateRate` decimal(5,4) NOT NULL DEFAULT '0.0',
	`learningRate` decimal(5,4) NOT NULL DEFAULT '0.001',
	`gradientClipNorm` decimal(5,4) NOT NULL DEFAULT '1.0',
	`currentThreshold` decimal(5,4) NOT NULL DEFAULT '0.5',
	`thresholdAlpha` decimal(5,4) NOT NULL DEFAULT '0.1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memoryStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hiddenState` json NOT NULL,
	`cellState` json NOT NULL,
	`memorySize` int NOT NULL,
	`lastUpdateTime` timestamp NOT NULL DEFAULT (now()),
	`eventCount` int NOT NULL DEFAULT 0,
	`significantEvents` int NOT NULL DEFAULT 0,
	`timeDecayFactor` decimal(5,4) NOT NULL DEFAULT '0.99',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memoryStates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `privacyAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`operation` varchar(64) NOT NULL,
	`operationType` enum('read','write','delete','compute') NOT NULL,
	`epsilonConsumed` decimal(5,4) NOT NULL DEFAULT '0.0',
	`dataAccessed` varchar(256),
	`dpEnabled` boolean NOT NULL DEFAULT true,
	`noiseAdded` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `privacyAuditLog_id` PRIMARY KEY(`id`)
);
