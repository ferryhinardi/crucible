import type { FlagSchema, FlagVariants, EvaluationContext, FlagClient } from 'crucible-core';

/**
 * Base FlagClient type that accepts any schema.
 */
type AnyFlagClient = FlagClient<FlagSchema>;

/**
 * Server-side flag client storage.
 * This uses a module-level variable which works in Node.js server environments.
 * For edge runtimes or environments that require request isolation,
 * consider using AsyncLocalStorage.
 */
let serverClient: AnyFlagClient | null = null;
let serverContext: EvaluationContext = {};

/**
 * Set the flag client for server-side usage.
 * Call this once during server initialization (e.g., in instrumentation.ts or server setup).
 *
 * @example
 * ```ts
 * // In instrumentation.ts or server setup
 * import { setServerClient } from 'crucible-react/server';
 * import { createFlagClient } from 'crucible-core';
 * import { LaunchDarklyAdapter } from 'crucible-launchdarkly';
 *
 * const client = createFlagClient({
 *   adapter: new LaunchDarklyAdapter({ sdkKey: process.env.LD_SDK_KEY }),
 * });
 *
 * await client.initialize();
 * setServerClient(client);
 * ```
 */
export function setServerClient(client: AnyFlagClient, context: EvaluationContext = {}): void {
  serverClient = client;
  serverContext = context;
}

/**
 * Update the server-side evaluation context.
 * Useful for setting user-specific context per request.
 *
 * @example
 * ```ts
 * // In a middleware or layout
 * import { setServerContext } from 'crucible-react/server';
 *
 * setServerContext({ userId: user.id, attributes: { plan: user.plan } });
 * ```
 */
export function setServerContext(context: EvaluationContext): void {
  serverContext = context;
}

/**
 * Get the current server-side evaluation context.
 */
export function getServerContext(): EvaluationContext {
  return serverContext;
}

/**
 * Get the server-side flag client.
 * Returns null if not set.
 */
export function getServerClient(): AnyFlagClient | null {
  return serverClient;
}

/**
 * Evaluate a feature flag on the server.
 * This is an async function designed for use in React Server Components.
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { getFlag } from 'crucible-react/server';
 *
 * export default async function Page() {
 *   const showNewFeature = await getFlag('new-feature', false);
 *
 *   return (
 *     <div>
 *       {showNewFeature ? <NewFeature /> : <LegacyFeature />}
 *     </div>
 *   );
 * }
 * ```
 */
export async function getFlag<T extends FlagSchema, K extends keyof T>(
  flag: K,
  defaultValue?: FlagVariants<T>[K],
  context?: EvaluationContext
): Promise<FlagVariants<T>[K] | undefined> {
  if (!serverClient) {
    console.warn('[Crucible] getFlag called before setServerClient. Returning default value.');
    return defaultValue;
  }

  try {
    const evalContext = context ?? serverContext;
    const value = await serverClient.evaluate(String(flag), evalContext, defaultValue);
    return value as FlagVariants<T>[K];
  } catch (error) {
    console.error('[Crucible] Error evaluating flag on server:', error);
    return defaultValue;
  }
}

/**
 * Configuration for a single flag in batch evaluation.
 */
export type ServerFlagConfig<T extends FlagSchema, K extends keyof T> = {
  flag: K;
  defaultValue?: FlagVariants<T>[K];
};

/**
 * Evaluate multiple feature flags on the server in parallel.
 * More efficient than calling getFlag multiple times sequentially.
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { getFlags } from 'crucible-react/server';
 *
 * export default async function Page() {
 *   const flags = await getFlags([
 *     { flag: 'dark-mode', defaultValue: false },
 *     { flag: 'new-pricing', defaultValue: false },
 *     { flag: 'experiment-variant', defaultValue: 'control' },
 *   ]);
 *
 *   return (
 *     <div className={flags['dark-mode'] ? 'dark' : 'light'}>
 *       {flags['new-pricing'] && <NewPricing />}
 *       <Experiment variant={flags['experiment-variant']} />
 *     </div>
 *   );
 * }
 * ```
 */
export async function getFlags<T extends FlagSchema, K extends keyof T = keyof T>(
  flags: ServerFlagConfig<T, K>[],
  context?: EvaluationContext
): Promise<Partial<{ [P in K]: FlagVariants<T>[P] }>> {
  if (!serverClient) {
    console.warn('[Crucible] getFlags called before setServerClient. Returning default values.');
    return flags.reduce(
      (acc, { flag, defaultValue }) => {
        if (defaultValue !== undefined) {
          acc[flag] = defaultValue;
        }
        return acc;
      },
      {} as Partial<{ [P in K]: FlagVariants<T>[P] }>
    );
  }

  const evalContext = context ?? serverContext;

  try {
    const evaluations = flags.map(async ({ flag, defaultValue }) => {
      const value = await serverClient!.evaluate(String(flag), evalContext, defaultValue);
      return { flag, value } as { flag: K; value: FlagVariants<T>[K] };
    });

    const results = await Promise.all(evaluations);

    return results.reduce(
      (acc, { flag, value }) => {
        acc[flag] = value;
        return acc;
      },
      {} as Partial<{ [P in K]: FlagVariants<T>[P] }>
    );
  } catch (error) {
    console.error('[Crucible] Error evaluating flags on server:', error);
    // Return default values on error
    return flags.reduce(
      (acc, { flag, defaultValue }) => {
        if (defaultValue !== undefined) {
          acc[flag] = defaultValue;
        }
        return acc;
      },
      {} as Partial<{ [P in K]: FlagVariants<T>[P] }>
    );
  }
}

/**
 * Preload flags for use in Server Components.
 * This can be called in layouts to preload flags before they're needed.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * import { preloadFlags } from 'crucible-react/server';
 *
 * export default async function Layout({ children }) {
 *   // Preload commonly used flags
 *   await preloadFlags(['dark-mode', 'new-feature', 'experiment-variant']);
 *
 *   return <>{children}</>;
 * }
 * ```
 */
export async function preloadFlags<T extends FlagSchema, K extends keyof T = keyof T>(
  flagNames: K[],
  context?: EvaluationContext
): Promise<void> {
  if (!serverClient) {
    console.warn('[Crucible] preloadFlags called before setServerClient.');
    return;
  }

  const evalContext = context ?? serverContext;

  try {
    await Promise.all(
      flagNames.map((flag) => serverClient!.evaluate(String(flag), evalContext, undefined))
    );
  } catch (error) {
    console.error('[Crucible] Error preloading flags:', error);
  }
}
