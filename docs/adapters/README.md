# Creating Custom Adapters

This guide explains how to create custom adapters for Crucible, allowing you to integrate with any feature flag provider or custom backend.

## Overview

Adapters are the bridge between Crucible and your feature flag data source. Whether you're using a third-party service like LaunchDarkly or PostHog, or a custom internal system, you'll need an adapter to fetch and evaluate flags.

Crucible provides several built-in adapters:

- **`crucible-adapter-local`** - Local/testing adapter with rule matching and percentage rollouts
- **`crucible-adapter-launchdarkly`** - LaunchDarkly integration
- **`crucible-adapter-posthog`** - PostHog feature flags integration

## The FlagAdapter Interface

All adapters must implement the `FlagAdapter` interface from `crucible-core`:

```typescript
import type { FlagSchema, FlagVariants, EvaluationContext } from 'crucible-core';

interface FlagAdapter<T extends FlagSchema = FlagSchema> {
  /**
   * Initialize the adapter (e.g., connect to the provider, fetch initial flag values).
   * Called once when the client starts.
   */
  initialize(): Promise<void>;

  /**
   * Evaluate a flag for the given context.
   * @param flag - The flag key to evaluate
   * @param context - The evaluation context (user info, attributes)
   * @param defaultValue - Fallback value if evaluation fails
   * @returns The evaluated flag variant
   */
  evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]>;

  /**
   * Optional cleanup method called when the client is closed.
   * Use this to disconnect from services, flush analytics, etc.
   */
  close?(): Promise<void>;
}
```

### Key Types

```typescript
// Context passed to flag evaluation
interface EvaluationContext {
  userId?: string;
  attributes?: Record<string, unknown>;
}

// Flag schema definition
type FlagSchema = Record<string, readonly string[] | 'string' | 'number' | 'boolean'>;

// Maps schema to concrete types
type FlagVariants<T extends FlagSchema> = {
  [K in keyof T]: InferVariant<T[K]>;
};
```

## Step-by-Step Implementation Guide

### 1. Set Up Package Structure

Create a new package in the monorepo or as a standalone package:

```
packages/adapters/my-provider/
├── src/
│   ├── index.ts          # Main adapter implementation
│   └── __tests__/
│       └── index.test.ts # Tests
├── package.json
├── tsconfig.json
└── README.md
```

**package.json:**

```json
{
  "name": "crucible-adapter-my-provider",
  "version": "0.1.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {
    "crucible-core": "workspace:*"
  },
  "dependencies": {
    "my-provider-sdk": "^1.0.0"
  },
  "devDependencies": {
    "crucible-core": "workspace:*"
  }
}
```

### 2. Implement the Interface

````typescript
// src/index.ts
import type { FlagAdapter, FlagSchema, FlagVariants, EvaluationContext } from 'crucible-core';
import { MyProviderSDK } from 'my-provider-sdk';

/**
 * Configuration options for MyProviderAdapter.
 */
export interface MyProviderAdapterConfig {
  /** API key for authentication */
  apiKey: string;
  /** Optional environment (defaults to 'production') */
  environment?: string;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

/**
 * Crucible adapter for MyProvider feature flags.
 *
 * @example
 * ```ts
 * const adapter = new MyProviderAdapter({
 *   apiKey: 'your-api-key',
 *   environment: 'production',
 * });
 * ```
 */
export class MyProviderAdapter<T extends FlagSchema = FlagSchema> implements FlagAdapter<T> {
  private client: MyProviderSDK | null = null;
  private readonly config: Required<MyProviderAdapterConfig>;

  constructor(config: MyProviderAdapterConfig) {
    this.config = {
      apiKey: config.apiKey,
      environment: config.environment ?? 'production',
      timeout: config.timeout ?? 5000,
    };
  }

  async initialize(): Promise<void> {
    this.client = new MyProviderSDK({
      apiKey: this.config.apiKey,
      environment: this.config.environment,
    });

    await this.client.connect();
  }

  async evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]> {
    if (!this.client) {
      return defaultValue;
    }

    try {
      const result = await this.client.getFlag(String(flag), {
        userId: context.userId,
        ...context.attributes,
      });

      return (result ?? defaultValue) as FlagVariants<T>[K];
    } catch {
      return defaultValue;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }
}
````

### 3. Handle Configuration

Design your configuration interface to be:

- **Type-safe**: Use TypeScript interfaces with clear documentation
- **Flexible**: Provide sensible defaults for optional parameters
- **Validated**: Check required fields in the constructor

```typescript
export interface MyProviderAdapterConfig {
  /** Required: API key for authentication */
  apiKey: string;

  /** Optional: Environment name (default: 'production') */
  environment?: string;

  /** Optional: Request timeout in ms (default: 5000) */
  timeout?: number;

  /** Optional: Custom logger for debugging */
  logger?: {
    debug: (msg: string) => void;
    error: (msg: string) => void;
  };
}
```

### 4. Implement Evaluation Logic

The `evaluate` method is the core of your adapter. Key considerations:

- **Always return `defaultValue` on failure** - Never throw from `evaluate`
- **Handle missing flags gracefully** - Return the default if flag doesn't exist
- **Map provider types to schema types** - Ensure type consistency

```typescript
async evaluate<K extends keyof T>(
  flag: K,
  context: EvaluationContext,
  defaultValue: FlagVariants<T>[K]
): Promise<FlagVariants<T>[K]> {
  // Guard: client must be initialized
  if (!this.client) {
    this.logger?.debug(`Client not initialized, returning default for "${String(flag)}"`);
    return defaultValue;
  }

  try {
    // Map Crucible context to provider format
    const providerContext = {
      key: context.userId ?? 'anonymous',
      custom: context.attributes ?? {},
    };

    // Fetch flag value from provider
    const value = await this.client.variation(String(flag), providerContext);

    // Return value or default if undefined/null
    return (value ?? defaultValue) as FlagVariants<T>[K];
  } catch (error) {
    this.logger?.error(`Failed to evaluate "${String(flag)}": ${error}`);
    return defaultValue;
  }
}
```

### 5. Add Cleanup (Optional)

The `close` method is optional but recommended for:

- Disconnecting from services
- Flushing analytics events
- Releasing resources

```typescript
async close(): Promise<void> {
  if (this.client) {
    // Flush any pending analytics
    await this.client.flush();

    // Disconnect from the service
    await this.client.close();

    // Clear reference
    this.client = null;
  }
}
```

## Complete Example

Here's a complete adapter implementation based on the PostHog adapter:

```typescript
import type { FlagAdapter, FlagSchema, FlagVariants, EvaluationContext } from 'crucible-core';

export interface CustomAdapterConfig<T extends FlagSchema> {
  /** Static flag values */
  flags: Partial<FlagVariants<T>>;
  /** Simulated network delay in ms */
  delay?: number;
}

export class CustomAdapter<T extends FlagSchema = FlagSchema> implements FlagAdapter<T> {
  private readonly flags: Partial<FlagVariants<T>>;
  private readonly delay: number;
  private initialized = false;

  constructor(config: CustomAdapterConfig<T>) {
    this.flags = config.flags;
    this.delay = config.delay ?? 0;
  }

  async initialize(): Promise<void> {
    // Simulate async initialization
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }
    this.initialized = true;
  }

  async evaluate<K extends keyof T>(
    flag: K,
    _context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]> {
    if (!this.initialized) {
      return defaultValue;
    }

    const value = this.flags[flag];
    return (value ?? defaultValue) as FlagVariants<T>[K];
  }

  async close(): Promise<void> {
    this.initialized = false;
  }
}
```

## Testing Your Adapter

Write comprehensive tests to ensure your adapter works correctly:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomAdapter } from './index';

const testFlags = {
  'feature-a': ['on', 'off'] as const,
  'feature-b': 'boolean' as const,
  'max-items': 'number' as const,
};

describe('CustomAdapter', () => {
  let adapter: CustomAdapter<typeof testFlags>;

  beforeEach(() => {
    adapter = new CustomAdapter({
      flags: {
        'feature-a': 'on',
        'feature-b': true,
        'max-items': 10,
      },
    });
  });

  it('should initialize successfully', async () => {
    await expect(adapter.initialize()).resolves.not.toThrow();
  });

  it('should return configured flag values', async () => {
    await adapter.initialize();

    const result = await adapter.evaluate('feature-a', {}, 'off');
    expect(result).toBe('on');
  });

  it('should return default value for unconfigured flags', async () => {
    adapter = new CustomAdapter({ flags: {} });
    await adapter.initialize();

    const result = await adapter.evaluate('feature-a', {}, 'off');
    expect(result).toBe('off');
  });

  it('should return default value before initialization', async () => {
    const result = await adapter.evaluate('feature-a', {}, 'off');
    expect(result).toBe('off');
  });

  it('should close gracefully', async () => {
    await adapter.initialize();
    await expect(adapter.close()).resolves.not.toThrow();
  });
});
```

## Publishing Checklist

Before publishing your adapter:

- [ ] Implement all required interface methods (`initialize`, `evaluate`)
- [ ] Add optional `close` method if needed for cleanup
- [ ] Write comprehensive tests (aim for >80% coverage)
- [ ] Add JSDoc comments to all public APIs
- [ ] Create a README with usage examples
- [ ] Ensure `package.json` has correct `files` field
- [ ] Test with both ESM and CommonJS consumers
- [ ] Add the adapter to the monorepo docs (if contributing)

## Reference Implementations

Study these adapters for best practices:

| Adapter                                                                  | Description              | Key Features                                              |
| ------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------- |
| [`crucible-adapter-local`](../../packages/adapters/local/)               | Local testing adapter    | Rule matching, percentage rollouts, deterministic hashing |
| [`crucible-adapter-launchdarkly`](../../packages/adapters/launchdarkly/) | LaunchDarkly integration | SDK wrapper, streaming updates                            |
| [`crucible-adapter-posthog`](../../packages/adapters/posthog/)           | PostHog integration      | Analytics capture, user identification                    |

## Need Help?

- Check existing adapters for patterns and best practices
- Open an issue on GitHub for questions
- See [Core Concepts](../core-concepts.md) for architecture details
- See [API Reference](../api-reference.md) for type documentation
