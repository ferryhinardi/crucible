// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * Base error class for all Crucible-related errors.
 * Provides proper stack trace handling for V8 environments.
 */
export class CrucibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrucibleError';
    // Maintains proper stack trace in V8 environments (Node.js, Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when the flag client fails to initialize.
 * This can occur due to network issues, invalid credentials, or adapter-specific errors.
 */
export class InitializationError extends CrucibleError {
  constructor(message: string) {
    super(message);
    this.name = 'InitializationError';
  }
}

/**
 * Error thrown when a requested flag does not exist.
 * Contains the flag key that was not found.
 */
export class FlagNotFoundError extends CrucibleError {
  /** The flag key that was not found */
  public readonly flagKey: string;

  constructor(flagKey: string) {
    super(`Flag "${flagKey}" not found`);
    this.name = 'FlagNotFoundError';
    this.flagKey = flagKey;
  }
}

/**
 * Error thrown when flag evaluation fails.
 * Contains the flag key and optionally the underlying cause.
 */
export class EvaluationError extends CrucibleError {
  /** The flag key that failed to evaluate */
  public readonly flagKey: string;
  /** The underlying error that caused the evaluation failure */
  public readonly cause?: Error;

  constructor(flagKey: string, cause?: Error) {
    super(`Failed to evaluate flag "${flagKey}"${cause ? `: ${cause.message}` : ''}`);
    this.name = 'EvaluationError';
    this.flagKey = flagKey;
    this.cause = cause;
  }
}

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface for debugging and monitoring flag operations.
 * Implement this interface to integrate with your logging system.
 *
 * @example
 * ```ts
 * const myLogger: Logger = {
 *   debug: (msg, ...args) => myDebugLogger.log(msg, args),
 *   info: (msg, ...args) => myInfoLogger.log(msg, args),
 *   warn: (msg, ...args) => myWarnLogger.log(msg, args),
 *   error: (msg, ...args) => myErrorLogger.log(msg, args),
 * };
 * ```
 */
export interface Logger {
  /** Log debug messages (verbose, development-only). */
  debug: (message: string, ...args: unknown[]) => void;
  /** Log informational messages (normal operations). */
  info: (message: string, ...args: unknown[]) => void;
  /** Log warning messages (potential issues). */
  warn: (message: string, ...args: unknown[]) => void;
  /** Log error messages (failures, exceptions). */
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * No-op logger that discards all messages.
 * This is the default logger used when none is provided.
 */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Console logger that outputs to console with [Crucible] prefix.
 * Useful for development and debugging.
 *
 * @example
 * ```ts
 * const client = createFlagClient({
 *   adapter: myAdapter,
 *   schema: myFlags,
 *   logger: consoleLogger, // Enable console logging
 * });
 * ```
 */
export const consoleLogger: Logger = {
  debug: (message, ...args) => console.debug(`[Crucible] ${message}`, ...args),
  info: (message, ...args) => console.info(`[Crucible] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[Crucible] ${message}`, ...args),
  error: (message, ...args) => console.error(`[Crucible] ${message}`, ...args),
};

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Schema definition for feature flags.
 * Maps flag keys to their possible values: a tuple of string literals, or primitive types.
 *
 * @example
 * ```ts
 * const schema = {
 *   darkMode: 'boolean',
 *   theme: ['light', 'dark', 'system'] as const,
 *   maxItems: 'number',
 *   welcomeMessage: 'string',
 * } satisfies FlagSchema;
 * ```
 */
export type FlagSchema = Record<string, readonly string[] | 'string' | 'number' | 'boolean'>;

/**
 * Utility type to infer the variant type from a schema value.
 * - Tuple of strings → union of those strings
 * - 'string' → string
 * - 'number' → number
 * - 'boolean' → boolean
 */
export type InferVariant<T> = T extends readonly (infer U)[]
  ? U
  : T extends 'string'
    ? string
    : T extends 'number'
      ? number
      : T extends 'boolean'
        ? boolean
        : never;

/**
 * Maps a FlagSchema to an object type where each key has its inferred variant type.
 * Used for type-safe flag evaluation results.
 */
export type FlagVariants<T extends FlagSchema> = {
  [K in keyof T]: InferVariant<T[K]>;
};

/**
 * Context passed to flag evaluation for targeting and segmentation.
 * Used by adapters to determine which variant a user should receive.
 */
export interface EvaluationContext {
  /** Unique identifier for the user. Used for percentage rollouts and user targeting. */
  userId?: string;
  /** Additional attributes for targeting rules (e.g., email, plan, country). */
  attributes?: Record<string, unknown>;
}

/**
 * Interface that all flag adapters must implement.
 * Adapters connect Crucible to feature flag providers (LaunchDarkly, PostHog, etc.).
 *
 * @typeParam T - The flag schema type
 */
export interface FlagAdapter<T extends FlagSchema = FlagSchema> {
  /** Initialize the adapter (e.g., connect to the provider, fetch initial flag values). */
  initialize(): Promise<void>;
  /**
   * Evaluate a flag for the given context.
   * @param flag - The flag key to evaluate
   * @param context - The evaluation context (user info, attributes)
   * @param defaultValue - Fallback value if evaluation fails
   * @returns The evaluated flag variant
   */
  evaluate<K extends keyof T>(
    flag: K,
    context: EvaluationContext,
    defaultValue: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]>;
  /** Optional cleanup method called when the client is closed. */
  close?(): Promise<void>;
}

/**
 * Configuration options for creating a flag client.
 *
 * @typeParam T - The flag schema type
 */
export interface FlagClientConfig<T extends FlagSchema> {
  /** The adapter instance that connects to your feature flag provider. */
  adapter: FlagAdapter<T>;
  /** The flag schema defining all available flags and their types. */
  schema: T;
  /**
   * Optional callback fired when a flag is evaluated (for analytics/tracking).
   * @param flag - The flag key that was evaluated
   * @param variant - The variant value returned
   * @param context - The evaluation context used
   */
  onExposure?: (
    flag: keyof T,
    variant: FlagVariants<T>[keyof T],
    context: EvaluationContext
  ) => void;
  /** Default context applied to all evaluations (can be overridden per-evaluation). */
  defaultContext?: EvaluationContext;
  /** Logger instance for debugging and monitoring. Defaults to noopLogger. */
  logger?: Logger;
}

/**
 * Helper function to define a type-safe flag schema.
 * Provides better TypeScript inference than a plain object literal.
 *
 * @example
 * ```ts
 * const flags = defineFlags({
 *   darkMode: 'boolean',
 *   theme: ['light', 'dark', 'system'] as const,
 * });
 * ```
 */
export function defineFlags<T extends FlagSchema>(schema: T): T {
  return schema;
}

/**
 * Generic flag client interface for evaluating feature flags.
 * This is the main interface for interacting with feature flags in your application.
 *
 * @typeParam T - The flag schema type
 *
 * @example
 * ```ts
 * const client = createFlagClient({ adapter, schema });
 * await client.initialize();
 *
 * const variant = await client.evaluate('darkMode', { userId: 'user-123' });
 * console.log('Dark mode enabled:', variant);
 *
 * await client.close();
 * ```
 */
export interface FlagClient<T extends FlagSchema = FlagSchema> {
  /**
   * Initialize the client and underlying adapter.
   * Must be called before evaluating flags.
   */
  initialize(): Promise<void>;
  /**
   * Evaluate a flag for the given context.
   * @param flag - The flag key to evaluate
   * @param context - Optional evaluation context (merged with defaultContext)
   * @param defaultValue - Optional fallback value if evaluation fails
   * @returns The evaluated flag variant
   */
  evaluate<K extends keyof T & string>(
    flag: K,
    context?: EvaluationContext,
    defaultValue?: FlagVariants<T>[K]
  ): Promise<FlagVariants<T>[K]>;
  /**
   * Close the client and release resources.
   * Should be called when the client is no longer needed.
   */
  close(): Promise<void>;
}

/**
 * Create a new flag client with the given configuration.
 * The client handles initialization, evaluation, and cleanup of feature flags.
 *
 * @param config - Client configuration including adapter, schema, and options
 * @returns A FlagClient instance
 *
 * @example
 * ```ts
 * import { createFlagClient, defineFlags } from 'crucible-core';
 * import { LaunchDarklyAdapter } from 'crucible-adapter-launchdarkly';
 *
 * const flags = defineFlags({
 *   darkMode: 'boolean',
 *   pricingTier: ['free', 'pro', 'enterprise'] as const,
 * });
 *
 * const client = createFlagClient({
 *   adapter: new LaunchDarklyAdapter({ sdkKey: 'your-sdk-key' }),
 *   schema: flags,
 *   defaultContext: { attributes: { platform: 'web' } },
 *   onExposure: (flag, variant, ctx) => analytics.track('flag_exposure', { flag, variant }),
 * });
 *
 * await client.initialize();
 * const tier = await client.evaluate('pricingTier', { userId: 'user-123' }, 'free');
 * ```
 */
export function createFlagClient<T extends FlagSchema>(config: FlagClientConfig<T>): FlagClient<T> {
  const { adapter, schema, onExposure, defaultContext = {}, logger = noopLogger } = config;

  let initialized = false;
  let initPromise: Promise<void> | null = null;

  return {
    async initialize() {
      if (initialized) {
        logger.debug('Client already initialized, skipping');
        return;
      }
      if (initPromise) {
        logger.debug('Initialization already in progress, waiting');
        return initPromise;
      }

      logger.info('Initializing flag client');
      initPromise = adapter
        .initialize()
        .then(() => {
          initialized = true;
          logger.info('Flag client initialized successfully');
        })
        .catch((error) => {
          initPromise = null; // Allow retry on failure
          logger.error('Failed to initialize flag client', error);
          throw new InitializationError(
            error instanceof Error ? error.message : 'Unknown initialization error'
          );
        });

      return initPromise;
    },

    async evaluate<K extends keyof T & string>(
      flag: K,
      context: EvaluationContext = {},
      defaultValue?: FlagVariants<T>[K]
    ): Promise<FlagVariants<T>[K]> {
      if (!initialized) {
        throw new InitializationError('Client not initialized. Call initialize() first.');
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
        logger.debug(`Evaluating flag "${flag}"`, { context: mergedContext });
        const variant = await adapter.evaluate(flag, mergedContext, fallback);
        logger.debug(`Flag "${flag}" evaluated to:`, variant);
        onExposure?.(flag, variant, mergedContext);
        return variant;
      } catch (error) {
        logger.warn(`Failed to evaluate flag "${flag}", using fallback:`, fallback, error);
        return fallback;
      }
    },

    async close() {
      logger.info('Closing flag client');
      if (adapter.close) {
        await adapter.close();
      }
      initialized = false;
      initPromise = null;
      logger.info('Flag client closed');
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
