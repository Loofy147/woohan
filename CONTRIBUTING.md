# Contributing to WOOHAN

Thank you for your interest in contributing to WOOHAN! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting Started

### 1. Fork the Repository

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/woohan.git
cd woohan

# Add upstream remote
git remote add upstream https://github.com/woohan/woohan.git
```

### 2. Create a Feature Branch

```bash
# Update from upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 3. Set Up Development Environment

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local

# Start development server
pnpm dev
```

## Development Workflow

### Code Style

We follow strict code style guidelines to maintain consistency:

**TypeScript:**
- Use strict mode: `"strict": true` in `tsconfig.json`
- Use explicit type annotations
- Avoid `any` type
- Use meaningful variable names

**Python:**
- Follow PEP 8 style guide
- Use type hints for all functions
- Maximum line length: 100 characters
- Use docstrings for all modules and functions

**Formatting:**
```bash
# Format code
pnpm format

# Lint code
pnpm lint

# Type check
pnpm type-check
```

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples:**
```
feat(memory): add time-decay consolidation to DMM
fix(api): handle null events in significance scoring
docs(readme): update installation instructions
test(edcl): add unit tests for threshold adaptation
```

### Testing

Write tests for all new features:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

**Test Structure:**
```typescript
describe('Dynamic Memory Model', () => {
  it('should update memory state with LSTM', () => {
    // Arrange
    const dmm = new DynamicMemoryModel();
    const event = { text: 'test', type: 'interaction' };

    // Act
    const result = dmm.update(event);

    // Assert
    expect(result.success).toBe(true);
    expect(result.memorySize).toBe(256);
  });
});
```

## Feature Development

### Adding a New Feature

1. **Create an Issue** — Discuss the feature in an issue first
2. **Design Document** — For major features, create a design document
3. **Implementation** — Implement the feature with tests
4. **Documentation** — Update relevant documentation
5. **Pull Request** — Submit a PR with a clear description

### Database Schema Changes

For database schema modifications:

```typescript
// 1. Update schema in drizzle/schema.ts
export const newTable = mysqlTable('new_table', {
  id: int('id').autoincrement().primaryKey(),
  // ... columns
});

// 2. Create migration
pnpm db:push

// 3. Update db.ts with query helpers
export async function getNewTableData() {
  const db = await getDb();
  return db.select().from(newTable);
}

// 4. Create tRPC procedure
export const appRouter = router({
  newFeature: router({
    getData: publicProcedure.query(({ ctx }) =>
      db.getNewTableData()
    ),
  }),
});
```

### API Endpoint Development

When adding new tRPC procedures:

```typescript
// 1. Define input/output types
const InputSchema = z.object({
  eventText: z.string().min(1),
  eventType: z.enum(['interaction', 'learning']),
});

// 2. Create procedure
export const appRouter = router({
  feature: router({
    create: protectedProcedure
      .input(InputSchema)
      .mutation(async ({ ctx, input }) => {
        // Implementation
        return { success: true };
      }),
  }),
});

// 3. Add to API documentation
// 4. Add frontend integration test
```

### Frontend Component Development

When creating new React components:

```typescript
// 1. Create component in client/src/components/
import { FC } from 'react';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
};

// 2. Add to component showcase
// 3. Write tests
// 4. Document usage
```

## Pull Request Process

### Before Submitting

1. **Update from upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests:**
   ```bash
   pnpm test
   pnpm lint
   pnpm type-check
   ```

3. **Build the project:**
   ```bash
   pnpm build
   ```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Fixes #(issue number)

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated Checks** — GitHub Actions runs tests and linting
2. **Code Review** — Maintainers review the code
3. **Feedback** — Address any requested changes
4. **Approval** — PR is approved and merged

## Reporting Issues

### Bug Reports

Include the following information:

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Ubuntu 22.04]
- Node version: [e.g., 22.13.0]
- Python version: [e.g., 3.11]

## Logs
```
Paste relevant logs here
```
```

### Feature Requests

```markdown
## Description
Clear description of the feature

## Motivation
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches considered
```

## Documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add diagrams where helpful
- Keep documentation up-to-date

### Documentation Structure

```markdown
# Feature Name

## Overview
Brief overview

## Use Cases
When to use this feature

## Installation
How to set up

## Usage
How to use with examples

## Configuration
Available options

## Troubleshooting
Common issues and solutions

## References
Links to related docs
```

## Performance Considerations

When contributing code, consider:

- **Time Complexity** — Use efficient algorithms
- **Space Complexity** — Minimize memory usage
- **Database Queries** — Avoid N+1 queries
- **API Responses** — Keep payloads small
- **Frontend Performance** — Minimize re-renders

### Performance Checklist

- [ ] No unnecessary database queries
- [ ] Proper indexing on database tables
- [ ] Efficient algorithms (O(n log n) or better)
- [ ] Caching where appropriate
- [ ] Lazy loading for large datasets
- [ ] Minified assets in production

## Security Guidelines

### Security Checklist

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use ORM)
- [ ] XSS prevention (sanitize output)
- [ ] CSRF protection enabled
- [ ] Authentication required for protected routes
- [ ] Rate limiting implemented
- [ ] Secrets not committed to repository
- [ ] Dependencies kept up-to-date

### Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email security@woohan.dev with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Release Process

### Version Numbering

We follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes

### Release Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run full test suite
- [ ] Build production bundle
- [ ] Tag release in Git
- [ ] Create GitHub release
- [ ] Update documentation

## Community

### Getting Help

- **Discussions:** GitHub Discussions for questions
- **Issues:** GitHub Issues for bugs and features
- **Discord:** Join our community Discord server
- **Email:** contact@woohan.dev

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must follow our Code of Conduct.

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- GitHub contributors page
- Release notes
- Project website

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Technical Whitepaper](./WHITEPAPER.md)

---

**Thank you for contributing to WOOHAN!** 🚀

---

**WOOHAN Contributing Guide** © 2025 | Manus AI
