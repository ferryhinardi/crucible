import { PostHog } from 'posthog-node';
import type { FlagAdapter, FlagSchema, EvaluationContext, FlagVariants } from 'crucible-core';

export interface PostHogAdapterConfig {
  /** PostHog API key (project API key) */
  apiKey: string;
  /** PostHog host URL (default: https://app.posthog.com) */
  host?: string;
  /** Personal API key for local evaluation (optional, enables faster evaluations) */
  personalApiKey?: string;
  /** Feature flag request timeout in milliseconds (default: 10000) */
  featureFlagRequestTimeoutMs?: number;
  /** Flush interval in milliseconds (default: 10000) */
  flushInterval?: number;
  /** Flush batch size (default: 1000) */
  flushAt?: number;
}

export class PostHogAdapter<T extends FlagSchema> implements FlagAdapter<T> {
  private client: PostHog | null = null;
  private config: PostHogAdapterConfig;

  constructor(config: PostHogAdapterConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.client = new PostHog(this.config.apiKey, {
      host: this.config.host ?? 'https://app.posthog.com',
      personalApiKey: this.config.personalApiKey,
      featureFlagsPollingInterval: this.config.flushInterval ?? 10000,
      requestTimeout: this.config.featureFlagRequestTimeoutMs ?? 10000,
      flushAt: this.config.flushAt ?? 1000,
      flushInterval: this.config.flushInterval ?? 10000,
    });

    // If personal API key is provided, preload feature flags for local evaluation
    if (this.config.personalApiKey) {
      await this.client.reloadFeatureFlags();
    }
  }

  async evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]> {
    if (!this.client) {
      throw new Error('PostHog client not initialized');
    }

    const distinctId = context.userId || 'anonymous';

    // Build PostHog properties from context attributes
    // PostHog expects Record<string, string> for personProperties
    const personProperties: Record<string, string> = {};
    const groups: Record<string, string> = {};

    if (context.attributes) {
      // Separate groups from regular properties
      for (const [key, value] of Object.entries(context.attributes)) {
        if (key.startsWith('$group_') && typeof value === 'string') {
          // PostHog group format: $group_<type> = <id>
          const groupType = key.replace('$group_', '');
          groups[groupType] = value;
        } else if (value !== undefined && value !== null) {
          // Convert to string for PostHog compatibility
          personProperties[key] = String(value);
        }
      }
    }

    try {
      const result = await this.client.getFeatureFlag(String(flag), distinctId, {
        personProperties: Object.keys(personProperties).length > 0 ? personProperties : undefined,
        groups: Object.keys(groups).length > 0 ? groups : undefined,
      });

      // PostHog returns boolean | string | undefined
      if (result === undefined || result === null) {
        return defaultValue;
      }

      return result as FlagVariants<T>[K];
    } catch {
      // On error, return default value
      return defaultValue;
    }
  }

  /**
   * Capture a feature flag exposure event in PostHog
   * Useful for tracking which variant a user saw
   */
  capture(distinctId: string, event: string, properties?: Record<string, unknown>): void {
    if (!this.client) {
      throw new Error('PostHog client not initialized');
    }
    this.client.capture({
      distinctId,
      event,
      properties,
    });
  }

  /**
   * Identify a user with their properties
   */
  identify(distinctId: string, properties?: Record<string, unknown>): void {
    if (!this.client) {
      throw new Error('PostHog client not initialized');
    }
    this.client.identify({
      distinctId,
      properties,
    });
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
      this.client = null;
    }
  }
}
