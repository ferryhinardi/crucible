export type FlagSchema = Record<string, readonly string[] | 'string' | 'number' | 'boolean'>;

export type InferVariant<T> = T extends readonly (infer U)[]
  ? U
  : T extends 'string'
    ? string
    : T extends 'number'
      ? number
      : T extends 'boolean'
        ? boolean
        : never;

export type FlagVariants<T extends FlagSchema> = {
  [K in keyof T]: InferVariant<T[K]>;
};

export interface EvaluationContext {
  userId?: string;
  attributes?: Record<string, unknown>;
}

export interface FlagAdapter<T extends FlagSchema = FlagSchema> {
  initialize(): Promise<void>;
  evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]>;
  close?(): Promise<void>;
}

export interface FlagClientConfig<T extends FlagSchema> {
  adapter: FlagAdapter<T>;
  schema: T;
  onExposure?: (
    flag: keyof T,
    variant: FlagVariants<T>[keyof T],
    context: EvaluationContext
  ) => void;
  defaultContext?: EvaluationContext;
}

export function defineFlags<T extends FlagSchema>(schema: T): T {
  return schema;
}

export function createFlagClient<T extends FlagSchema>(config: FlagClientConfig<T>) {
  const { adapter, schema, onExposure, defaultContext = {} } = config;

  let initialized = false;

  return {
    async initialize() {
      if (initialized) return;
      await adapter.initialize();
      initialized = true;
    },

    async evaluate<K extends keyof T>(
      flag: K,
      context: EvaluationContext = {},
      defaultValue?: FlagVariants<T>[K]
    ): Promise<FlagVariants<T>[K]> {
      if (!initialized) {
        throw new Error('Client not initialized. Call initialize() first.');
      }

      const mergedContext: EvaluationContext = {
        ...defaultContext,
        ...context,
        attributes: {
          ...defaultContext.attributes,
          ...context.attributes,
        },
      };
      const schemaDefault = getSchemaDefault(schema[flag]);
      const fallback = (defaultValue ?? schemaDefault) as FlagVariants<T>[K];

      try {
        const variant = await adapter.evaluate(flag, mergedContext, fallback);
        onExposure?.(flag, variant, mergedContext);
        return variant;
      } catch (error) {
        console.warn(`[Crucible] Failed to evaluate flag "${String(flag)}":`, error);
        return fallback;
      }
    },

    async close() {
      if (adapter.close) {
        await adapter.close();
      }
      initialized = false;
    },
  };
}

function getSchemaDefault(schemaValue: FlagSchema[string]): unknown {
  if (Array.isArray(schemaValue)) return schemaValue[0];
  if (schemaValue === 'string') return '';
  if (schemaValue === 'number') return 0;
  if (schemaValue === 'boolean') return false;
  return undefined;
}
