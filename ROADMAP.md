# Crucible v0.2.0 Roadmap

> **Current Version:** 0.1.1  
> **Target Version:** 0.2.0  
> **Estimated Timeline:** 4-6 weeks

## Overview

This roadmap outlines the improvements and features planned for Crucible v0.2.0. The plan is organized into phases with prioritized tasks.

---

## Phase 1: Critical Fixes & Technical Debt (Week 1)

### 1.1 Fix CI/CD Pipeline ⚠️ **HIGH PRIORITY**

The CI/CD workflows currently use `yarn` but the project has standardized on `npm`.

**Files to update:**

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `.github/workflows/bundle-size.yml`

**Changes required:**

```yaml
# Before
cache: 'yarn'
run: yarn install --frozen-lockfile
run: yarn build

# After
cache: 'npm'
run: npm ci
run: npm run build
```

**Tasks:**

- [ ] Update `ci.yml` to use npm
- [ ] Update `publish.yml` to use npm
- [ ] Update `bundle-size.yml` to use npm
- [ ] Test CI pipeline with a PR

---

### 1.2 Fix Documentation Inconsistencies ⚠️ **HIGH PRIORITY**

**README package name fix:**
The README references scoped packages (`@crucible/core`) but actual npm packages are unscoped (`crucible-core`).

**Tasks:**

- [ ] Update README.md to use correct package names
- [ ] Verify all installation instructions are accurate

---

### 1.3 Fix Vite CJS Deprecation Warning

Test output shows deprecation warning for Vite's CJS Node API.

**Tasks:**

- [ ] Update vitest.config.ts to use ESM properly
- [ ] Ensure all config files use ES modules

---

## Phase 2: Complete Documentation (Week 1-2)

### 2.1 Missing Documentation Files

The `docs/README.md` references several documentation files that don't exist:

| Document                  | Priority | Description                           |
| ------------------------- | -------- | ------------------------------------- |
| `docs/core-concepts.md`   | High     | Explain adapters, flags, contexts     |
| `docs/api-reference.md`   | High     | Full API documentation                |
| `docs/adapters/README.md` | Medium   | Guide to creating custom adapters     |
| `docs/examples/README.md` | Medium   | Overview of example projects          |
| `docs/migration.md`       | Low      | Migration guide (for future versions) |

**Tasks:**

- [ ] Create `docs/core-concepts.md`
- [ ] Create `docs/api-reference.md`
- [ ] Create `docs/adapters/README.md`
- [ ] Create `docs/examples/README.md`
- [ ] Update `docs/README.md` links

---

### 2.2 Add Missing Examples

README mentions "Vite + React" example but only Next.js exists.

**Tasks:**

- [ ] Create `examples/vite-react/` example project
- [ ] Add basic Vite + React setup with Crucible
- [ ] Include README with setup instructions

---

## Phase 3: New Features (Week 2-3)

### 3.1 New Adapters

**Potential adapters to add:**

| Adapter                       | Priority | Description                       |
| ----------------------------- | -------- | --------------------------------- |
| `crucible-adapter-posthog`    | High     | PostHog feature flags integration |
| `crucible-adapter-unleash`    | Medium   | Unleash open-source integration   |
| `crucible-adapter-growthbook` | Medium   | GrowthBook integration            |
| `crucible-adapter-split`      | Low      | Split.io integration              |

**Tasks:**

- [ ] Research PostHog SDK API
- [ ] Implement `crucible-adapter-posthog`
- [ ] Add comprehensive tests
- [ ] Document usage

---

### 3.2 Enhanced React Hooks

**New hooks to consider:**

```typescript
// Batch flag evaluation for performance
function useFlags<K extends keyof T>(keys: K[]): Record<K, T[K]>;

// Flag with exposure tracking
function useFlagWithExposure<K extends keyof T>(
  key: K,
  options?: { trackOnRender?: boolean }
): T[K];

// Prefetch flags for SSR
function usePrefetchFlags(): Promise<void>;
```

**Tasks:**

- [ ] Implement `useFlags()` for batch evaluation
- [ ] Add exposure tracking utilities
- [ ] Add SSR prefetching helpers

---

### 3.3 Server Components Support (Next.js App Router)

Add first-class support for React Server Components:

```typescript
// Server-side flag evaluation
import { getFlag } from 'crucible-react/server';

async function ServerComponent() {
  const showFeature = await getFlag('new-feature');
  // ...
}
```

**Tasks:**

- [ ] Research RSC patterns for feature flags
- [ ] Create `crucible-react/server` entry point
- [ ] Add server-side utilities
- [ ] Update Next.js example with App Router

---

### 3.4 Analytics & Observability

**Features:**

- Exposure logging callback
- Flag evaluation metrics
- Debug mode with detailed logging

```typescript
const client = createFlagClient({
  adapter,
  onExposure: (flag, value, context) => {
    analytics.track('feature_exposure', { flag, value });
  },
  debug: process.env.NODE_ENV === 'development',
});
```

**Tasks:**

- [ ] Add `onExposure` callback to core client
- [ ] Add debug mode with console logging
- [ ] Document analytics integration patterns

---

## Phase 4: Developer Experience (Week 3-4)

### 4.1 CLI Tool

Create a CLI for common operations:

```bash
# Initialize crucible in a project
npx crucible init

# Generate type definitions from remote flags
npx crucible codegen --adapter launchdarkly

# Validate flag configuration
npx crucible validate
```

**Tasks:**

- [ ] Create `crucible-cli` package
- [ ] Implement `init` command
- [ ] Implement `codegen` command for LaunchDarkly
- [ ] Implement `validate` command

---

### 4.2 DevTools

Browser extension or overlay for debugging flags:

**Features:**

- View all current flag values
- Override flags in development
- View evaluation context
- See exposure history

**Tasks:**

- [ ] Create devtools React component
- [ ] Add localStorage override support
- [ ] Design and implement UI overlay

---

### 4.3 TypeScript Improvements

- Improve type inference for flag schemas
- Add stricter typing for adapters
- Export utility types for consumers

**Tasks:**

- [ ] Review and improve type definitions
- [ ] Add type tests with `tsd`
- [ ] Document TypeScript best practices

---

## Phase 5: Testing & Quality (Week 4)

### 5.1 Integration Tests

**Tasks:**

- [ ] Add integration tests for Next.js example
- [ ] Add E2E tests with Playwright
- [ ] Test SSR hydration scenarios
- [ ] Test real LaunchDarkly integration (with test account)

---

### 5.2 Performance Benchmarks

**Tasks:**

- [ ] Create performance benchmark suite
- [ ] Measure client initialization time
- [ ] Measure flag evaluation time
- [ ] Document performance characteristics
- [ ] Add bundle size monitoring improvements

---

### 5.3 Improve Test Coverage

**Current coverage areas to expand:**

- Edge cases in context merging
- Error boundary behavior
- Memory leak scenarios
- Concurrent evaluation handling

**Tasks:**

- [ ] Add stress tests for concurrent evaluations
- [ ] Add tests for memory cleanup
- [ ] Achieve 90%+ code coverage

---

## Phase 6: Release Preparation (Week 5)

### 6.1 Pre-release Checklist

- [ ] All CI checks passing
- [ ] Documentation complete and reviewed
- [ ] CHANGELOG updated with all changes
- [ ] All examples working and tested
- [ ] Bundle size within targets (< 3KB core, < 5KB with adapters)
- [ ] No breaking changes (or documented migration path)
- [ ] npm publish dry-run successful

---

### 6.2 Release Tasks

1. **Version bump:**

   ```bash
   npx changeset
   # Select packages and version bump type (minor for 0.2.0)
   ```

2. **Create release PR:**

   ```bash
   npx changeset version
   git add .
   git commit -m "chore: version packages for v0.2.0"
   ```

3. **Publish:**

   ```bash
   npm run build
   npm test
   npx changeset publish
   ```

4. **Post-release:**
   - [ ] Create GitHub release with notes
   - [ ] Update documentation site (if applicable)
   - [ ] Announce on social media/blogs
   - [ ] Monitor for issues

---

## Summary: Priority Matrix

| Priority    | Task                      | Effort | Impact |
| ----------- | ------------------------- | ------ | ------ |
| 🔴 Critical | Fix CI/CD (yarn → npm)    | Low    | High   |
| 🔴 Critical | Fix README package names  | Low    | High   |
| 🟠 High     | Complete missing docs     | Medium | High   |
| 🟠 High     | Add Vite example          | Medium | Medium |
| 🟠 High     | PostHog adapter           | Medium | High   |
| 🟡 Medium   | Server Components support | High   | High   |
| 🟡 Medium   | Analytics callbacks       | Medium | Medium |
| 🟡 Medium   | DevTools                  | High   | Medium |
| 🟢 Low      | CLI tool                  | High   | Medium |
| 🟢 Low      | Additional adapters       | Medium | Low    |

---

## Quick Wins (Can be done immediately)

1. ✅ Fix CI/CD workflows (yarn → npm)
2. ✅ Fix README package names
3. ✅ Fix Vite CJS deprecation
4. ✅ Create core-concepts.md
5. ✅ Create api-reference.md

---

## Version Milestones

| Version | Focus                    | Target Date |
| ------- | ------------------------ | ----------- |
| 0.1.2   | Bug fixes + CI/CD fix    | Week 1      |
| 0.2.0   | Docs + New adapter + RSC | Week 4      |
| 0.3.0   | DevTools + CLI           | Week 8      |
| 1.0.0   | Stable release           | TBD         |

---

## Contributing

To contribute to any of these improvements:

1. Check the [Issues](https://github.com/your-repo/crucible/issues) for existing work
2. Comment on an issue to claim it
3. Create a PR with your changes
4. Ensure all tests pass and coverage is maintained

---

_Last updated: January 16, 2026_
