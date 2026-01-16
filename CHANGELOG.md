# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

---

## [0.1.1] - 2026-01-16

### Added

- Export `FlagClient<T>` interface from `crucible-core` for reuse across packages
- Comprehensive LaunchDarkly adapter tests (100% coverage)
- React provider tests with proper jsdom environment
- `close()` method to local adapter for `FlagAdapter` interface compliance

### Changed

- Update `crucible-react` to import `FlagClient` type from `crucible-core` instead of defining locally
- Update `@typescript-eslint` to v7 for TypeScript 5.9 support
- Standardize on npm as package manager (removed yarn.lock)

### Fixed

- Deep context merging - fix shallow context merge to properly deep merge attributes in core
- Example Next.js app imports updated to use correct unscoped package names (`crucible-*`)
- Test expectations for context merging with properly nested attributes

### Removed

- Accidentally committed Next.js build artifacts (`.next/` directory)
- Unused `packages/react/vitest.config.ts`

---

## [0.1.0] - 2026-01-15

### Added

- Initial release of Crucible feature flag library
- **crucible-core**: Core feature flag client with type-safe flag definitions
  - Generic `FlagClient<T>` for type-safe flag access
  - Context management with user attributes
  - Pluggable adapter architecture
- **crucible-react**: React bindings for Crucible
  - `CrucibleProvider` context provider
  - `useFlag(key)` hook for accessing individual flags
  - `useFlags()` hook for accessing all flags
  - `useCrucible()` hook for accessing the client instance
- **crucible-adapter-local**: Local/static adapter for development and testing
  - In-memory flag storage
  - Override support for testing scenarios
- **crucible-adapter-launchdarkly**: LaunchDarkly integration adapter
  - Full LaunchDarkly SDK integration
  - Real-time flag updates support

### Notes

- Packages published with unscoped names for simpler imports
- Available on npm: `crucible-core`, `crucible-react`, `crucible-adapter-local`, `crucible-adapter-launchdarkly`
