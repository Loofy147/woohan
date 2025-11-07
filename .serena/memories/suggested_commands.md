# WOOHAN Development Commands

## Project Setup
```bash
pnpm install          # Install dependencies
pnpm db:push          # Push database schema changes
pnpm dev              # Start dev server
```

## Development
```bash
pnpm dev              # Start development server (frontend + backend)
pnpm build            # Build for production
pnpm preview          # Preview production build
```

## Database
```bash
pnpm db:push          # Generate and apply migrations (drizzle-kit generate & migrate)
pnpm db:studio        # Open Drizzle Studio for database inspection
```

## Code Quality
```bash
pnpm lint             # Run linting
pnpm format           # Format code with Prettier
pnpm type-check       # Check TypeScript types
```

## Testing
```bash
pnpm test             # Run tests with Vitest
pnpm test:watch       # Run tests in watch mode
```

## Python/ML Development
```bash
python3 -m pip install torch transformers sentence-transformers
python3 server/woohan/dmm.py  # Test Dynamic Memory Model
python3 server/woohan/edcl.py # Test Event-Driven Learning
python3 server/woohan/sie.py  # Test Identity Encoding
```

## MCP Tools
```bash
manus-mcp-cli tool list --server serena              # List Serena tools
manus-mcp-cli tool list --server sentry              # List Sentry tools
manus-mcp-cli tool list --server minimax             # List MiniMax tools
manus-mcp-cli tool list --server prisma-postgres     # List Prisma tools
```

## Git Workflow
```bash
git add .             # Stage changes
git commit -m "msg"   # Commit with message
git push              # Push to remote
```
