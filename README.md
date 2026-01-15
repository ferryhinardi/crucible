# Crucible

Type-safe, provider-agnostic feature flags and A/B testing for React/Next.js.

## Why Crucible?

### Problems it solves

**Vendor lock-in** – Most feature flag libraries tie you to one provider. Switching costs months of engineering time.

**Runtime errors** – Typos in flag names (`'chekout-v2'` vs `'checkout-v2'`) only break in production.

**Hidden performance costs** – Third-party SDKs bundle 50-100KB+ of code you don't need.

**SSR hydration mismatches** – Client-side-only flags cause flicker and layout shifts.

### What makes Crucible different

✅ **Type-safe by default** – Autocomplete for flag names and variants. Typos caught at compile-time.

✅ **Framework-agnostic core** – Use with React, Vue, Svelte, or vanilla JS.

✅ **Swap providers in minutes** – Abstract interface means switching from LaunchDarkly → Split → custom backend is a 3-line change.

✅ **Tiny bundle** – Core is <2KB. Only pay for what you use (tree-shakeable adapters).

✅ **SSR-native** – Evaluate flags server-side in Next.js/Remix. Zero flicker.

✅ **Bring your own analytics** – Hook into exposure events for Mixpanel, Amplitude, etc.

## Features

- 🔒 **Type-safe** – Autocomplete for flag names + variants
- 🔌 **Adapter pattern** – Plug any backend (LaunchDarkly, Split, custom API, local JSON)
- ⚡ **SSR-first** – Server-side evaluation, zero flicker
- 🪶 **Tiny** – <3kB core
- 📊 **Analytics hooks** – Auto-track exposures
- 🎲 **Percentage rollouts** – Gradually release to 1%, 10%, 50% of users
- 🎯 **Context targeting** – Target by userId, country, device, custom attributes
- 🔄 **Rule-based overrides** – VIP users, internal testing, staged rollouts

## Install

```bash
yarn add @crucible/core @crucible/react @crucible/adapter-local
```

## Quick start

```typescript
import { defineFlags, createFlagClient } from '@crucible/core';
import { LocalAdapter } from '@crucible/adapter-local';
import { FlagProvider, useFlag } from '@crucible/react';

// 1. Define schema
const flags = defineFlags({
  'checkout-redesign': ['control', 'variant-a', 'variant-b'],
  'express-payment': ['on', 'off']
});

// 2. Create client
const client = createFlagClient({
  adapter: new LocalAdapter({
    flags: {
      'checkout-redesign': 'variant-a',
      'express-payment': 'on'
    }
  }),
  schema: flags
});

await client.initialize();

// 3. Wrap app
<FlagProvider client={client} context={{ userId: 'user123' }}>
  <App />
</FlagProvider>

// 4. Use in components
function Checkout() {
  const variant = useFlag('checkout-redesign', 'control');
  
  if (variant === 'variant-a') return <NewCheckout />;
  return <OldCheckout />;
}
```

## Advanced Usage

### Percentage Rollouts

Gradually release features to a percentage of users with deterministic bucketing:

```typescript
import { LocalAdapter } from '@crucible/adapter-local';

const client = createFlagClient({
  adapter: new LocalAdapter({
    flags: {
      'new-checkout': 'control'
    },
    rollouts: [
      {
        flag: 'new-checkout',
        percentage: 10, // 10% of users
        variant: 'variant-a'
      }
    ]
  }),
  schema: flags
});

// Same userId always gets same variant (deterministic)
await client.evaluate('new-checkout', { userId: 'user-123' }); // Consistent result
```

**Key features:**
- Deterministic hashing ensures users always see the same variant
- No userId? Falls back to default variant
- Combine with rules for staged rollouts (e.g., 100% for internal team, 10% for public)

### Priority Order

1. **Rules** (highest priority) – `match()` function overrides
2. **Percentage rollouts** – Hash-based bucketing
3. **Static flags** – Default configuration
4. **Schema default** (lowest) – First variant in array

## Packages

- `@crucible/core` – Core client
- `@crucible/react` – React hooks
- `@crucible/adapter-local` – Local JSON adapter
- `@crucible/adapter-launchdarkly` – LaunchDarkly adapter

## Examples

- [Next.js](./examples/nextjs) – App Router with SSR evaluation
- [Vite + React](./examples/vite-react) – Client-side SPA

## Development

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run tests
yarn test

# Dev mode (watch)
yarn dev
```

## License

MIT
