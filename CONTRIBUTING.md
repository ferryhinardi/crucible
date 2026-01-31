# Contributing to Crucible

Thank you for your interest in contributing to Crucible! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Commit Messages](#commit-messages)

---

## Development Setup

### Prerequisites

- **Node.js** 18.x or higher (see `.nvmrc` for exact version)
- **pnpm** 8.x or higher

### Getting Started

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/your-username/crucible.git
   cd crucible
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Build all packages:**

   ```bash
   pnpm build
   ```

4. **Run tests to verify setup:**

   ```bash
   npx vitest run
   ```

---

## Project Structure

Crucible is a monorepo managed with pnpm workspaces and Turborepo:

```
crucible/
├── packages/
│   ├── core/                    # Core client, types, errors, logger
│   │   └── src/
│   │       └── index.ts
│   ├── react/                   # React hooks and providers
│   │   └── src/
│   │       ├── index.tsx        # Client-side hooks (useFlag, FlagProvider)
│   │       └── server.ts        # Server Components support (getFlag, etc.)
│   └── adapters/
│       ├── local/               # Local/testing adapter
│       ├── launchdarkly/        # LaunchDarkly integration
│       └── posthog/             # PostHog integration
├── examples/
│   └── nextjs/                  # Next.js example app
├── docs/                        # Documentation
└── turbo.json                   # Turborepo configuration
```

### Package Descriptions

| Package                          | npm Name                        | Description                                            |
| -------------------------------- | ------------------------------- | ------------------------------------------------------ |
| `packages/core`                  | `crucible-core`                 | Core client, type definitions, error types, logger     |
| `packages/react`                 | `crucible-react`                | React hooks (`useFlag`, `useFlags`) and `FlagProvider` |
| `packages/adapters/local`        | `crucible-adapter-local`        | Local adapter for testing and development              |
| `packages/adapters/launchdarkly` | `crucible-adapter-launchdarkly` | LaunchDarkly integration                               |
| `packages/adapters/posthog`      | `crucible-adapter-posthog`      | PostHog integration                                    |

---

## Development Workflow

### Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests (non-watch mode)
npx vitest run

# Run tests in watch mode
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Fix lint issues
pnpm lint --fix

# Development mode (watch)
pnpm dev
```

### Building a Specific Package

```bash
# Build only core
pnpm --filter crucible-core build

# Build only react
pnpm --filter crucible-react build
```

### Running Tests for a Specific Package

```bash
npx vitest run packages/core
npx vitest run packages/react
```

---

## Code Style

### TypeScript

- Use TypeScript for all source code
- Enable strict mode
- Prefer explicit types over `any`
- Use `as const` assertions for literal types

### Formatting

- We use ESLint with a flat config (`eslint.config.js`)
- Run `pnpm lint --fix` before committing
- Pre-commit hooks will run linting automatically

### Documentation

- Add JSDoc comments to all public exports
- Include `@example` blocks for complex APIs
- Document parameters with `@param` tags

Example:

````typescript
/**
 * Evaluates a feature flag and returns its variant.
 *
 * @template K - The flag key type
 * @param key - The flag key to evaluate
 * @param defaultValue - Fallback value if evaluation fails
 * @returns The flag variant
 *
 * @example
 * ```tsx
 * const variant = useFlag('checkout-redesign', 'control');
 * ```
 */
export function useFlag<K extends keyof T>(
  key: K,
  defaultValue: InferVariant<T[K]>
): InferVariant<T[K]> {
  // ...
}
````

---

## Testing

### Running Tests

```bash
# Run all tests (recommended for CI)
npx vitest run

# Watch mode for development
pnpm test

# Run with coverage
npx vitest run --coverage
```

### Writing Tests

- Place test files next to source files with `.test.ts` or `.test.tsx` extension
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

Example:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createFlagClient } from './index';

describe('createFlagClient', () => {
  it('should initialize with adapter', async () => {
    const mockAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('variant-a'),
    };

    const client = createFlagClient({
      adapter: mockAdapter,
      schema: { 'test-flag': ['control', 'variant-a'] },
    });

    await client.initialize();
    expect(mockAdapter.initialize).toHaveBeenCalled();
  });
});
```

---

## Pull Request Process

### Before Submitting

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Add/update tests** for your changes

4. **Run the full test suite:**

   ```bash
   npx vitest run
   pnpm typecheck
   pnpm lint
   ```

5. **Create a changeset** (for version bumps):

   ```bash
   npx changeset
   ```

### Submitting

1. Push your branch to your fork
2. Open a Pull Request against `main`
3. Fill out the PR template
4. Wait for CI checks to pass
5. Address any review feedback

### PR Requirements

- All CI checks must pass
- Tests must cover new functionality
- Documentation must be updated if needed
- Changesets required for user-facing changes

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(core): add custom error types for better debugging
fix(react): resolve hydration mismatch in useFlag hook
docs(readme): update installation instructions for pnpm
test(adapters): add integration tests for PostHog adapter
chore(deps): update vitest to v3.x
```

---

## Creating a New Adapter

To create a new adapter:

1. **Create the package directory:**

   ```bash
   mkdir -p packages/adapters/your-adapter/src
   ```

2. **Create `package.json`:**

   ```json
   {
     "name": "crucible-adapter-your-adapter",
     "version": "0.1.0",
     "main": "dist/index.js",
     "module": "dist/index.mjs",
     "types": "dist/index.d.ts",
     "files": ["dist"],
     "scripts": {
       "build": "tsup src/index.ts --format cjs,esm --dts --minify",
       "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
     },
     "dependencies": {
       "crucible-core": "workspace:*"
     },
     "peerDependencies": {
       "your-sdk": "^x.x.x"
     }
   }
   ```

3. **Implement the `FlagAdapter` interface:**

   ```typescript
   import type { FlagAdapter, EvaluationContext } from 'crucible-core';

   export class YourAdapter<T extends Record<string, unknown>> implements FlagAdapter<T> {
     async initialize(): Promise<void> {
       // Initialize your SDK
     }

     async evaluate<K extends keyof T>(key: K, context?: EvaluationContext): Promise<T[K]> {
       // Evaluate flag using your SDK
     }

     async close(): Promise<void> {
       // Cleanup resources
     }
   }
   ```

4. **Add tests** in `src/index.test.ts`

5. **Update workspace** by running `pnpm install`

---

## Questions?

- Open a [GitHub Issue](https://github.com/ferryhinardi/crucible/issues) for bugs or feature requests
- Check existing issues and discussions before creating new ones

Thank you for contributing!
