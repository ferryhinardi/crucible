# Vite + React Example

This example demonstrates how to use Crucible with Vite and React for type-safe feature flags.

## Features Demonstrated

- **Flag Schema Definition** - Define flags with different types (variants, boolean, string)
- **LocalAdapter with Rules** - Configure flags with targeting rules and percentage rollouts
- **useFlag()** - Basic flag evaluation with full type safety
- **useFlagWithStatus()** - Flag evaluation with loading/error states
- **useFlagContext()** - Access the current evaluation context
- **Dynamic User Context** - Switch users and attributes at runtime
- **Exposure Tracking** - Analytics callback for flag evaluations

## Getting Started

### Prerequisites

Make sure you have the Crucible packages built first. From the monorepo root:

```bash
npm install
npm run build
```

### Running the Example

```bash
cd examples/vite-react
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
examples/vite-react/
├── src/
│   ├── flags.ts      # Flag schema and client configuration
│   ├── main.tsx      # React entry point with FlagProvider
│   └── App.tsx       # Main component demonstrating all features
├── index.html        # HTML entry point
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # Dependencies
```

## Key Concepts

### 1. Define Your Flag Schema

```typescript
// src/flags.ts
import { defineFlags } from 'crucible-core';

export const flags = defineFlags({
  checkoutVersion: {
    description: 'Checkout flow version',
    variants: ['control', 'single-page', 'multi-step'] as const,
    defaultVariant: 'control',
  },
  showBanner: {
    description: 'Show promotional banner',
    variants: ['on', 'off'] as const,
    defaultVariant: 'off',
  },
});
```

### 2. Configure the Adapter

```typescript
import { LocalAdapter } from 'crucible-adapter-local';

const adapter = new LocalAdapter(flags, {
  flags: {
    checkoutVersion: 'single-page',
    showBanner: 'on',
  },
  rules: [
    {
      flagKey: 'checkoutVersion',
      conditions: [{ attribute: 'tier', operator: 'equals', value: 'vip' }],
      variant: 'multi-step',
    },
  ],
  rollouts: [
    {
      flagKey: 'showBanner',
      percentage: 50,
      variant: 'on',
    },
  ],
});
```

### 3. Use Flags in Components

```tsx
import { useFlag, useFlagWithStatus } from 'crucible-react';
import { flags } from './flags';

function MyComponent() {
  // Basic usage - returns the variant value
  const checkout = useFlag(flags.checkoutVersion);

  // With status - includes loading/error states
  const { variant, isLoading, error } = useFlagWithStatus(flags.showBanner);

  if (checkout === 'multi-step') {
    return <MultiStepCheckout />;
  }

  return <SinglePageCheckout />;
}
```

## Try It Out

1. **Change User Context** - Use the controls to change user ID, tier, and country
2. **Quick Presets** - Click preset buttons to quickly switch between user types
3. **Watch Console** - See exposure tracking events logged to the console
4. **Observe Changes** - Watch how flag values change based on rules and rollouts

## Learn More

- [Crucible Documentation](../../docs/README.md)
- [Core Concepts](../../docs/core-concepts.md)
- [API Reference](../../docs/api-reference.md)
