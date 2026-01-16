# Crucible Documentation

Welcome to Crucible - a type-safe, provider-agnostic feature flags library.

## Quick Links

- [Getting Started](./getting-started.md)
- [Core Concepts](./core-concepts.md)
- [API Reference](./api-reference.md)
- [Adapters](./adapters/README.md)
- [Examples](./examples/README.md)
- [Migration Guide](./migration.md)

## What is Crucible?

Crucible is a lightweight, type-safe feature flag and A/B testing library designed for modern JavaScript applications. It provides:

- **Type Safety**: Full TypeScript support with autocomplete for flag names and variants
- **Provider Agnostic**: Swap backends (LaunchDarkly, Split, etc.) with minimal code changes
- **SSR Support**: Server-side evaluation for Next.js, Remix, and other frameworks
- **Tiny Bundle**: <2KB core with tree-shakeable adapters
- **Flexible Targeting**: User-based rollouts, percentage splits, and custom rules

## Architecture

```
┌─────────────────┐
│  Your App       │
│  (React/Next)   │
└────────┬────────┘
         │
         ├── useFlag() hook
         │
┌────────▼────────┐
│ crucible-react  │
└────────┬────────┘
         │
┌────────▼────────┐
│ crucible-core   │  ◄── Type-safe schema
└────────┬────────┘
         │
         ├── Adapter interface
         │
    ┌────┴────┬────────────┬──────────┐
    ▼         ▼            ▼          ▼
  Local   LaunchDarkly   Split   Optimizely
```

## Installation

```bash
# Core packages
npm install crucible-core crucible-react

# Choose an adapter
npm install crucible-adapter-local          # Development
npm install crucible-adapter-launchdarkly   # Production
```

## Quick Example

```typescript
import { defineFlags, createFlagClient } from 'crucible-core';
import { LocalAdapter } from 'crucible-adapter-local';
import { FlagProvider, useFlag } from 'crucible-react';

// 1. Define schema
const flags = defineFlags({
  'new-checkout': ['control', 'variant-a'] as const,
});

// 2. Create client
const client = createFlagClient({
  adapter: new LocalAdapter({ flags: { 'new-checkout': 'control' } }),
  schema: flags,
});

await client.initialize();

// 3. Use in components
function App() {
  return (
    <FlagProvider client={client} context={{ userId: 'user-123' }}>
      <Checkout />
    </FlagProvider>
  );
}

function Checkout() {
  const variant = useFlag('new-checkout', 'control');
  return variant === 'variant-a' ? <NewCheckout /> : <OldCheckout />;
}
```

## Next Steps

- [Getting Started Guide](./getting-started.md)
- [Browse Examples](./examples/README.md)
- [Learn Core Concepts](./core-concepts.md)
- [API Documentation](./api-reference.md)
