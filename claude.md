# Gleano - Claude Code Guidelines

## Project Overview
Gleano is a Chrome extension that captures subtitles from YouTube/Netflix and generates personalized language learning content using AI (Gemini).

## Architecture
- **extension/**: Chrome extension (React + Vite + TailwindCSS)
- **worker/**: Cloudflare Worker backend (Hono + D1 + KV)
- **shared/**: Shared TypeScript types

## Testing Requirements

### Coverage Target
- **Extension**: 95% statements, 90% branches
- **Worker**: 85% statements, 60% branches

### Test Framework
- Use **Vitest** for unit testing
- Use **@cloudflare/vitest-pool-workers** for Worker testing
- Use **@vitest/coverage-istanbul** for Worker coverage (v8 not compatible)

### Test Structure
```
worker/
  test/
    routes/
      analyze.test.ts
      user.test.ts
      history.test.ts
    services/
      ai.test.ts
    index.test.ts
    setup.ts

extension/
  test/
    background/
      index.test.ts
    content/
      youtube.test.ts
      netflix.test.ts
      speech.test.ts
    components/
      PopupApp.test.tsx
      tabs.test.tsx
    sidepanel/
      App.test.tsx
    setup.ts
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
2. Run `pnpm test:coverage` to verify coverage meets thresholds
3. Run `pnpm lint` to ensure code style compliance
4. Run `pnpm typecheck` to ensure no TypeScript errors
5. Fix any failing tests, coverage gaps, or lint/type errors before committing

## Linting & Type Checking

### ESLint
- Use ESLint for code quality and style enforcement
- All code must pass lint checks with zero errors

### TypeScript
- Use TypeScript strict mode
- All code must pass type checking with zero errors
- No `any` types unless absolutely necessary

### Running Checks
```bash
# Run lint check
pnpm lint

# Run TypeScript check
pnpm typecheck

# Fix auto-fixable lint issues
pnpm lint:fix
```

## Code Style
- Use TypeScript strict mode
- Prefer functional components in React
- Use async/await over Promises
- Add JSDoc comments for public APIs
- Use meaningful variable and function names
- Keep functions small and focused
