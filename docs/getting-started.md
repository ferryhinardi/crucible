# Getting Started

This guide will help you integrate Crucible into your application in under 5 minutes.

## Prerequisites

- Node.js ≥ 20.x
- React ≥ 18.x (for React integration)
- TypeScript ≥ 5.x (recommended)

## Installation

```bash
# Using npm
npm install crucible-core crucible-react crucible-adapter-local

# Using yarn
yarn add crucible-core crucible-react crucible-adapter-local

# Using pnpm
pnpm add crucible-core crucible-react crucible-adapter-local
```

## Step-by-Step Setup

### 1. Define Your Flags

Create a central file for your feature flags (e.g., `src/flags.ts`):

```typescript
import { defineFlags } from 'crucible-core';

export const flags = defineFlags({
  // Boolean flags (on/off)
  'dark-mode': ['on', 'off'] as const,

  // Multi-variant A/B tests
  'checkout-flow': ['control', 'variant-a', 'variant-b'] as const,

  // Dynamic string values
  'promo-message': 'string' as const,

  // Numeric flags
  'max-items': 'number' as const,
});

export type AppFlags = typeof flags;
```

**Important**: Always use `as const` for proper TypeScript inference.

### 2. Initialize the Client

Create a client instance (e.g., `src/flagClient.ts`):

```typescript
import { createFlagClient } from 'crucible-core';
import { LocalAdapter } from 'crucible-adapter-local';
import { flags } from './flags';

export const flagClient = createFlagClient({
  adapter: new LocalAdapter<typeof flags>({
    flags: {
      'dark-mode': 'off',
      'checkout-flow': 'control',
      'promo-message': 'Welcome! Get 10% off',
      'max-items': 100,
    },
    // Optional: Percentage rollouts
    rollouts: [
      {
        flag: 'dark-mode',
        percentage: 50, // 50% of users
        variant: 'on',
      },
    ],
    // Optional: Custom rules
    rules: [
      {
        flag: 'checkout-flow',
        match: (ctx) => ctx.userId?.startsWith('internal-'),
        variant: 'variant-b',
      },
    ],
  }),
  schema: flags,
  // Optional: Track exposures
  onExposure: (flag, variant, context) => {
    analytics.track('feature_flag_viewed', {
      flag: String(flag),
      variant,
      userId: context.userId,
    });
  },
});

// Initialize before use
await flagClient.initialize();
```

### 3. Wrap Your App

For React applications:

```tsx
// App.tsx or _app.tsx (Next.js)
import { FlagProvider } from 'crucible-react';
import { flagClient } from './flagClient';

function App() {
  return (
    <FlagProvider
      client={flagClient}
      context={{
        userId: getCurrentUser()?.id,
        attributes: { country: 'US' },
      }}
    >
      <YourApp />
    </FlagProvider>
  );
}
```

For Next.js App Router:

```tsx
// app/layout.tsx
import { FlagProvider } from 'crucible-react';
import { flagClient } from '@/lib/flagClient';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <FlagProvider client={flagClient} context={{ userId: 'demo' }}>
          {children}
        </FlagProvider>
      </body>
    </html>
  );
}
```

### 4. Use Flags in Components

```tsx
import { useFlag } from 'crucible-react';

function CheckoutPage() {
  const flow = useFlag('checkout-flow', 'control');

  switch (flow) {
    case 'variant-a':
      return <FastCheckout />;
    case 'variant-b':
      return <ExpressCheckout />;
    default:
      return <StandardCheckout />;
  }
}

function Header() {
  const darkMode = useFlag('dark-mode', 'off');
  const message = useFlag('promo-message', 'Welcome!');

  return (
    <header className={darkMode === 'on' ? 'dark' : 'light'}>
      <div>{message}</div>
    </header>
  );
}
```

## Server-Side Evaluation (Next.js)

For SSR without flicker:

```tsx
// app/page.tsx
import { flagClient } from '@/lib/flagClient';

export default async function Page() {
  // Evaluate on server
  const flow = await flagClient.evaluate('checkout-flow', { userId: 'server-user' }, 'control');

  return <CheckoutPage initialFlow={flow} />;
}
```

## Next Steps

- [Learn about percentage rollouts](./core-concepts.md#percentage-rollouts)
- [Implement custom rules](./core-concepts.md#rules)
- [Switch to a production adapter](./adapters/README.md)
- [Set up analytics tracking](./core-concepts.md#analytics)
- [Browse examples](./examples/README.md)

## Common Pitfalls

❌ **Don't**: Initialize multiple clients

```typescript
// Bad - creates multiple instances
const client1 = createFlagClient(...);
const client2 = createFlagClient(...);
```

✅ **Do**: Create once, reuse everywhere

```typescript
// Good - single instance exported
export const flagClient = createFlagClient(...);
```

❌ **Don't**: Call useFlag conditionally

```typescript
// Bad - breaks React rules
if (condition) {
  const flag = useFlag('my-flag');
}
```

✅ **Do**: Always call hooks unconditionally

```typescript
// Good
const flag = useFlag('my-flag');
if (condition && flag === 'on') { ... }
```

❌ **Don't**: Forget to initialize

```typescript
// Bad - will throw error
const client = createFlagClient(...);
// Missing: await client.initialize();
```

✅ **Do**: Initialize before rendering

```typescript
// Good
const client = createFlagClient(...);
await client.initialize();
```
