import { describe, it, expect, vi } from 'vitest';
import { defineFlags, createFlagClient } from './index';
import type { FlagAdapter } from './index';

describe('defineFlags', () => {
  it('should return the schema as-is', () => {
    const schema = defineFlags({
      'test-flag': ['a', 'b'],
      'bool-flag': 'boolean',
    });

    expect(schema).toEqual({
      'test-flag': ['a', 'b'],
      'bool-flag': 'boolean',
    });
  });
});

describe('createFlagClient', () => {
  it('should initialize adapter', async () => {
    const mockAdapter: FlagAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn(),
    };

    const schema = defineFlags({ 'test-flag': ['a', 'b'] });
    const client = createFlagClient({ adapter: mockAdapter, schema });

    await client.initialize();

    expect(mockAdapter.initialize).toHaveBeenCalledOnce();
  });

  it('should evaluate flag and call onExposure', async () => {
    const onExposure = vi.fn();
    const mockAdapter: FlagAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('variant-a'),
    };

    const schema = defineFlags({ 'test-flag': ['control', 'variant-a'] });
    const client = createFlagClient({
      adapter: mockAdapter,
      schema,
      onExposure,
    });

    await client.initialize();
    const result = await client.evaluate('test-flag', { userId: '123' });

    expect(result).toBe('variant-a');
    expect(onExposure).toHaveBeenCalledWith('test-flag', 'variant-a', {
      userId: '123',
      attributes: {},
    });
  });

  it('should return default value on adapter failure', async () => {
    const mockAdapter: FlagAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    const schema = defineFlags({ 'test-flag': ['control', 'variant-a'] });
    const client = createFlagClient({ adapter: mockAdapter, schema });

    await client.initialize();
    const result = await client.evaluate('test-flag', {}, 'control');

    expect(result).toBe('control');
  });

  it('should throw if evaluate called before initialize', async () => {
    const mockAdapter: FlagAdapter = {
      initialize: vi.fn(),
      evaluate: vi.fn(),
    };

    const schema = defineFlags({ 'test-flag': ['a', 'b'] });
    const client = createFlagClient({ adapter: mockAdapter, schema });

    await expect(client.evaluate('test-flag')).rejects.toThrow('not initialized');
  });

  it('should merge default context with evaluate context', async () => {
    const mockAdapter: FlagAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('a'),
    };

    const schema = defineFlags({ 'test-flag': ['a', 'b'] });
    const client = createFlagClient({
      adapter: mockAdapter,
      schema,
      defaultContext: { attributes: { country: 'ID' } },
    });

    await client.initialize();
    await client.evaluate('test-flag', { userId: '123' });

    expect(mockAdapter.evaluate).toHaveBeenCalledWith(
      'test-flag',
      { attributes: { country: 'ID' }, userId: '123' },
      'a'
    );
  });

  it('should deep merge attributes from default and evaluate context', async () => {
    const mockAdapter: FlagAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('a'),
    };

    const schema = defineFlags({ 'test-flag': ['a', 'b'] });
    const client = createFlagClient({
      adapter: mockAdapter,
      schema,
      defaultContext: {
        userId: 'default-user',
        attributes: { country: 'ID', plan: 'free' },
      },
    });

    await client.initialize();
    await client.evaluate('test-flag', {
      userId: '123',
      attributes: { plan: 'premium', feature: 'beta' },
    });

    // userId should be overridden, attributes should be deep merged
    expect(mockAdapter.evaluate).toHaveBeenCalledWith(
      'test-flag',
      {
        userId: '123',
        attributes: { country: 'ID', plan: 'premium', feature: 'beta' },
      },
      'a'
    );
  });
});
