import { describe, it, expect } from 'vitest';
import { LocalAdapter } from './index';

describe('LocalAdapter', () => {
  it('should return static flag value', async () => {
    const adapter = new LocalAdapter({
      flags: {
        'test-flag': 'variant-a',
      },
    });

    await adapter.initialize();
    const result = await adapter.evaluate('test-flag', {}, 'control');

    expect(result).toBe('variant-a');
  });

  it('should return default value when flag not configured', async () => {
    const adapter = new LocalAdapter({ flags: {} });

    await adapter.initialize();
    const result = await adapter.evaluate('missing-flag', {}, 'default');

    expect(result).toBe('default');
  });

  it('should apply rules based on context', async () => {
    const adapter = new LocalAdapter({
      flags: { 'test-flag': 'control' },
      rules: [
        {
          flag: 'test-flag',
          match: (ctx) => ctx.userId === 'vip-user',
          variant: 'vip-variant',
        },
      ],
    });

    await adapter.initialize();
    
    const normalResult = await adapter.evaluate('test-flag', { userId: 'normal' }, 'control');
    expect(normalResult).toBe('control');

    const vipResult = await adapter.evaluate('test-flag', { userId: 'vip-user' }, 'control');
    expect(vipResult).toBe('vip-variant');
  });

  it('should prioritize rules over static config', async () => {
    const adapter = new LocalAdapter({
      flags: { 'test-flag': 'static-value' },
      rules: [
        {
          flag: 'test-flag',
          match: () => true,
          variant: 'rule-value',
        },
      ],
    });

    await adapter.initialize();
    const result = await adapter.evaluate('test-flag', {}, 'default');

    expect(result).toBe('rule-value');
  });
});
