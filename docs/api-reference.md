# API Reference

Complete API documentation for all Crucible packages.

## Table of Contents

- [crucible-core](#crucible-core)
  - [defineFlags()](#defineflags)
  - [createFlagClient()](#createflagclient)
  - [FlagClient](#flagclient)
  - [FlagAdapter](#flagadapter)
  - [Types](#core-types)
- [crucible-react](#crucible-react)
  - [FlagProvider](#flagprovider)
  - [useFlag()](#useflag)
  - [useFlagWithStatus()](#useflagwithstatus)
  - [useFlagClient()](#useflagclient)
  - [useFlagContext()](#useflagcontext)
  - [Types](#react-types)
- [crucible-adapter-local](#crucible-adapter-local)
  - [LocalAdapter](#localadapter)
  - [Types](#local-adapter-types)

---

## crucible-core

The core package provides type definitions, interfaces, and factory functions for creating feature flag clients.

```bash
npm install crucible-core
```

### defineFlags()

Helper function to define a type-safe flag schema.

```typescript
function defineFlags<T extends FlagSchema>(schema: T): T;
```

#### Parameters

| Name     | Type                   | Description                                |
| -------- | ---------------------- | ------------------------------------------ |
| `schema` | `T extends FlagSchema` | Object defining flag names and their types |

#### Returns

Returns the schema unchanged. This function exists purely for TypeScript type inference.

#### Example

```typescript
import { defineFlags } from 'crucible-core';

const flags = defineFlags({
  theme: ['light', 'dark', 'system'] as const,
  maxItems: 'number',
  enableBeta: 'boolean',
  welcomeMessage: 'string',
} as const);
```

---

### createFlagClient()

Factory function that creates a configured flag client instance.

```typescript
function createFlagClient<T extends FlagSchema>(config: FlagClientConfig<T>): FlagClient<T>;
```

#### Parameters

| Name     | Type                  | Description                 |
| -------- | --------------------- | --------------------------- |
| `config` | `FlagClientConfig<T>` | Client configuration object |

#### FlagClientConfig

```typescript
interface FlagClientConfig<T extends FlagSchema> {
  adapter: FlagAdapter<T>;
  schema: T;
  onExposure?: (
    flag: keyof T,
    variant: FlagVariants<T>[keyof T],
    context: EvaluationContext
  ) => void;
  defaultContext?: EvaluationContext;
}
```

| Property         | Type                | Required | Description                                        |
| ---------------- | ------------------- | -------- | -------------------------------------------------- |
| `adapter`        | `FlagAdapter<T>`    | Yes      | Adapter implementation for flag evaluation         |
| `schema`         | `T`                 | Yes      | Flag schema for type safety                        |
| `onExposure`     | `Function`          | No       | Callback fired after each flag evaluation          |
| `defaultContext` | `EvaluationContext` | No       | Default context merged with per-evaluation context |

#### Returns

Returns a `FlagClient<T>` instance.

#### Example

```typescript
import { createFlagClient, defineFlags } from 'crucible-core';
import { LocalAdapter } from 'crucible-adapter-local';

const flags = defineFlags({
  theme: ['light', 'dark'] as const,
} as const);

const client = createFlagClient({
  adapter: new LocalAdapter({ flags: { theme: 'light' } }),
  schema: flags,
  onExposure: (flag, variant, context) => {
    console.log(`Flag ${String(flag)} evaluated to ${variant}`);
  },
  defaultContext: {
    attributes: { environment: 'production' },
  },
});
```

---

### FlagClient

The main client interface for evaluating feature flags.

```typescript
interface FlagClient<T extends FlagSchema> {
  initialize(): Promise<void>;
  evaluate<K extends keyof T & string>(
    flag: K,
    context?: EvaluationContext,
    defaultValue?: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]>;
  close(): Promise<void>;
}
```

#### Methods

##### initialize()

Initialize the client and underlying adapter. Must be called before evaluating flags.

```typescript
initialize(): Promise<void>
```

##### evaluate()

Evaluate a feature flag for a given context.

```typescript
evaluate<K extends keyof T & string>(
  flag: K,
  context?: EvaluationContext,
  defaultValue?: FlagVariants<T>[K]
): Promise<FlagVariants<T>[K]>
```

| Parameter      | Type                 | Required | Description                              |
| -------------- | -------------------- | -------- | ---------------------------------------- |
| `flag`         | `K`                  | Yes      | Name of the flag to evaluate             |
| `context`      | `EvaluationContext`  | No       | Evaluation context (merged with default) |
| `defaultValue` | `FlagVariants<T>[K]` | No       | Fallback value if evaluation fails       |

##### close()

Clean up resources and close the adapter connection.

```typescript
close(): Promise<void>
```

#### Example

```typescript
await client.initialize();

const theme = await client.evaluate('theme', { userId: 'user-123' });

await client.close();
```

---

### FlagAdapter

Interface that all adapters must implement.

```typescript
interface FlagAdapter<T extends FlagSchema = FlagSchema> {
  initialize(): Promise<void>;
  evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]>;
  close?(): Promise<void>;
}
```

#### Methods

| Method         | Required | Description            |
| -------------- | -------- | ---------------------- |
| `initialize()` | Yes      | Setup/connection logic |
| `evaluate()`   | Yes      | Core flag evaluation   |
| `close()`      | No       | Optional cleanup       |

---

### Core Types

#### FlagSchema

```typescript
type FlagSchema = Record<string, readonly string[] | 'string' | 'number' | 'boolean'>;
```

Defines the shape of a feature flag configuration.

#### InferVariant

```typescript
type InferVariant<T> = T extends readonly (infer U)[]
  ? U
  : T extends 'string'
    ? string
    : T extends 'number'
      ? number
      : T extends 'boolean'
        ? boolean
        : never;
```

Utility type that infers the runtime type from a schema definition.

#### FlagVariants

```typescript
type FlagVariants<T extends FlagSchema> = {
  [K in keyof T]: InferVariant<T[K]>;
};
```

Maps a complete schema to its concrete variant types.

#### EvaluationContext

```typescript
interface EvaluationContext {
  userId?: string;
  attributes?: Record<string, unknown>;
}
```

Context passed during flag evaluation.

| Property     | Type                      | Description                                                        |
| ------------ | ------------------------- | ------------------------------------------------------------------ |
| `userId`     | `string`                  | Optional unique user identifier (required for percentage rollouts) |
| `attributes` | `Record<string, unknown>` | Optional key-value pairs for targeting                             |

---

## crucible-react

React hooks and components for integrating Crucible with React applications.

```bash
npm install crucible-react crucible-core
```

> **Note**: This package includes the `'use client'` directive for Next.js App Router compatibility.

### FlagProvider

React context provider that makes the flag client available to child components.

```typescript
function FlagProvider(props: {
  client: FlagClient<FlagSchema>;
  context?: EvaluationContext;
  children: ReactNode;
}): JSX.Element;
```

#### Props

| Prop       | Type                | Required | Description                         |
| ---------- | ------------------- | -------- | ----------------------------------- |
| `client`   | `FlagClient`        | Yes      | Initialized flag client instance    |
| `context`  | `EvaluationContext` | No       | Evaluation context for all children |
| `children` | `ReactNode`         | Yes      | React children                      |

#### Example

```tsx
import { FlagProvider } from 'crucible-react';

function App() {
  return (
    <FlagProvider client={client} context={{ userId: user.id }}>
      <MyApp />
    </FlagProvider>
  );
}
```

---

### useFlag()

Hook to get a feature flag value.

```typescript
function useFlag<T extends FlagSchema, K extends keyof T>(
  flag: K,
  defaultValue?: FlagVariants<T>[K]
): FlagVariants<T>[K] | undefined;
```

#### Parameters

| Parameter      | Type                 | Required | Description                  |
| -------------- | -------------------- | -------- | ---------------------------- |
| `flag`         | `K`                  | Yes      | Name of the flag to evaluate |
| `defaultValue` | `FlagVariants<T>[K]` | No       | Initial/fallback value       |

#### Returns

The flag variant value, or `undefined` while loading.

#### Example

```tsx
import { useFlag } from 'crucible-react';

function ThemeToggle() {
  const theme = useFlag('theme', 'light');

  return <div className={`theme-${theme}`}>...</div>;
}
```

---

### useFlagWithStatus()

Hook to get a feature flag value with loading and error state.

```typescript
function useFlagWithStatus<T extends FlagSchema, K extends keyof T>(
  flag: K,
  defaultValue?: FlagVariants<T>[K]
): {
  value: FlagVariants<T>[K] | undefined;
  status: FlagStatus;
};
```

#### Parameters

| Parameter      | Type                 | Required | Description                  |
| -------------- | -------------------- | -------- | ---------------------------- |
| `flag`         | `K`                  | Yes      | Name of the flag to evaluate |
| `defaultValue` | `FlagVariants<T>[K]` | No       | Initial/fallback value       |

#### Returns

| Property           | Type                              | Description                            |
| ------------------ | --------------------------------- | -------------------------------------- |
| `value`            | `FlagVariants<T>[K] \| undefined` | The flag variant value                 |
| `status.isLoading` | `boolean`                         | `true` while evaluation is in progress |
| `status.error`     | `Error \| null`                   | Error object if evaluation failed      |

#### Example

```tsx
import { useFlagWithStatus } from 'crucible-react';

function FeatureComponent() {
  const { value: enabled, status } = useFlagWithStatus('newFeature', false);

  if (status.isLoading) {
    return <Spinner />;
  }

  if (status.error) {
    return <ErrorMessage error={status.error} />;
  }

  return enabled ? <NewFeature /> : <LegacyFeature />;
}
```

---

### useFlagClient()

Hook to access the raw flag client for advanced use cases.

```typescript
function useFlagClient(): FlagClient<FlagSchema> | null;
```

#### Returns

The flag client from context, or `null` if not within a `FlagProvider`.

#### Example

```tsx
import { useFlagClient } from 'crucible-react';

function AdvancedComponent() {
  const client = useFlagClient();

  const handleClick = async () => {
    if (client) {
      const variant = await client.evaluate('feature', {
        attributes: { action: 'click' },
      });
      // Use variant...
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

---

### useFlagContext()

Hook to access the current evaluation context from the provider.

```typescript
function useFlagContext(): EvaluationContext;
```

#### Returns

The evaluation context object from the nearest `FlagProvider`.

#### Example

```tsx
import { useFlagContext } from 'crucible-react';

function DebugPanel() {
  const context = useFlagContext();

  return (
    <pre>
      User ID: {context.userId}
      Attributes: {JSON.stringify(context.attributes, null, 2)}
    </pre>
  );
}
```

---

### React Types

#### FlagStatus

```typescript
type FlagStatus = {
  isLoading: boolean;
  error: Error | null;
};
```

Loading and error state for flag evaluation.

---

## crucible-adapter-local

Local/in-memory adapter with support for rules and percentage rollouts.

```bash
npm install crucible-adapter-local crucible-core
```

### LocalAdapter

In-memory adapter implementation for local flag evaluation.

```typescript
class LocalAdapter<T extends FlagSchema> implements FlagAdapter<T> {
  constructor(config: LocalAdapterConfig<T>);
  initialize(): Promise<void>;
  evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]>;
  close(): Promise<void>;
}
```

#### Constructor

```typescript
new LocalAdapter<T>(config: LocalAdapterConfig<T>)
```

#### LocalAdapterConfig

```typescript
interface LocalAdapterConfig<T extends FlagSchema> {
  flags: Partial<FlagVariants<T>>;
  rules?: Array<RolloutRule<T>>;
  rollouts?: Array<PercentageRollout<T>>;
}
```

| Property   | Type                          | Required | Description         |
| ---------- | ----------------------------- | -------- | ------------------- |
| `flags`    | `Partial<FlagVariants<T>>`    | Yes      | Static flag values  |
| `rules`    | `Array<RolloutRule<T>>`       | No       | Targeting rules     |
| `rollouts` | `Array<PercentageRollout<T>>` | No       | Percentage rollouts |

#### Evaluation Priority

1. **Rules** - First matching rule wins (in array order)
2. **Percentage Rollouts** - If user is in rollout bucket
3. **Static Config** - Value from `config.flags`
4. **Default Value** - The `defaultValue` argument

#### Example

```typescript
import { LocalAdapter } from 'crucible-adapter-local';

const adapter = new LocalAdapter({
  flags: {
    theme: 'light',
    enableBeta: false,
  },
  rules: [
    {
      flag: 'enableBeta',
      match: (ctx) => ctx.attributes?.role === 'admin',
      variant: true,
    },
  ],
  rollouts: [
    {
      flag: 'enableBeta',
      percentage: 10,
      variant: true,
    },
  ],
});
```

---

### Local Adapter Types

#### RolloutRule

```typescript
interface RolloutRule<T extends FlagSchema> {
  flag: keyof T;
  match: (context: EvaluationContext) => boolean;
  variant: FlagVariants<T>[keyof T];
}
```

| Property  | Type                       | Description                                  |
| --------- | -------------------------- | -------------------------------------------- |
| `flag`    | `keyof T`                  | Flag this rule applies to                    |
| `match`   | `(context) => boolean`     | Function that returns `true` if rule matches |
| `variant` | `FlagVariants<T>[keyof T]` | Variant to return if matched                 |

#### PercentageRollout

```typescript
interface PercentageRollout<T extends FlagSchema> {
  flag: keyof T;
  percentage: number;
  variant: FlagVariants<T>[keyof T];
  seed?: string;
}
```

| Property     | Type                       | Description                                                 |
| ------------ | -------------------------- | ----------------------------------------------------------- |
| `flag`       | `keyof T`                  | Flag this rollout applies to                                |
| `percentage` | `number`                   | 0-100, percentage of users to include                       |
| `variant`    | `FlagVariants<T>[keyof T]` | Variant for users in the rollout                            |
| `seed`       | `string`                   | Optional seed for consistent hashing (default: `'default'`) |

---

## See Also

- [Core Concepts](./core-concepts.md) - In-depth explanation of how Crucible works
- [Getting Started](./getting-started.md) - Quick start guide
