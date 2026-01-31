'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { FlagSchema, FlagVariants, EvaluationContext, FlagClient } from 'crucible-core';

/**
 * Base FlagClient type that accepts any schema.
 * This allows FlagProvider to accept typed clients from createFlagClient<T>.
 */
type AnyFlagClient = FlagClient<FlagSchema>;

/**
 * Status information for flag evaluation operations.
 *
 * Use this type with {@link useFlagWithStatus} to get loading and error states
 * alongside flag values.
 *
 * @example
 * ```tsx
 * const { value, status } = useFlagWithStatus<MyFlags, 'newFeature'>('newFeature', false);
 *
 * if (status.isLoading) return <Spinner />;
 * if (status.error) return <ErrorMessage error={status.error} />;
 *
 * return value ? <NewFeature /> : <OldFeature />;
 * ```
 */
export type FlagStatus = {
  /** Whether the flag evaluation is currently in progress */
  isLoading: boolean;
  /** Error that occurred during evaluation, or null if successful */
  error: Error | null;
};

const FlagContext = createContext<{
  client: AnyFlagClient | null;
  context: EvaluationContext;
}>({ client: null, context: {} });

/**
 * Provider component that makes the flag client available to all child components.
 *
 * Wrap your application (or a subtree) with `FlagProvider` to enable the use of
 * flag hooks like {@link useFlag}, {@link useFlagWithStatus}, and {@link useFlags}.
 *
 * @param props - Provider props
 * @param props.client - The initialized flag client from `createFlagClient()`
 * @param props.context - Optional evaluation context (userId, attributes) applied to all flag evaluations
 * @param props.children - Child components that will have access to the flag client
 *
 * @example
 * ```tsx
 * import { createFlagClient, defineFlags } from 'crucible-core';
 * import { LocalAdapter } from 'crucible-adapter-local';
 * import { FlagProvider } from 'crucible-react';
 *
 * const flags = defineFlags({
 *   darkMode: { variants: [true, false] },
 * });
 *
 * const adapter = new LocalAdapter({ flags, defaults: { darkMode: false } });
 * const client = createFlagClient({ flags, adapter });
 *
 * await client.initialize();
 *
 * function App() {
 *   return (
 *     <FlagProvider client={client} context={{ userId: 'user-123' }}>
 *       <MyApp />
 *     </FlagProvider>
 *   );
 * }
 * ```
 */
export function FlagProvider({
  client,
  context = {},
  children,
}: {
  client: AnyFlagClient;
  context?: EvaluationContext;
  children: ReactNode;
}) {
  return <FlagContext.Provider value={{ client, context }}>{children}</FlagContext.Provider>;
}

/**
 * Hook to evaluate a single feature flag.
 *
 * This is the primary hook for accessing feature flag values in React components.
 * It automatically re-evaluates when the flag client or context changes.
 *
 * For loading/error states, use {@link useFlagWithStatus} instead.
 * For evaluating multiple flags efficiently, use {@link useFlags}.
 *
 * @typeParam T - The flag schema type
 * @typeParam K - The flag key (must be a key of the schema)
 * @param flag - The flag key to evaluate
 * @param defaultValue - Optional default value while loading or if evaluation fails
 * @returns The flag value, or undefined/defaultValue while loading
 *
 * @example
 * ```tsx
 * import { useFlag } from 'crucible-react';
 * import type { MyFlags } from './flags';
 *
 * function FeatureComponent() {
 *   const isDarkMode = useFlag<MyFlags, 'darkMode'>('darkMode', false);
 *
 *   return <div className={isDarkMode ? 'dark' : 'light'}>Content</div>;
 * }
 * ```
 *
 * @example With string variants
 * ```tsx
 * const variant = useFlag<MyFlags, 'experimentVariant'>('experimentVariant', 'control');
 *
 * switch (variant) {
 *   case 'control': return <ControlExperience />;
 *   case 'variant-a': return <VariantA />;
 *   case 'variant-b': return <VariantB />;
 * }
 * ```
 */
export function useFlag<T extends FlagSchema, K extends keyof T>(
  flag: K,
  defaultValue?: FlagVariants<T>[K]
): FlagVariants<T>[K] | undefined {
  const { client, context } = useContext(FlagContext);
  const [variant, setVariant] = useState<FlagVariants<T>[K] | undefined>(defaultValue);

  useEffect(() => {
    if (!client) {
      console.warn('[Crucible] useFlag called outside FlagProvider');
      return;
    }

    let cancelled = false;

    client
      .evaluate(String(flag), context, defaultValue)
      .then((value) => {
        if (!cancelled) {
          setVariant(value as FlagVariants<T>[K]);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[Crucible] Error evaluating flag:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, flag, context, defaultValue]);

  return variant;
}

/**
 * Hook to evaluate a flag with loading and error status.
 *
 * Use this hook when you need to handle loading states or errors in your UI.
 * For simpler cases where you just need the value, use {@link useFlag}.
 *
 * @typeParam T - The flag schema type
 * @typeParam K - The flag key (must be a key of the schema)
 * @param flag - The flag key to evaluate
 * @param defaultValue - Optional default value while loading or if evaluation fails
 * @returns Object containing the flag value and status information
 *
 * @example
 * ```tsx
 * function FeatureGate() {
 *   const { value: isEnabled, status } = useFlagWithStatus<MyFlags, 'newFeature'>(
 *     'newFeature',
 *     false
 *   );
 *
 *   if (status.isLoading) return <Skeleton />;
 *   if (status.error) return <FallbackUI />;
 *
 *   return isEnabled ? <NewFeature /> : <LegacyFeature />;
 * }
 * ```
 */
export function useFlagWithStatus<T extends FlagSchema, K extends keyof T>(
  flag: K,
  defaultValue?: FlagVariants<T>[K]
): { value: FlagVariants<T>[K] | undefined; status: FlagStatus } {
  const { client, context } = useContext(FlagContext);
  const [variant, setVariant] = useState<FlagVariants<T>[K] | undefined>(defaultValue);
  const [status, setStatus] = useState<FlagStatus>({ isLoading: true, error: null });

  useEffect(() => {
    if (!client) {
      console.warn('[Crucible] useFlagWithStatus called outside FlagProvider');
      setStatus({ isLoading: false, error: new Error('No FlagProvider found') });
      return;
    }

    let cancelled = false;
    setStatus({ isLoading: true, error: null });

    client
      .evaluate(String(flag), context, defaultValue)
      .then((value) => {
        if (!cancelled) {
          setVariant(value as FlagVariants<T>[K]);
          setStatus({ isLoading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[Crucible] Error evaluating flag:', error);
          setStatus({
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, flag, context, defaultValue]);

  return { value: variant, status };
}

/**
 * Hook to access the underlying flag client for advanced use cases.
 *
 * Use this hook when you need direct access to the client, such as
 * for calling `evaluate()` directly or accessing client metadata.
 *
 * @returns The flag client instance, or null if outside FlagProvider
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const client = useFlagClient();
 *
 *   const handleRefresh = async () => {
 *     // Access client directly for custom operations
 *     await client?.evaluate('adminFeature', { userId: 'admin' }, false);
 *   };
 *
 *   return <button onClick={handleRefresh}>Refresh Flags</button>;
 * }
 * ```
 */
export function useFlagClient(): AnyFlagClient | null {
  const { client } = useContext(FlagContext);
  return client;
}

/**
 * Hook to access the current evaluation context.
 *
 * Returns the context object passed to `FlagProvider`, which contains
 * user identification and attributes used for flag evaluation.
 *
 * @returns The current evaluation context
 *
 * @example
 * ```tsx
 * function UserDebug() {
 *   const context = useFlagContext();
 *
 *   return (
 *     <pre>
 *       User ID: {context.userId}
 *       Attributes: {JSON.stringify(context.attributes, null, 2)}
 *     </pre>
 *   );
 * }
 * ```
 */
export function useFlagContext(): EvaluationContext {
  const { context } = useContext(FlagContext);
  return context;
}

/**
 * Configuration for a single flag in the useFlags batch hook.
 */
export type FlagConfig<T extends FlagSchema, K extends keyof T> = {
  flag: K;
  defaultValue?: FlagVariants<T>[K];
};

/**
 * Result type for the useFlags batch hook.
 */
export type UseFlagsResult<T extends FlagSchema, K extends keyof T> = {
  values: Partial<{ [P in K]: FlagVariants<T>[P] }>;
  status: FlagStatus;
};

/**
 * Hook to evaluate multiple flags at once.
 * More efficient than calling useFlag multiple times as it batches evaluations.
 *
 * @example
 * ```tsx
 * const { values, status } = useFlags<MyFlags>([
 *   { flag: 'darkMode', defaultValue: false },
 *   { flag: 'newFeature', defaultValue: false },
 *   { flag: 'experimentVariant', defaultValue: 'control' },
 * ]);
 *
 * if (status.isLoading) return <Spinner />;
 *
 * return (
 *   <div className={values.darkMode ? 'dark' : 'light'}>
 *     {values.newFeature && <NewFeature />}
 *     <Experiment variant={values.experimentVariant} />
 *   </div>
 * );
 * ```
 */
export function useFlags<T extends FlagSchema, K extends keyof T = keyof T>(
  flags: FlagConfig<T, K>[]
): UseFlagsResult<T, K> {
  const { client, context } = useContext(FlagContext);

  // Create stable default values object
  const defaultValues = flags.reduce(
    (acc, { flag, defaultValue }) => {
      if (defaultValue !== undefined) {
        acc[flag] = defaultValue;
      }
      return acc;
    },
    {} as Partial<{ [P in K]: FlagVariants<T>[P] }>
  );

  const [values, setValues] = useState<Partial<{ [P in K]: FlagVariants<T>[P] }>>(defaultValues);
  const [status, setStatus] = useState<FlagStatus>({ isLoading: true, error: null });

  // Create stable key for the flags array to detect changes
  const flagsKey = flags.map((f) => String(f.flag)).join(',');

  useEffect(() => {
    if (!client) {
      console.warn('[Crucible] useFlags called outside FlagProvider');
      setStatus({ isLoading: false, error: new Error('No FlagProvider found') });
      return;
    }

    let cancelled = false;
    setStatus({ isLoading: true, error: null });

    // Evaluate all flags in parallel
    const evaluations = flags.map(async ({ flag, defaultValue }) => {
      const value = await client.evaluate(String(flag), context, defaultValue);
      return { flag, value } as { flag: K; value: FlagVariants<T>[K] };
    });

    Promise.all(evaluations)
      .then((results) => {
        if (!cancelled) {
          const newValues = results.reduce(
            (acc, { flag, value }) => {
              acc[flag] = value;
              return acc;
            },
            {} as Partial<{ [P in K]: FlagVariants<T>[P] }>
          );
          setValues(newValues);
          setStatus({ isLoading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[Crucible] Error evaluating flags:', error);
          setStatus({
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, context, flagsKey]);

  return { values, status };
}
