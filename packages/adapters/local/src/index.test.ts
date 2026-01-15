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

  it('should apply percentage rollout consistently', async () => {
    const adapter = new LocalAdapter({
      flags: { 'test-flag': 'control' },
      rollouts: [
        {
          flag: 'test-flag',
          percentage: 50,
          variant: 'variant-a',
        },
      ],
    });

    await adapter.initialize();

    // Same user should always get same result
    const result1 = await adapter.evaluate('test-flag', { userId: 'user-123' }, 'control');
    const result2 = await adapter.evaluate('test-flag', { userId: 'user-123' }, 'control');
    expect(result1).toBe(result2);

    // Test multiple users to verify distribution
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        adapter.evaluate('test-flag', { userId: `user-${i}` }, 'control')
      )
    );

    const variantACount = results.filter(r => r === 'variant-a').length;
    // Should be roughly 50%, allow 30-70% range for test stability
    expect(variantACount).toBeGreaterThan(30);
    expect(variantACount).toBeLessThan(70);
  });

  it('should handle 0% and 100% rollouts', async () => {
    const adapter0 = new LocalAdapter({
      flags: { 'test-flag': 'control' },
      rollouts: [{ flag: 'test-flag', percentage: 0, variant: 'variant-a' }],
    });

    const adapter100 = new LocalAdapter({
      flags: { 'test-flag': 'control' },
      rollouts: [{ flag: 'test-flag', percentage: 100, variant: 'variant-a' }],
    });

    await adapter0.initialize();
    await adapter100.initialize();

    expect(await adapter0.evaluate('test-flag', { userId: 'user-1' }, 'control')).toBe('control');
    expect(await adapter100.evaluate('test-flag', { userId: 'user-1' }, 'control')).toBe('variant-a');
  });

  it('should fallback to static config when no userId for rollout', async () => {
    const adapter = new LocalAdapter({
      flags: { 'test-flag': 'control' },
      rollouts: [{ flag: 'test-flag', percentage: 100, variant: 'variant-a' }],
    });

    await adapter.initialize();
    // No userId provided, should use static config
    const result = await adapter.evaluate('test-flag', {}, 'control');
    expect(result).toBe('control');
  });

  it('should prioritize rules over rollouts', async () => {
    const adapter = new LocalAdapter({
      flags: { 'test-flag': 'control' },
      rules: [
        {
          flag: 'test-flag',
          match: (ctx) => ctx.userId === 'vip-user',
          variant: 'vip-variant',
        },
      ],
      rollouts: [{ flag: 'test-flag', percentage: 100, variant: 'rollout-variant' }],
    });

    await adapter.initialize();
    
    // Rule should win over rollout
    expect(await adapter.evaluate('test-flag', { userId: 'vip-user' }, 'control')).toBe('vip-variant');
    
    // Non-VIP user should get rollout
    expect(await adapter.evaluate('test-flag', { userId: 'normal-user' }, 'control')).toBe('rollout-variant');
  });
});
