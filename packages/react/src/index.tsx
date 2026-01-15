'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { FlagSchema, FlagVariants, EvaluationContext } from '@crucible/core';

type FlagClient = {
  initialize(): Promise<void>;
  evaluate<K extends string>(
    flag: K,
    context?: EvaluationContext,
    defaultValue?: any
  ): Promise<any>;
  close(): Promise<void>;
};

const FlagContext = createContext<{
  client: FlagClient | null;
  context: EvaluationContext;
}>({ client: null, context: {} });

export function FlagProvider({
  client,
  context = {},
  children
}: {
  client: FlagClient;
  context?: EvaluationContext;
  children: ReactNode;
}) {
  return (
    <FlagContext.Provider value={{ client, context }}>
      {children}
    </FlagContext.Provider>
  );
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

    client.evaluate(String(flag), context, defaultValue).then((value) => {
      setVariant(value as FlagVariants<T>[K]);
    });
  }, [client, flag, context, defaultValue]);

  return variant;
}
