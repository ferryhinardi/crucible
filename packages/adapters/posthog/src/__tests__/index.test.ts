import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PostHogAdapter } from '../index';
import type { FlagSchema } from 'crucible-core';

// Mock posthog-node
vi.mock('posthog-node', () => {
  const mockCapture = vi.fn();
  const mockIdentify = vi.fn();
  const mockGetFeatureFlag = vi.fn();
  const mockShutdown = vi.fn().mockResolvedValue(undefined);
  const mockReloadFeatureFlags = vi.fn().mockResolvedValue(undefined);

  return {
    PostHog: vi.fn().mockImplementation(() => ({
      capture: mockCapture,
      identify: mockIdentify,
      getFeatureFlag: mockGetFeatureFlag,
      shutdown: mockShutdown,
      reloadFeatureFlags: mockReloadFeatureFlags,
    })),
    __mocks: {
      mockCapture,
      mockIdentify,
      mockGetFeatureFlag,
      mockShutdown,
      mockReloadFeatureFlags,
    },
  };
});

// Get mock functions
const getMocks = async () => {
  const mod = await import('posthog-node');
  return (
    mod as unknown as {
      __mocks: {
        mockCapture: ReturnType<typeof vi.fn>;
        mockIdentify: ReturnType<typeof vi.fn>;
        mockGetFeatureFlag: ReturnType<typeof vi.fn>;
        mockShutdown: ReturnType<typeof vi.fn>;
        mockReloadFeatureFlags: ReturnType<typeof vi.fn>;
      };
    }
  ).__mocks;
};

// Schema used for type inference in tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const testSchema = {
  darkMode: ['enabled', 'disabled'] as const,
  newFeature: 'boolean' as const,
  experimentVariant: ['control', 'variant-a', 'variant-b'] as const,
} satisfies FlagSchema;

describe('PostHogAdapter', () => {
  let adapter: PostHogAdapter<typeof testSchema>;
  let mocks: Awaited<ReturnType<typeof getMocks>>;

  beforeEach(async () => {
    mocks = await getMocks();
    vi.clearAllMocks();

    adapter = new PostHogAdapter<typeof testSchema>({
      apiKey: 'phc_test_api_key',
      host: 'https://app.posthog.com',
    });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
  });

  describe('initialize', () => {
    it('should initialize the PostHog client', async () => {
      const { PostHog } = await import('posthog-node');

      await adapter.initialize();

      expect(PostHog).toHaveBeenCalledWith(
        'phc_test_api_key',
        expect.objectContaining({
          host: 'https://app.posthog.com',
        })
      );
    });

    it('should use default host if not provided', async () => {
      const adapterWithDefaults = new PostHogAdapter<typeof testSchema>({
        apiKey: 'phc_test_api_key',
      });

      const { PostHog } = await import('posthog-node');

      await adapterWithDefaults.initialize();

      expect(PostHog).toHaveBeenCalledWith(
        'phc_test_api_key',
        expect.objectContaining({
          host: 'https://app.posthog.com',
        })
      );
    });

    it('should reload feature flags when personal API key is provided', async () => {
      const adapterWithPersonalKey = new PostHogAdapter<typeof testSchema>({
        apiKey: 'phc_test_api_key',
        personalApiKey: 'phx_personal_key',
      });

      await adapterWithPersonalKey.initialize();

      expect(mocks.mockReloadFeatureFlags).toHaveBeenCalled();
    });
  });

  describe('evaluate', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should evaluate a feature flag and return the result', async () => {
      mocks.mockGetFeatureFlag.mockResolvedValue('enabled');

      const result = await adapter.evaluate('darkMode', { userId: 'user-123' }, 'disabled');

      expect(mocks.mockGetFeatureFlag).toHaveBeenCalledWith(
        'darkMode',
        'user-123',
        expect.any(Object)
      );
      expect(result).toBe('enabled');
    });

    it('should use anonymous as distinct ID when userId is not provided', async () => {
      mocks.mockGetFeatureFlag.mockResolvedValue('variant-a');

      await adapter.evaluate('experimentVariant', {}, 'control');

      expect(mocks.mockGetFeatureFlag).toHaveBeenCalledWith(
        'experimentVariant',
        'anonymous',
        expect.any(Object)
      );
    });

    it('should return default value when flag evaluation returns undefined', async () => {
      mocks.mockGetFeatureFlag.mockResolvedValue(undefined);

      const result = await adapter.evaluate('darkMode', { userId: 'user-123' }, 'disabled');

      expect(result).toBe('disabled');
    });

    it('should return default value when flag evaluation returns null', async () => {
      mocks.mockGetFeatureFlag.mockResolvedValue(null);

      const result = await adapter.evaluate('newFeature', { userId: 'user-123' }, false);

      expect(result).toBe(false);
    });

    it('should return default value on error', async () => {
      mocks.mockGetFeatureFlag.mockRejectedValue(new Error('Network error'));

      const result = await adapter.evaluate('darkMode', { userId: 'user-123' }, 'disabled');

      expect(result).toBe('disabled');
    });

    it('should pass person properties from context attributes', async () => {
      mocks.mockGetFeatureFlag.mockResolvedValue('enabled');

      await adapter.evaluate(
        'darkMode',
        {
          userId: 'user-123',
          attributes: { plan: 'premium', country: 'US' },
        },
        'disabled'
      );

      expect(mocks.mockGetFeatureFlag).toHaveBeenCalledWith(
        'darkMode',
        'user-123',
        expect.objectContaining({
          personProperties: { plan: 'premium', country: 'US' },
        })
      );
    });

    it('should extract groups from context attributes with $group_ prefix', async () => {
      mocks.mockGetFeatureFlag.mockResolvedValue('enabled');

      await adapter.evaluate(
        'darkMode',
        {
          userId: 'user-123',
          attributes: {
            plan: 'premium',
            $group_company: 'company-abc',
            $group_team: 'team-xyz',
          },
        },
        'disabled'
      );

      expect(mocks.mockGetFeatureFlag).toHaveBeenCalledWith(
        'darkMode',
        'user-123',
        expect.objectContaining({
          personProperties: { plan: 'premium' },
          groups: { company: 'company-abc', team: 'team-xyz' },
        })
      );
    });

    it('should throw error if client not initialized', async () => {
      const uninitializedAdapter = new PostHogAdapter<typeof testSchema>({
        apiKey: 'phc_test_api_key',
      });

      await expect(
        uninitializedAdapter.evaluate('darkMode', { userId: 'user-123' }, 'disabled')
      ).rejects.toThrow('PostHog client not initialized');
    });
  });

  describe('capture', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should capture an event', () => {
      adapter.capture('user-123', 'feature_viewed', { feature: 'darkMode' });

      expect(mocks.mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'feature_viewed',
        properties: { feature: 'darkMode' },
      });
    });

    it('should throw error if client not initialized', () => {
      const uninitializedAdapter = new PostHogAdapter<typeof testSchema>({
        apiKey: 'phc_test_api_key',
      });

      expect(() => uninitializedAdapter.capture('user-123', 'test_event')).toThrow(
        'PostHog client not initialized'
      );
    });
  });

  describe('identify', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should identify a user', () => {
      adapter.identify('user-123', { email: 'user@example.com', plan: 'premium' });

      expect(mocks.mockIdentify).toHaveBeenCalledWith({
        distinctId: 'user-123',
        properties: { email: 'user@example.com', plan: 'premium' },
      });
    });

    it('should throw error if client not initialized', () => {
      const uninitializedAdapter = new PostHogAdapter<typeof testSchema>({
        apiKey: 'phc_test_api_key',
      });

      expect(() => uninitializedAdapter.identify('user-123')).toThrow(
        'PostHog client not initialized'
      );
    });
  });

  describe('close', () => {
    it('should shutdown the PostHog client', async () => {
      await adapter.initialize();
      await adapter.close();

      expect(mocks.mockShutdown).toHaveBeenCalled();
    });

    it('should handle close when client is not initialized', async () => {
      const uninitializedAdapter = new PostHogAdapter<typeof testSchema>({
        apiKey: 'phc_test_api_key',
      });

      // Should not throw
      await expect(uninitializedAdapter.close()).resolves.not.toThrow();
    });
  });
});
