import * as ld from 'launchdarkly-node-server-sdk';
import type { FlagAdapter, FlagSchema, EvaluationContext, FlagVariants } from 'crucible-core';

/**
 * Configuration options for the LaunchDarkly adapter.
 *
 * @example
 * ```ts
 * const config: LaunchDarklyAdapterConfig = {
 *   sdkKey: process.env.LAUNCHDARKLY_SDK_KEY!,
 *   options: {
 *     logger: ld.basicLogger({ level: 'info' }),
 *   },
 * };
 * ```
 */
export interface LaunchDarklyAdapterConfig {
  /**
   * Your LaunchDarkly SDK key.
   * This should be your server-side SDK key, not the client-side ID.
   */
  sdkKey: string;

  /**
   * Optional LaunchDarkly client configuration options.
   * @see https://launchdarkly.github.io/node-server-sdk/interfaces/LDOptions.html
   */
  options?: ld.LDOptions;
}

/**
 * Feature flag adapter for LaunchDarkly.
 *
 * This adapter connects Crucible to LaunchDarkly's feature flag service,
 * allowing you to use LaunchDarkly-managed flags with full type safety.
 *
 * The adapter maps the Crucible `EvaluationContext` to LaunchDarkly's context format:
 * - `context.userId` becomes the LaunchDarkly context `key`
 * - `context.attributes` are spread as additional context properties
 * - The context `kind` is set to 'user' by default
 *
 * @typeParam T - The flag schema type defining your feature flags
 *
 * @example
 * ```ts
 * import { defineFlags, createFlagClient } from 'crucible-core';
 * import { LaunchDarklyAdapter } from 'crucible-adapter-launchdarkly';
 *
 * const flags = defineFlags({
 *   newCheckout: { variants: [true, false] },
 *   pricingTier: { variants: ['basic', 'pro', 'enterprise'] as const },
 * });
 *
 * const adapter = new LaunchDarklyAdapter<typeof flags>({
 *   sdkKey: process.env.LAUNCHDARKLY_SDK_KEY!,
 * });
 *
 * const client = createFlagClient({
 *   flags,
 *   adapter,
 * });
 *
 * await client.initialize();
 *
 * // Flag key must match a flag in your LaunchDarkly project
 * const tier = await client.evaluate('pricingTier', { userId: 'user-123' }, 'basic');
 * ```
 */
export class LaunchDarklyAdapter<T extends FlagSchema> implements FlagAdapter<T> {
  private client: ld.LDClient | null = null;

  /**
   * Creates a new LaunchDarkly adapter instance.
   *
   * @param config - Configuration options including your SDK key
   */
  constructor(private config: LaunchDarklyAdapterConfig) {}

  /**
   * Initializes the LaunchDarkly client.
   *
   * This method must be called before evaluating any flags. It establishes
   * a connection to LaunchDarkly and waits for the initial flag data to be loaded.
   *
   * @throws Error if initialization fails (e.g., invalid SDK key, network issues)
   */
  async initialize(): Promise<void> {
    this.client = ld.init(this.config.sdkKey, this.config.options);
    await this.client.waitForInitialization();
  }

  /**
   * Evaluates a feature flag for the given context.
   *
   * The evaluation context is converted to a LaunchDarkly user context:
   * - `context.userId` → `key` (defaults to 'anonymous' if not provided)
   * - `context.attributes` → spread as additional user properties
   *
   * @typeParam K - The flag key type (must be a key of the schema)
   * @param flag - The flag key to evaluate
   * @param context - The evaluation context containing user information
   * @param defaultValue - The value to return if evaluation fails
   * @returns The evaluated flag value from LaunchDarkly
   * @throws Error if the client has not been initialized
   */
  async evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]> {
    if (!this.client) {
      throw new Error('LaunchDarkly client not initialized');
    }

    const ldContext: ld.LDContext = {
      kind: 'user',
      key: context.userId || 'anonymous',
      ...context.attributes,
    };

    const result = await this.client.variation(String(flag), ldContext, defaultValue);
    return result as FlagVariants<T>[K];
  }

  /**
   * Closes the LaunchDarkly client connection.
   *
   * This method should be called when shutting down your application
   * to ensure all pending analytics events are flushed and resources are released.
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}
