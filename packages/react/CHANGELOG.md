# crucible-react

## 0.2.0

### Minor Changes

- 98d3034: Initial release of Crucible feature flags library
  - Type-safe feature flag definitions with full TypeScript support
  - Provider-agnostic core with adapter pattern
  - React hooks (FlagProvider, useFlag) with SSR support
  - Local adapter for development with percentage rollouts
  - LaunchDarkly adapter for production
  - Deterministic hash-based user bucketing
  - Rule-based overrides and targeting
  - Analytics exposure tracking

- ## v0.2.0 - Comprehensive Improvements

  ### Core (`crucible-core`)
  - **Configurable Logger**: New `Logger` class with `setLogLevel()` for debug, info, warn, error, and silent modes
  - **Custom Error Types**: `FlagError` and `AdapterError` for better error handling and debugging
  - **JSDoc Documentation**: Comprehensive API documentation for all public exports

  ### React (`crucible-react`)
  - **`useFlags()` Hook**: Batch hook to retrieve multiple flags at once, reducing re-renders
  - **Server Components Support**: New `server.ts` module with `getFlag()`, `getFlags()`, `getAllFlags()`, and `createServerFlagClient()` for RSC/Next.js App Router
  - **JSDoc Documentation**: Full documentation for all hooks and components

  ### New Adapter: PostHog (`crucible-adapter-posthog`)
  - Full PostHog feature flags integration
  - Percentage rollouts with deterministic user bucketing
  - Rule-based targeting and overrides
  - Analytics exposure tracking support

  ### Adapters (`crucible-adapter-local`, `crucible-adapter-launchdarkly`)
  - Added JSDoc documentation for all public APIs

  ### Developer Experience
  - Migrated from npm/yarn to pnpm workspaces
  - Updated Turbo to v2 with new syntax
  - ESLint flat config with react-hooks plugin
  - Pre-commit hooks with husky and lint-staged
  - Dependabot configuration for automated updates
  - Comprehensive documentation updates

### Patch Changes

- Updated dependencies [98d3034]
- Updated dependencies
  - crucible-core@0.2.0
