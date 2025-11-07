# WOOHAN Project Overview

## Project Purpose
WOOHAN (Workflow-Optimized Heuristic Adaptive Network) is a foundational AI framework for:
- Dynamic memory with LSTM-based state evolution
- Event-driven continuous learning with adaptive thresholds
- Secure identity encoding with differential privacy
- Semantic understanding via Hugging Face transformers

## Tech Stack
### Frontend
- React 19 with TypeScript
- Tailwind CSS 4 for styling
- shadcn/ui component library
- Wouter for routing
- tRPC for type-safe API calls

### Backend
- Express 4 with Node.js
- tRPC 11 for RPC procedures
- Drizzle ORM with MySQL/TiDB
- PyTorch for ML models (Python)
- Hugging Face transformers for NLP

### Database
- MySQL/TiDB (primary)
- Drizzle migrations
- 7 tables: users, memoryStates, events, identityEmbeddings, learningMetrics, eventClusters, privacyAuditLog

### AI/ML Components
- Dynamic Memory Model (DMM): LSTM with time-decay
- Event-Driven Continuous Learning (EDCL): Adaptive learning engine
- Secure Identity Encoding (SIE): Privacy-preserving embeddings
- Hugging Face Integration: Semantic analysis and embeddings

## Code Structure
```
client/          - React frontend
  src/
    pages/       - Page components
    components/  - Reusable UI components
    lib/         - Utilities (tRPC client)
    contexts/    - React contexts
server/          - Express backend
  woohan/        - Python ML modules
  routers.ts     - tRPC procedures
  db.ts          - Database queries
drizzle/         - Database schema and migrations
shared/          - Shared types and constants
```
