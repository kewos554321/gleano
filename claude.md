# Gleano - Claude Code Guidelines

## Project Overview
Gleano is a Chrome extension that captures subtitles from YouTube/Netflix and generates personalized language learning content using AI (Gemini).

## Architecture
- **extension/**: Chrome extension (React + Vite + TailwindCSS)
- **worker/**: Cloudflare Worker backend (Hono + D1 + KV)
- **shared/**: Shared TypeScript types

## Testing Requirements

### Coverage Target
**Test coverage must be 100%** for all code changes.

### Test Framework
- Use **Vitest** for unit testing
- Use **@cloudflare/vitest-pool-workers** for Worker testing

### Test Structure
```
worker/
  src/
    __tests__/
      routes/
        analyze.test.ts
        user.test.ts
        history.test.ts
      services/
        ai.test.ts
      index.test.ts

extension/
  src/
    __tests__/
      background/
        index.test.ts
      content/
        youtube.test.ts
        netflix.test.ts
      components/
        *.test.tsx
```

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

### Before Committing
1. Run `pnpm test` to ensure all tests pass
2. Run `pnpm test:coverage` to verify 100% coverage
3. Fix any failing tests or coverage gaps before committing

## Code Style
- Use TypeScript strict mode
- Prefer functional components in React
- Use async/await over Promises
- Add JSDoc comments for public APIs
