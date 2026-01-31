# Example Projects

This directory contains example projects demonstrating how to use Crucible in different environments.

## Overview

| Example                                      | Framework       | Features                                         |
| -------------------------------------------- | --------------- | ------------------------------------------------ |
| [Next.js App Router](../../examples/nextjs/) | Next.js 14      | App Router, Client Components, FlagProvider      |
| [Vite + React](../../examples/vite-react/)   | Vite + React 18 | SPA, hooks, targeting rules, percentage rollouts |

## Next.js Example (App Router)

A minimal Next.js 14 application demonstrating Crucible with the App Router and Client Components.

### Features

- Next.js 14 with App Router
- Client-side flag evaluation with `FlagProvider`
- Type-safe flag definitions
- Targeting rules based on user attributes
- Exposure tracking for analytics

### Running the Example

```bash
cd examples/nextjs
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the demo.

### Key Files

#### `app/client.ts` - Flag Configuration

Defines the flag schema and creates the client with targeting rules:

```typescript
import { defineFlags, createFlagClient } from 'crucible-core';
import { LocalAdapter } from 'crucible-adapter-local';

const flags = defineFlags({
  'checkout-redesign': ['control', 'variant-a', 'variant-b'] as const,
  'express-payment': ['on', 'off'] as const,
  'promo-banner-text': 'string' as const,
});

export const client = createFlagClient({
  adapter: new LocalAdapter<typeof flags>({
    flags: {
      'checkout-redesign': 'variant-a',
      'express-payment': 'on',
      'promo-banner-text': 'Get 20% off your first order!',
    },
    rules: [
      {
        flag: 'checkout-redesign',
        match: (ctx) => ctx.userId?.startsWith('vip-') ?? false,
        variant: 'variant-b',
      },
    ],
  }),
  schema: flags,
  onExposure: (flag, variant, context) => {
    console.log('[Analytics]', { flag, variant, userId: context.userId });
  },
});

client.initialize();
```

#### `app/providers.tsx` - React Provider Setup

Wraps the app with `FlagProvider` for React hook access:

```typescript
'use client';

import { ReactNode } from 'react';
import { FlagProvider } from 'crucible-react';
import { client } from './client';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FlagProvider client={client} context={{ userId: 'demo-user' }}>
      {children}
    </FlagProvider>
  );
}
```

#### `app/layout.tsx` - Root Layout

Integrates the providers into the Next.js layout:

```typescript
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

#### `app/page.tsx` - Using Flags

Demonstrates the `useFlag` hook in a Client Component:

```typescript
'use client';

import { useFlag } from 'crucible-react';

export default function Home() {
  const checkoutVariant = useFlag('checkout-redesign', 'control');
  const expressPayment = useFlag('express-payment', 'off');

  return (
    <main>
      <h1>Crucible Next.js Example</h1>
      <p>Checkout Redesign: {checkoutVariant}</p>
      {checkoutVariant === 'variant-a' && <p>New checkout experience!</p>}
      <p>Express Payment: {expressPayment}</p>
    </main>
  );
}
```

## Vite + React Example

A full-featured React SPA demonstrating advanced Crucible patterns.

For detailed documentation, see the [Vite React Example README](../../examples/vite-react/README.md).

### Features

- Vite build tooling with React 18
- Multiple hook patterns: `useFlag()`, `useFlagWithStatus()`, `useFlagContext()`
- Dynamic user context switching
- Targeting rules with complex matching
- Percentage rollouts with deterministic hashing
- Loading states and error handling

### Running the Example

```bash
cd examples/vite-react
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to see the demo.

### Key Files

| File           | Description                               |
| -------------- | ----------------------------------------- |
| `src/flags.ts` | Flag schema definition and client setup   |
| `src/App.tsx`  | Main application with flag usage examples |
| `src/main.tsx` | React entry point with FlagProvider       |

## Common Patterns

### Pattern 1: Variant-based Rendering

```tsx
const variant = useFlag('feature-experiment', 'control');

switch (variant) {
  case 'control':
    return <ControlExperience />;
  case 'variant-a':
    return <VariantAExperience />;
  case 'variant-b':
    return <VariantBExperience />;
}
```

### Pattern 2: Boolean Feature Gates

```tsx
const isEnabled = useFlag('new-dashboard', false);

return <div>{isEnabled ? <NewDashboard /> : <LegacyDashboard />}</div>;
```

### Pattern 3: Dynamic Configuration

```tsx
const maxItems = useFlag('max-cart-items', 10);
const promoText = useFlag('promo-banner-text', 'Welcome!');

return (
  <div>
    <Banner text={promoText} />
    <Cart maxItems={maxItems} />
  </div>
);
```

### Pattern 4: Loading States with `useFlagWithStatus`

```tsx
const { value, status } = useFlagWithStatus('slow-feature', 'off');

if (status === 'loading') {
  return <Skeleton />;
}

return value === 'on' ? <Feature /> : null;
```

### Pattern 5: Batch Evaluation with `useFlags`

```tsx
const flags = useFlags(['feature-a', 'feature-b', 'feature-c'], {
  'feature-a': 'off',
  'feature-b': false,
  'feature-c': 10,
});

return (
  <div>
    <Feature enabled={flags['feature-a'] === 'on'} />
    <Option active={flags['feature-b']} />
    <Limit max={flags['feature-c']} />
  </div>
);
```

## Adding New Examples

To add a new example project:

1. Create a new directory under `examples/`
2. Set up the framework with Crucible dependencies
3. Add a `README.md` documenting the example
4. Update this file to include the new example

## Need Help?

- See [Getting Started](../getting-started.md) for setup instructions
- See [Core Concepts](../core-concepts.md) for architecture overview
- See [API Reference](../api-reference.md) for detailed hook documentation
