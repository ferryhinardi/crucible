import type { FlagAdapter, FlagSchema, EvaluationContext, FlagVariants } from 'crucible-core';

export interface RolloutRule<T extends FlagSchema> {
  flag: keyof T;
  match: (context: EvaluationContext) => boolean;
  variant: FlagVariants<T>[keyof T];
}

export interface PercentageRollout<T extends FlagSchema> {
  flag: keyof T;
  percentage: number; // 0-100
  variant: FlagVariants<T>[keyof T];
  seed?: string; // Optional seed for consistent hashing
}

export interface LocalAdapterConfig<T extends FlagSchema> {
  flags: Partial<FlagVariants<T>>;
  rules?: Array<RolloutRule<T>>;
  rollouts?: Array<PercentageRollout<T>>;
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
    // Check rules first (highest priority)
    const rule = this.config.rules?.find(r => r.flag === flag && r.match(context));
    if (rule) {
      return rule.variant as FlagVariants<T>[K];
    }

    // Check percentage rollouts
    const rollout = this.config.rollouts?.find(r => r.flag === flag);
    if (rollout && context.userId) {
      const isInRollout = this.isUserInRollout(
        context.userId,
        rollout.percentage,
        String(flag),
        rollout.seed
      );
      if (isInRollout) {
        return rollout.variant as FlagVariants<T>[K];
      }
    }

    // Fallback to static config
    return (this.config.flags[flag] ?? defaultValue) as FlagVariants<T>[K];
  }

  /**
   * Deterministic hash-based rollout
   * Same userId + flag + seed will always get same result
   */
  private isUserInRollout(
    userId: string,
    percentage: number,
    flag: string,
    seed?: string
  ): boolean {
    if (percentage <= 0) return false;
    if (percentage >= 100) return true;

    const input = `${userId}:${flag}:${seed ?? 'default'}`;
    const hash = this.simpleHash(input);
    const bucket = hash % 100;
    return bucket < percentage;
  }

  /**
   * Simple hash function for consistent bucketing
   * Not cryptographically secure, but sufficient for feature flags
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
