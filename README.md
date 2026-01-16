# Crucible

[![CI](https://github.com/ferryhinardi/crucible/actions/workflows/ci.yml/badge.svg)](https://github.com/ferryhinardi/crucible/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/crucible-core.svg)](https://www.npmjs.com/package/crucible-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

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
npm install crucible-core crucible-react crucible-adapter-local
```

## Quick start

```typescript
import { defineFlags, createFlagClient } from 'crucible-core';
import { LocalAdapter } from 'crucible-adapter-local';
import { FlagProvider, useFlag } from 'crucible-react';

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

## Implementation Guide

### Setup Checklist

**1. Define flags in a central file** (e.g., `flags.ts`):

```typescript
import { defineFlags } from 'crucible-core';

export const flags = defineFlags({
  'feature-name': ['control', 'variant-a', 'variant-b'] as const,
  'boolean-flag': ['on', 'off'] as const,
  'dynamic-text': 'string' as const,
});

export type FlagsSchema = typeof flags;
```

**2. Initialize client once at app startup:**

```typescript
// client.ts
import { createFlagClient } from 'crucible-core';
import { LocalAdapter } from 'crucible-adapter-local';
import { flags } from './flags';

export const flagClient = createFlagClient({
  adapter: new LocalAdapter<typeof flags>({
    flags: {
      'feature-name': 'control',
      'boolean-flag': 'off',
      'dynamic-text': 'Default message',
    },
  }),
  schema: flags,
  onExposure: (flag, variant, context) => {
    // Track to your analytics (Mixpanel, Amplitude, etc.)
    analytics.track('feature_flag_exposed', {
      flag: String(flag),
      variant,
      userId: context.userId,
    });
  },
});

// Important: Initialize before use
await flagClient.initialize();
```

**3. Wrap app with FlagProvider:**

```tsx
// App.tsx or layout.tsx (Next.js)
import { FlagProvider } from 'crucible-react';
import { flagClient } from './client';

function App() {
  return (
    <FlagProvider client={flagClient} context={{ userId: currentUser.id }}>
      <YourApp />
    </FlagProvider>
  );
}
```

**4. Use flags in components:**

```tsx
import { useFlag } from 'crucible-react';

function FeatureComponent() {
  const variant = useFlag('feature-name', 'control');

  if (variant === 'variant-a') {
    return <NewFeature />;
  }

  return <OldFeature />;
}
```

### Important Considerations

✅ **Always provide a default value** to `useFlag()` for SSR safety and fallback behavior

✅ **Initialize client before rendering** to avoid "Client not initialized" errors

✅ **Use `as const`** on flag definitions for proper TypeScript inference

✅ **Track exposures** via `onExposure` callback for experiment analytics

⚠️ **Don't initialize multiple clients** - create one client and reuse it

⚠️ **Don't call `useFlag` conditionally** - React hooks rules apply

⚠️ **Percentage rollouts require `userId`** - without it, falls back to default

## Advanced Usage

### Percentage Rollouts

Gradually release features to a percentage of users with deterministic bucketing:

```typescript
import { LocalAdapter } from 'crucible-adapter-local';

const client = createFlagClient({
  adapter: new LocalAdapter({
    flags: {
      'new-checkout': 'control',
    },
    rollouts: [
      {
        flag: 'new-checkout',
        percentage: 10, // 10% of users
        variant: 'variant-a',
      },
    ],
  }),
  schema: flags,
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

- `crucible-core` – Core client
- `crucible-react` – React hooks
- `crucible-adapter-local` – Local JSON adapter
- `crucible-adapter-launchdarkly` – LaunchDarkly adapter

## Examples

- [Next.js](./examples/nextjs) – App Router with SSR evaluation
- [Vite + React](./examples/vite-react) – Client-side SPA

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Dev mode (watch)
npm run dev
```

## Publishing (for maintainers)

1. Create a changeset:

   ```bash
   npx changeset
   ```

2. Version packages:

   ```bash
   npx changeset version
   ```

3. Publish to npm:

   ```bash
   npx changeset publish
   ```

4. Version packages:

   ```bash
   yarn changeset version
   ```

5. Publish to npm:
   ```bash
   yarn changeset publish
   ```

Or use the GitHub Actions workflow: **Actions → Publish → Run workflow**

## Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs.

## License

MIT
