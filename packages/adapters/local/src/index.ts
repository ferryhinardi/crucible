import type { FlagAdapter, FlagSchema, EvaluationContext, FlagVariants } from 'crucible-core';

/**
 * Rule-based targeting configuration for flags.
 * Rules are evaluated before percentage rollouts and static values.
 *
 * @typeParam T - The flag schema type
 *
 * @example
 * ```ts
 * const rule: RolloutRule<MyFlags> = {
 *   flag: 'betaFeature',
 *   match: (ctx) => ctx.attributes?.isBetaTester === true,
 *   variant: true,
 * };
 * ```
 */
export interface RolloutRule<T extends FlagSchema> {
  /** The flag key this rule applies to. */
  flag: keyof T;
  /** Predicate function to determine if the rule matches the context. */
  match: (context: EvaluationContext) => boolean;
  /** The variant to return when the rule matches. */
  variant: FlagVariants<T>[keyof T];
}

/**
 * Percentage-based rollout configuration for gradual feature releases.
 * Uses deterministic hashing to ensure consistent bucketing per user.
 *
 * @typeParam T - The flag schema type
 *
 * @example
 * ```ts
 * const rollout: PercentageRollout<MyFlags> = {
 *   flag: 'newCheckout',
 *   percentage: 25, // 25% of users
 *   variant: true,
 *   seed: 'checkout-v2', // Optional seed for different experiments
 * };
 * ```
 */
export interface PercentageRollout<T extends FlagSchema> {
  /** The flag key this rollout applies to. */
  flag: keyof T;
  /** Percentage of users to include (0-100). */
  percentage: number;
  /** The variant to return for users in the rollout. */
  variant: FlagVariants<T>[keyof T];
  /** Optional seed for consistent hashing. Different seeds create different user groups. */
  seed?: string;
}

/**
 * Configuration options for the LocalAdapter.
 *
 * @typeParam T - The flag schema type
 */
export interface LocalAdapterConfig<T extends FlagSchema> {
  /** Static flag values. Used as fallback when no rules or rollouts match. */
  flags: Partial<FlagVariants<T>>;
  /** Optional targeting rules. Evaluated first (highest priority). */
  rules?: Array<RolloutRule<T>>;
  /** Optional percentage rollouts. Evaluated after rules, before static values. */
  rollouts?: Array<PercentageRollout<T>>;
}

/**
 * Local adapter for feature flags.
 * Useful for development, testing, and scenarios where a remote provider isn't needed.
 *
 * Evaluation priority:
 * 1. Rules (first matching rule wins)
 * 2. Percentage rollouts (requires userId in context)
 * 3. Static flag values
 * 4. Default value passed to evaluate()
 *
 * @typeParam T - The flag schema type
 *
 * @example
 * ```ts
 * const adapter = new LocalAdapter<MyFlags>({
 *   flags: {
 *     darkMode: false,
 *     maxItems: 10,
 *   },
 *   rules: [
 *     { flag: 'darkMode', match: (ctx) => ctx.attributes?.theme === 'dark', variant: true },
 *   ],
 *   rollouts: [
 *     { flag: 'newFeature', percentage: 50, variant: true },
 *   ],
 * });
 * ```
 */
export class LocalAdapter<T extends FlagSchema> implements FlagAdapter<T> {
  constructor(private config: LocalAdapterConfig<T>) {
    // Validate percentage rollouts at construction time
    this.config.rollouts?.forEach((rollout) => {
      this.validatePercentage(rollout.percentage, String(rollout.flag));
    });
  }

  /**
   * Validates that a percentage value is within the valid range (0-100)
   */
  private validatePercentage(percentage: number, flag: string): void {
    if (typeof percentage !== 'number' || !Number.isFinite(percentage)) {
      throw new Error(
        `Invalid percentage for flag "${flag}": ${percentage}. Must be a finite number.`
      );
    }
    if (percentage < 0 || percentage > 100) {
      throw new Error(
        `Invalid percentage for flag "${flag}": ${percentage}. Must be between 0 and 100.`
      );
    }
  }

  async initialize(): Promise<void> {
    // No-op for local adapter
  }

  async close(): Promise<void> {
    // No-op for local adapter
  }

  async evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]> {
    // Check rules first (highest priority)
    const rule = this.config.rules?.find((r) => r.flag === flag && r.match(context));
    if (rule) {
      return rule.variant as FlagVariants<T>[K];
    }

    // Check percentage rollouts
    const rollout = this.config.rollouts?.find((r) => r.flag === flag);
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
