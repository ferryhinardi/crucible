import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LaunchDarklyAdapter } from './index';

// Mock the LaunchDarkly SDK
vi.mock('launchdarkly-node-server-sdk', () => {
  const mockClient = {
    waitForInitialization: vi.fn().mockResolvedValue(undefined),
    variation: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    init: vi.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

// Import after mock is set up
import * as ld from 'launchdarkly-node-server-sdk';

describe('LaunchDarklyAdapter', () => {
  const mockClient = (
    ld as unknown as {
      __mockClient: {
        waitForInitialization: ReturnType<typeof vi.fn>;
        variation: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
      };
    }
  ).__mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the LaunchDarkly client with SDK key', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      await adapter.initialize();

      expect(ld.init).toHaveBeenCalledWith('test-sdk-key', undefined);
      expect(mockClient.waitForInitialization).toHaveBeenCalled();
    });

    it('should pass options to the LaunchDarkly client', async () => {
      const options = { offline: true };
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
        options,
      });

      await adapter.initialize();

      expect(ld.init).toHaveBeenCalledWith('test-sdk-key', options);
    });
  });

  describe('evaluate', () => {
    it('should throw error when client is not initialized', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      await expect(
        adapter.evaluate('test-flag', { userId: 'user-123' }, 'default')
      ).rejects.toThrow('LaunchDarkly client not initialized');
    });

    it('should evaluate flag with user context', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      mockClient.variation.mockResolvedValue('variant-a');

      await adapter.initialize();
      const result = await adapter.evaluate('test-flag', { userId: 'user-123' }, 'default');

      expect(result).toBe('variant-a');
      expect(mockClient.variation).toHaveBeenCalledWith(
        'test-flag',
        { kind: 'user', key: 'user-123' },
        'default'
      );
    });

    it('should use anonymous key when userId is not provided', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      mockClient.variation.mockResolvedValue('variant-b');

      await adapter.initialize();
      const result = await adapter.evaluate('test-flag', {}, 'default');

      expect(result).toBe('variant-b');
      expect(mockClient.variation).toHaveBeenCalledWith(
        'test-flag',
        { kind: 'user', key: 'anonymous' },
        'default'
      );
    });

    it('should include context attributes in LDContext', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      mockClient.variation.mockResolvedValue('variant-c');

      await adapter.initialize();
      const result = await adapter.evaluate(
        'test-flag',
        {
          userId: 'user-123',
          attributes: {
            email: 'user@example.com',
            plan: 'premium',
          },
        },
        'default'
      );

      expect(result).toBe('variant-c');
      expect(mockClient.variation).toHaveBeenCalledWith(
        'test-flag',
        {
          kind: 'user',
          key: 'user-123',
          email: 'user@example.com',
          plan: 'premium',
        },
        'default'
      );
    });

    it('should return default value when flag evaluation returns default', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      mockClient.variation.mockResolvedValue('default-value');

      await adapter.initialize();
      const result = await adapter.evaluate(
        'missing-flag',
        { userId: 'user-123' },
        'default-value'
      );

      expect(result).toBe('default-value');
    });
  });

  describe('close', () => {
    it('should close the LaunchDarkly client', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      await adapter.initialize();
      await adapter.close();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle close when client is not initialized', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      // Should not throw
      await expect(adapter.close()).resolves.toBeUndefined();
      expect(mockClient.close).not.toHaveBeenCalled();
    });

    it('should set client to null after close', async () => {
      const adapter = new LaunchDarklyAdapter({
        sdkKey: 'test-sdk-key',
      });

      await adapter.initialize();
      await adapter.close();

      // Trying to evaluate after close should throw
      await expect(
        adapter.evaluate('test-flag', { userId: 'user-123' }, 'default')
      ).rejects.toThrow('LaunchDarkly client not initialized');
    });
  });
});
