import * as ld from 'launchdarkly-node-server-sdk';
import type { FlagAdapter, FlagSchema, EvaluationContext, FlagVariants } from '@crucible/core';

export interface LaunchDarklyAdapterConfig {
  sdkKey: string;
  options?: ld.LDOptions;
}

export class LaunchDarklyAdapter<T extends FlagSchema> implements FlagAdapter<T> {
  private client: ld.LDClient | null = null;

  constructor(private config: LaunchDarklyAdapterConfig) {}

  async initialize(): Promise<void> {
    this.client = ld.init(this.config.sdkKey, this.config.options);
    await this.client.waitForInitialization();
  }

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

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}
