import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setServerClient,
  setServerContext,
  getServerContext,
  getServerClient,
  getFlag,
  getFlags,
  preloadFlags,
} from '../server';

// Mock client factory
const createMockClient = (overrides = {}) => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  evaluate: vi.fn().mockResolvedValue('default-value'),
  close: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Server Components Support', () => {
  beforeEach(() => {
    // Reset the server client and context before each test
    setServerClient(null as any, {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setServerClient / getServerClient', () => {
    it('should set and get the server client', () => {
      const mockClient = createMockClient();

      setServerClient(mockClient as any);

      expect(getServerClient()).toBe(mockClient);
    });

    it('should return null when client is not set', () => {
      // Reset to ensure clean state
      setServerClient(null as any);

      expect(getServerClient()).toBeNull();
    });

    it('should set initial context when provided', () => {
      const mockClient = createMockClient();
      const initialContext = { userId: 'user-123', attributes: { plan: 'pro' } };

      setServerClient(mockClient as any, initialContext);

      expect(getServerContext()).toEqual(initialContext);
    });
  });

  describe('setServerContext / getServerContext', () => {
    it('should set and get the server context', () => {
      const context = { userId: 'user-456', attributes: { region: 'us-east' } };

      setServerContext(context);

      expect(getServerContext()).toEqual(context);
    });

    it('should overwrite previous context', () => {
      setServerContext({ userId: 'user-1' });
      setServerContext({ userId: 'user-2', attributes: { newAttr: true } });

      expect(getServerContext()).toEqual({ userId: 'user-2', attributes: { newAttr: true } });
    });

    it('should return empty object when no context is set', () => {
      setServerClient(null as any, {});

      expect(getServerContext()).toEqual({});
    });
  });

  describe('getFlag', () => {
    it('should evaluate a flag using the server client', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockResolvedValue('variant-a'),
      });
      setServerClient(mockClient as any);

      const result = await getFlag('my-flag', 'default');

      expect(mockClient.evaluate).toHaveBeenCalledWith('my-flag', {}, 'default');
      expect(result).toBe('variant-a');
    });

    it('should use server context for evaluation', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockResolvedValue(true),
      });
      const serverContext = { userId: 'user-789' };
      setServerClient(mockClient as any, serverContext);

      await getFlag('feature-flag', false);

      expect(mockClient.evaluate).toHaveBeenCalledWith('feature-flag', serverContext, false);
    });

    it('should use provided context over server context', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockResolvedValue('custom'),
      });
      setServerClient(mockClient as any, { userId: 'server-user' });
      const customContext = { userId: 'custom-user' };

      await getFlag('flag', 'default', customContext);

      expect(mockClient.evaluate).toHaveBeenCalledWith('flag', customContext, 'default');
    });

    it('should return default value when client is not set', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setServerClient(null as any);

      const result = await getFlag('any-flag', 'fallback');

      expect(result).toBe('fallback');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Crucible] getFlag called before setServerClient. Returning default value.'
      );
    });

    it('should return default value on evaluation error', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockRejectedValue(new Error('Evaluation failed')),
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      setServerClient(mockClient as any);

      const result = await getFlag('error-flag', 'safe-default');

      expect(result).toBe('safe-default');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('getFlags', () => {
    it('should evaluate multiple flags in parallel', async () => {
      const mockClient = createMockClient({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce('variant-b'),
      });
      setServerClient(mockClient as any);

      const result = await getFlags([
        { flag: 'flag-1', defaultValue: false },
        { flag: 'flag-2', defaultValue: true },
        { flag: 'flag-3', defaultValue: 'control' },
      ]);

      expect(mockClient.evaluate).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        'flag-1': true,
        'flag-2': false,
        'flag-3': 'variant-b',
      });
    });

    it('should use server context for all evaluations', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockResolvedValue('value'),
      });
      const serverContext = { userId: 'batch-user' };
      setServerClient(mockClient as any, serverContext);

      await getFlags([{ flag: 'flag-a' }, { flag: 'flag-b' }]);

      expect(mockClient.evaluate).toHaveBeenCalledWith('flag-a', serverContext, undefined);
      expect(mockClient.evaluate).toHaveBeenCalledWith('flag-b', serverContext, undefined);
    });

    it('should use custom context when provided', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockResolvedValue('custom-value'),
      });
      setServerClient(mockClient as any, { userId: 'server-user' });
      const customContext = { userId: 'override-user' };

      await getFlags([{ flag: 'test-flag' }], customContext);

      expect(mockClient.evaluate).toHaveBeenCalledWith('test-flag', customContext, undefined);
    });

    it('should return default values when client is not set', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setServerClient(null as any);

      const result = await getFlags([
        { flag: 'flag-1', defaultValue: 'default-1' },
        { flag: 'flag-2', defaultValue: 'default-2' },
        { flag: 'flag-3' }, // No default value
      ]);

      expect(result).toEqual({
        'flag-1': 'default-1',
        'flag-2': 'default-2',
      });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should return default values on evaluation error', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockRejectedValue(new Error('Batch evaluation failed')),
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});
      setServerClient(mockClient as any);

      const result = await getFlags([
        { flag: 'flag-1', defaultValue: 'safe-1' },
        { flag: 'flag-2', defaultValue: 'safe-2' },
      ]);

      expect(result).toEqual({
        'flag-1': 'safe-1',
        'flag-2': 'safe-2',
      });
    });
  });

  describe('preloadFlags', () => {
    it('should preload multiple flags in parallel', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockResolvedValue('preloaded'),
      });
      setServerClient(mockClient as any);

      await preloadFlags(['flag-a', 'flag-b', 'flag-c']);

      expect(mockClient.evaluate).toHaveBeenCalledTimes(3);
      expect(mockClient.evaluate).toHaveBeenCalledWith('flag-a', {}, undefined);
      expect(mockClient.evaluate).toHaveBeenCalledWith('flag-b', {}, undefined);
      expect(mockClient.evaluate).toHaveBeenCalledWith('flag-c', {}, undefined);
    });

    it('should use server context for preloading', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockResolvedValue('value'),
      });
      const serverContext = { userId: 'preload-user' };
      setServerClient(mockClient as any, serverContext);

      await preloadFlags(['test-flag']);

      expect(mockClient.evaluate).toHaveBeenCalledWith('test-flag', serverContext, undefined);
    });

    it('should use custom context when provided', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockResolvedValue('value'),
      });
      setServerClient(mockClient as any, { userId: 'default-user' });
      const customContext = { userId: 'custom-preload-user' };

      await preloadFlags(['flag'], customContext);

      expect(mockClient.evaluate).toHaveBeenCalledWith('flag', customContext, undefined);
    });

    it('should warn when client is not set', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setServerClient(null as any);

      await preloadFlags(['any-flag']);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Crucible] preloadFlags called before setServerClient.'
      );
    });

    it('should handle errors gracefully', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockRejectedValue(new Error('Preload failed')),
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      setServerClient(mockClient as any);

      // Should not throw
      await expect(preloadFlags(['error-flag'])).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Crucible] Error preloading flags:',
        expect.any(Error)
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should support typical Next.js RSC workflow', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockImplementation((flag: string) => {
          switch (flag) {
            case 'dark-mode':
              return Promise.resolve(true);
            case 'experiment':
              return Promise.resolve('variant-b');
            case 'beta-feature':
              return Promise.resolve(false);
            default:
              return Promise.resolve(undefined);
          }
        }),
      });

      // 1. Initialize client (e.g., in instrumentation.ts)
      setServerClient(mockClient as any);

      // 2. Set context (e.g., in middleware)
      setServerContext({ userId: 'next-user', attributes: { locale: 'en' } });

      // 3. Preload flags in layout
      await preloadFlags(['dark-mode', 'experiment']);

      // 4. Evaluate flags in page components
      const flags = await getFlags([
        { flag: 'dark-mode', defaultValue: false },
        { flag: 'experiment', defaultValue: 'control' },
        { flag: 'beta-feature', defaultValue: false },
      ]);

      expect(flags).toEqual({
        'dark-mode': true,
        experiment: 'variant-b',
        'beta-feature': false,
      });
    });

    it('should isolate context between different setServerContext calls', async () => {
      const mockClient = createMockClient({
        evaluate: vi.fn().mockImplementation((flag, ctx) => {
          return ctx.userId === 'user-a' ? 'variant-a' : 'variant-b';
        }),
      });
      setServerClient(mockClient as any);

      // First request context
      setServerContext({ userId: 'user-a' });
      const result1 = await getFlag('ab-test');

      // Second request context
      setServerContext({ userId: 'user-b' });
      const result2 = await getFlag('ab-test');

      expect(result1).toBe('variant-a');
      expect(result2).toBe('variant-b');
    });
  });
});
