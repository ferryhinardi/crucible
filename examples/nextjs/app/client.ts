import { defineFlags, createFlagClient } from '@crucible/core';
import { LocalAdapter } from '@crucible/adapter-local';

const flags = defineFlags({
  'checkout-redesign': ['control', 'variant-a', 'variant-b'] as const,
  'express-payment': ['on', 'off'] as const,
  'promo-banner-text': 'string' as const,
});

export const client = createFlagClient({
  adapter: new LocalAdapter<typeof flags>({
    flags: {
      'checkout-redesign': 'variant-a',
      'express-payment': 'on',
      'promo-banner-text': 'Get 20% off your first order!',
    },
    rules: [
      {
        flag: 'checkout-redesign',
        match: (ctx) => ctx.userId?.startsWith('vip-') ?? false,
        variant: 'variant-b',
      },
    ],
  }),
  schema: flags,
  onExposure: (flag, variant, context) => {
    console.log('[Analytics]', { flag, variant, userId: context.userId });
  },
});

// Initialize client
client.initialize();
