# crucible-adapter-posthog

PostHog adapter for [Crucible](https://github.com/ferryhinardi/crucible) - a type-safe, provider-agnostic feature flags library.

## Installation

```bash
pnpm add crucible-core crucible-adapter-posthog
# or
npm install crucible-core crucible-adapter-posthog
# or
yarn add crucible-core crucible-adapter-posthog
```

## Usage

### Basic Setup

```typescript
import { defineFlags, createFlagClient } from 'crucible-core';
import { PostHogAdapter } from 'crucible-adapter-posthog';

// Define your flags schema
const flags = defineFlags({
  darkMode: ['enabled', 'disabled'],
  newCheckout: 'boolean',
  pricingTier: ['free', 'basic', 'premium'],
});

// Create the adapter
const adapter = new PostHogAdapter({
  apiKey: 'phc_your_project_api_key',
  host: 'https://app.posthog.com', // optional, this is the default
});

// Create the client
const client = createFlagClient({
  adapter,
  schema: flags,
});

// Initialize and use
await client.initialize();

const darkMode = await client.evaluate('darkMode', { userId: 'user-123' });
console.log(darkMode); // 'enabled' or 'disabled'
```

### With Local Evaluation

For faster flag evaluations, you can enable local evaluation by providing a personal API key:

```typescript
const adapter = new PostHogAdapter({
  apiKey: 'phc_your_project_api_key',
  personalApiKey: 'phx_your_personal_api_key', // Enables local evaluation
  host: 'https://app.posthog.com',
});
```

Local evaluation downloads feature flag definitions and evaluates them locally, which is much faster than making a network request for each evaluation.

### With User Properties

Pass user properties for targeting:

```typescript
const variant = await client.evaluate('newCheckout', {
  userId: 'user-123',
  attributes: {
    email: 'user@example.com',
    plan: 'premium',
    country: 'US',
  },
});
```

### With Groups (B2B)

For B2B use cases, you can pass group information using the `$group_` prefix:

```typescript
const variant = await client.evaluate('enterpriseFeature', {
  userId: 'user-123',
  attributes: {
    plan: 'enterprise',
    $group_company: 'company-abc',
    $group_team: 'team-xyz',
  },
});
```

### Tracking Events

The PostHog adapter provides additional methods for event tracking:

```typescript
// Capture an event
adapter.capture('user-123', 'feature_used', {
  feature: 'newCheckout',
  variant: 'enabled',
});

// Identify a user
adapter.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium',
});
```

## Configuration Options

| Option                        | Type     | Default                     | Description                           |
| ----------------------------- | -------- | --------------------------- | ------------------------------------- |
| `apiKey`                      | `string` | Required                    | Your PostHog project API key          |
| `host`                        | `string` | `'https://app.posthog.com'` | PostHog host URL                      |
| `personalApiKey`              | `string` | -                           | Personal API key for local evaluation |
| `featureFlagRequestTimeoutMs` | `number` | `10000`                     | Feature flag request timeout in ms    |
| `flushInterval`               | `number` | `10000`                     | Event flush interval in ms            |
| `flushAt`                     | `number` | `1000`                      | Event flush batch size                |

## With React

Use with `crucible-react` for React integration:

```tsx
import { CrucibleProvider, useFlag } from 'crucible-react';
import { createFlagClient } from 'crucible-core';
import { PostHogAdapter } from 'crucible-adapter-posthog';

const client = createFlagClient({
  adapter: new PostHogAdapter({ apiKey: 'phc_...' }),
  schema: flags,
});

function App() {
  return (
    <CrucibleProvider client={client}>
      <MyComponent />
    </CrucibleProvider>
  );
}

function MyComponent() {
  const { value, loading } = useFlag('darkMode', 'disabled');

  if (loading) return <div>Loading...</div>;

  return <div>Dark mode: {value}</div>;
}
```

## License

MIT
