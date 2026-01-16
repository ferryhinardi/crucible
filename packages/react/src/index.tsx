'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { FlagSchema, FlagVariants, EvaluationContext, FlagClient } from 'crucible-core';

/**
 * Base FlagClient type that accepts any schema.
 * This allows FlagProvider to accept typed clients from createFlagClient<T>.
 */
type AnyFlagClient = FlagClient<FlagSchema>;

export type FlagStatus = {
  isLoading: boolean;
  error: Error | null;
};

const FlagContext = createContext<{
  client: AnyFlagClient | null;
  context: EvaluationContext;
}>({ client: null, context: {} });

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
 * Hook to get a flag value along with loading and error status.
 * Useful when you need to handle loading states or errors in the UI.
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
 * Hook to get the flag client for advanced use cases.
 */
export function useFlagClient(): AnyFlagClient | null {
  const { client } = useContext(FlagContext);
  return client;
}

/**
 * Hook to get the current evaluation context.
 */
export function useFlagContext(): EvaluationContext {
  const { context } = useContext(FlagContext);
  return context;
}
