# Core Concepts

This guide explains the fundamental concepts behind Crucible and how its components work together to provide type-safe feature flags.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Schemas](#schemas)
- [Adapters](#adapters)
- [Evaluation Context](#evaluation-context)
- [Rules](#rules)
- [Percentage Rollouts](#percentage-rollouts)
- [Analytics & Exposure Tracking](#analytics--exposure-tracking)

---

## Architecture Overview

Crucible follows a modular architecture with three main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Application                        │
├─────────────────────────────────────────────────────────────┤
│  crucible-react                                             │
│  ┌─────────────┐  ┌─────────┐  ┌───────────────────────┐   │
│  │FlagProvider │  │ useFlag │  │ useFlagWithStatus     │   │
│  └─────────────┘  └─────────┘  └───────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  crucible-core                                              │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ defineFlags    │  │ FlagClient   │  │ FlagAdapter    │  │
│  │createFlagClient│  │ (interface)  │  │ (interface)    │  │
│  └────────────────┘  └──────────────┘  └────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Adapters                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ LocalAdapter   │  │ LaunchDarkly   │  │ Custom...    │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **crucible-core**: Provides type definitions, the `FlagClient` interface, and factory functions
- **crucible-react**: React hooks and context providers for easy integration
- **Adapters**: Pluggable implementations that handle actual flag evaluation logic

---

## Schemas

Schemas define the shape of your feature flags and enable full TypeScript type safety throughout your application.

### Defining a Schema

Use the `defineFlags()` function to create a type-safe flag schema:

```typescript
import { defineFlags } from 'crucible-core';

const flags = defineFlags({
  // Enumerated variants (string literals)
  theme: ['light', 'dark', 'system'] as const,

  // Primitive types
  maxItems: 'number',
  enableBeta: 'boolean',
  welcomeMessage: 'string',
} as const);
```

> **Important**: Always use `as const` to preserve literal types. Without it, TypeScript will widen `['light', 'dark']` to `string[]`, losing type safety.

### Supported Schema Types

| Schema Definition          | Runtime Type        | Default Value         |
| -------------------------- | ------------------- | --------------------- |
| `['a', 'b', 'c'] as const` | `'a' \| 'b' \| 'c'` | First element (`'a'`) |
| `'string'`                 | `string`            | `''` (empty string)   |
| `'number'`                 | `number`            | `0`                   |
| `'boolean'`                | `boolean`           | `false`               |

### Type Inference

The schema provides full type inference when evaluating flags:

```typescript
// TypeScript knows this returns 'light' | 'dark' | 'system'
const theme = await client.evaluate('theme');

// TypeScript knows this returns a number
const maxItems = await client.evaluate('maxItems');

// Type error: 'invalid' is not a valid variant
const theme = await client.evaluate('theme', {}, 'invalid');
```

---

## Adapters

Adapters are the bridge between Crucible and your feature flag source. They implement the `FlagAdapter` interface and handle the actual evaluation logic.

### The FlagAdapter Interface

Every adapter must implement this interface:

```typescript
interface FlagAdapter<T extends FlagSchema> {
  // Called once to initialize the adapter (e.g., connect to service)
  initialize(): Promise<void>;

  // Evaluate a flag for a given context
  evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]>;

  // Optional: cleanup resources
  close?(): Promise<void>;
}
```

### Built-in Adapters

#### LocalAdapter

The `LocalAdapter` from `crucible-adapter-local` stores flags in memory with support for rules and percentage rollouts:

```typescript
import { LocalAdapter } from 'crucible-adapter-local';

const adapter = new LocalAdapter({
  flags: {
    theme: 'light',
    enableBeta: false,
  },
  rules: [
    /* targeting rules */
  ],
  rollouts: [
    /* percentage rollouts */
  ],
});
```

#### LaunchDarkly Adapter

For production use with LaunchDarkly:

```typescript
import { LaunchDarklyAdapter } from 'crucible-adapter-launchdarkly';

const adapter = new LaunchDarklyAdapter({
  sdkKey: process.env.LAUNCHDARKLY_SDK_KEY,
});
```

### Creating a Custom Adapter

You can create adapters for any feature flag service:

```typescript
import type { FlagAdapter, FlagSchema, FlagVariants, EvaluationContext } from 'crucible-core';

class MyCustomAdapter<T extends FlagSchema> implements FlagAdapter<T> {
  private client: MyFlagService;

  constructor(private config: { apiKey: string }) {}

  async initialize(): Promise<void> {
    this.client = await MyFlagService.connect(this.config.apiKey);
  }

  async evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]> {
    try {
      const value = await this.client.getFlag(String(flag), context.userId, context.attributes);
      return value as FlagVariants<T>[K];
    } catch {
      return defaultValue;
    }
  }

  async close(): Promise<void> {
    await this.client.disconnect();
  }
}
```

---

## Evaluation Context

The evaluation context provides information about the current user or environment to enable targeted flag delivery.

### EvaluationContext Interface

```typescript
interface EvaluationContext {
  userId?: string; // Unique user identifier
  attributes?: Record<string, unknown>; // Additional targeting attributes
}
```

### Providing Context

Context can be provided at multiple levels:

#### 1. Default Context (Client Level)

Set a default context when creating the client:

```typescript
const client = createFlagClient({
  adapter,
  schema: flags,
  defaultContext: {
    attributes: {
      environment: 'production',
      appVersion: '2.0.0',
    },
  },
});
```

#### 2. Provider Context (React)

Set context for all components in a tree:

```typescript
<FlagProvider client={client} context={{ userId: user.id }}>
  <App />
</FlagProvider>
```

#### 3. Per-Evaluation Context

Override context for specific evaluations:

```typescript
const variant = await client.evaluate('feature', {
  userId: 'user-123',
  attributes: { plan: 'premium' },
});
```

### Context Merging

Contexts are merged with the following priority (highest to lowest):

1. Per-evaluation context
2. Provider context (React)
3. Default context (client config)

Attributes are deep-merged:

```typescript
// Default context
{ attributes: { environment: 'prod', version: '1.0' } }

// Per-evaluation context
{ userId: 'user-123', attributes: { version: '2.0' } }

// Merged result
{ userId: 'user-123', attributes: { environment: 'prod', version: '2.0' } }
```

---

## Rules

Rules enable targeted flag delivery based on user attributes. They're evaluated in order, and the first matching rule wins.

### RolloutRule Interface

```typescript
interface RolloutRule<T extends FlagSchema> {
  flag: keyof T; // Which flag this rule applies to
  match: (context: EvaluationContext) => boolean; // Targeting condition
  variant: FlagVariants<T>[keyof T]; // Variant to return if matched
}
```

### Defining Rules

```typescript
const adapter = new LocalAdapter({
  flags: {
    theme: 'light',
    pricingTier: 'standard',
  },
  rules: [
    // Enable dark theme for beta users
    {
      flag: 'theme',
      match: (ctx) => ctx.attributes?.betaUser === true,
      variant: 'dark',
    },

    // Premium pricing for enterprise customers
    {
      flag: 'pricingTier',
      match: (ctx) => ctx.attributes?.plan === 'enterprise',
      variant: 'premium',
    },

    // Internal users always see new features
    {
      flag: 'newDashboard',
      match: (ctx) => ctx.attributes?.email?.endsWith('@mycompany.com'),
      variant: true,
    },
  ],
});
```

### Rule Evaluation Order

Rules are evaluated in array order. The first matching rule determines the result:

```typescript
rules: [
  // This rule is checked first
  { flag: 'feature', match: (ctx) => ctx.userId === 'admin', variant: 'full' },

  // Only checked if the first rule doesn't match
  { flag: 'feature', match: (ctx) => ctx.attributes?.premium, variant: 'basic' },
];
```

---

## Percentage Rollouts

Percentage rollouts enable gradual feature releases to a subset of users. Crucible uses deterministic hashing to ensure users consistently see the same variant.

### PercentageRollout Interface

```typescript
interface PercentageRollout<T extends FlagSchema> {
  flag: keyof T; // Which flag this rollout applies to
  percentage: number; // 0-100, percentage of users to include
  variant: FlagVariants<T>[keyof T]; // Variant for users in the rollout
  seed?: string; // Optional seed for consistent hashing
}
```

### Defining Rollouts

```typescript
const adapter = new LocalAdapter({
  flags: {
    newCheckout: false,
    experimentVariant: 'control',
  },
  rollouts: [
    // Roll out new checkout to 25% of users
    {
      flag: 'newCheckout',
      percentage: 25,
      variant: true,
    },

    // A/B test with 50% seeing the new variant
    {
      flag: 'experimentVariant',
      percentage: 50,
      variant: 'treatment',
    },
  ],
});
```

### How Deterministic Hashing Works

Crucible uses a hash of `userId:flag:seed` to determine bucket assignment:

1. Combine `userId`, `flag`, and `seed` (default: `'default'`) into a string
2. Apply a simple hash function (djb2-like algorithm)
3. Map the hash to a bucket (0-99)
4. User is in the rollout if `bucket < percentage`

```
User "alice" + flag "newFeature" + seed "default"
    ↓
Hash: "alice:newFeature:default"
    ↓
Bucket: 37
    ↓
If percentage >= 38, user sees the new variant
```

### Key Properties

- **Deterministic**: The same user always gets the same bucket for a given flag
- **Consistent**: Users don't flip between variants on page refresh
- **Adjustable**: Changing the percentage gradually adds/removes users
- **Seed control**: Different seeds create independent bucketing

### Using Seeds for Independent Experiments

```typescript
rollouts: [
  // Experiment A: 50% of users
  {
    flag: 'experimentA',
    percentage: 50,
    variant: 'treatment',
    seed: 'exp-a-2024',
  },

  // Experiment B: Different 50% of users
  {
    flag: 'experimentB',
    percentage: 50,
    variant: 'treatment',
    seed: 'exp-b-2024',
  },
];
```

### Requirements

> **Important**: Percentage rollouts require a `userId` in the evaluation context. Without a `userId`, the rollout is skipped and evaluation falls through to static config.

---

## Analytics & Exposure Tracking

Track when users are exposed to flag variants for analytics, experimentation, and debugging.

### The onExposure Callback

Configure an exposure callback when creating the client:

```typescript
const client = createFlagClient({
  adapter,
  schema: flags,
  onExposure: (flag, variant, context) => {
    // Send to your analytics service
    analytics.track('Feature Flag Exposure', {
      flag: String(flag),
      variant,
      userId: context.userId,
      attributes: context.attributes,
      timestamp: new Date().toISOString(),
    });
  },
});
```

### When Exposures Fire

The `onExposure` callback is called:

- After every successful flag evaluation
- With the final resolved variant (not the default)
- With the merged evaluation context

### Integration Examples

#### Segment

```typescript
onExposure: (flag, variant, context) => {
  analytics.track('$feature_flag_called', {
    $feature_flag: String(flag),
    $feature_flag_variant: variant,
  });
};
```

#### Amplitude

```typescript
onExposure: (flag, variant, context) => {
  amplitude.track('[Experiment] Exposure', {
    flag_key: String(flag),
    variant,
  });
};
```

#### PostHog

```typescript
onExposure: (flag, variant, context) => {
  posthog.capture('$feature_flag_called', {
    $feature_flag: String(flag),
    $feature_flag_response: variant,
  });
};
```

#### Custom Logging

```typescript
onExposure: (flag, variant, context) => {
  console.log(`[FeatureFlag] ${String(flag)}=${variant}`, {
    userId: context.userId,
    ...context.attributes,
  });
};
```

---

## Evaluation Priority

When evaluating a flag, the following sources are checked in order:

1. **Rules** - First matching rule wins
2. **Percentage Rollouts** - If user is in rollout bucket (requires `userId`)
3. **Static Config** - Value from adapter's flag configuration
4. **Default Value** - The `defaultValue` passed to `evaluate()`
5. **Schema Default** - Inferred from schema (first array element or type default)

```typescript
// Evaluation flow
const adapter = new LocalAdapter({
  flags: { feature: 'off' }, // Priority 3: Static config
  rules: [
    { flag: 'feature', match: isAdmin, variant: 'full' }, // Priority 1
  ],
  rollouts: [
    { flag: 'feature', percentage: 10, variant: 'on' }, // Priority 2
  ],
});

// Priority 4: Default value argument
await client.evaluate('feature', context, 'fallback');

// Priority 5: Schema default (first element of array)
const flags = defineFlags({ feature: ['off', 'on', 'full'] as const });
```

---

## Next Steps

- [API Reference](./api-reference.md) - Complete API documentation
- [Getting Started](./getting-started.md) - Quick start guide
