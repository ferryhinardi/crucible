import type { FlagAdapter, FlagSchema, EvaluationContext, FlagVariants } from '@crucible/core';

export interface LocalAdapterConfig<T extends FlagSchema> {
  flags: Partial<FlagVariants<T>>;
  rules?: Array<{
    flag: keyof T;
    match: (context: EvaluationContext) => boolean;
    variant: FlagVariants<T>[keyof T];
  }>;
}

export class LocalAdapter<T extends FlagSchema> implements FlagAdapter<T> {
  constructor(private config: LocalAdapterConfig<T>) {}

  async initialize(): Promise<void> {
    // No-op for local adapter
  }

  async evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]> {
    // Check rules first
    const rule = this.config.rules?.find(r => r.flag === flag && r.match(context));
    if (rule) {
      return rule.variant as FlagVariants<T>[K];
    }

    // Fallback to static config
    return (this.config.flags[flag] ?? defaultValue) as FlagVariants<T>[K];
  }
}
