# Crucible

Type-safe, provider-agnostic feature flags and A/B testing for React/Next.js.

## Features

- 🔒 **Type-safe** – Autocomplete for flag names + variants
- 🔌 **Adapter pattern** – Plug any backend (LaunchDarkly, Split, custom API, local JSON)
- ⚡ **SSR-first** – Server-side evaluation, zero flicker
- 🪶 **Tiny** – <3kB core
- 📊 **Analytics hooks** – Auto-track exposures

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
