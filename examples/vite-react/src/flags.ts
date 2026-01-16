import { defineFlags, createFlagClient } from 'crucible-core';
import { LocalAdapter } from 'crucible-adapter-local';

/**
 * Define your feature flag schema with full type safety.
 *
 * Supported flag types:
 * - Variant arrays: ['control', 'variant-a', 'variant-b'] as const
 * - Boolean-like: ['on', 'off'] as const
 * - String flags: 'string' as const
 */
export const flags = defineFlags({
  // A/B test with multiple variants
  'checkout-redesign': ['control', 'variant-a', 'variant-b'] as const,

  // Simple on/off toggle
  'dark-mode': ['on', 'off'] as const,

  // Another toggle for express payment feature
  'express-payment': ['on', 'off'] as const,

  // Dynamic string value
  'promo-banner-text': 'string' as const,

  // New feature rollout
  'new-dashboard': ['on', 'off'] as const,
});

/**
 * Create the flag client with LocalAdapter for development.
 *
 * In production, you would use a different adapter like:
 * - LaunchDarklyAdapter for LaunchDarkly integration
 * - A custom adapter for your feature flag service
 */
export const client = createFlagClient({
  adapter: new LocalAdapter<typeof flags>({
    // Default flag values (used when no rules match)
    flags: {
      'checkout-redesign': 'control',
      'dark-mode': 'off',
      'express-payment': 'off',
      'promo-banner-text': 'Welcome to our store!',
      'new-dashboard': 'off',
    },

    // Targeting rules - evaluated in order, first match wins
    rules: [
      // VIP users get the new checkout experience
      {
        flag: 'checkout-redesign',
        match: (ctx) => ctx.userId?.startsWith('vip-') ?? false,
        variant: 'variant-b',
      },

      // Beta testers get variant-a
      {
        flag: 'checkout-redesign',
        match: (ctx) => ctx.attributes?.betaTester === true,
        variant: 'variant-a',
      },

      // VIP users always get express payment
      {
        flag: 'express-payment',
        match: (ctx) => ctx.userId?.startsWith('vip-') ?? false,
        variant: 'on',
      },

      // VIP users get early access to new dashboard
      {
        flag: 'new-dashboard',
        match: (ctx) => ctx.userId?.startsWith('vip-') ?? false,
        variant: 'on',
      },

      // Premium users (tier attribute) get special promo text
      {
        flag: 'promo-banner-text',
        match: (ctx) => ctx.attributes?.tier === 'premium',
        variant: 'Exclusive 30% off for Premium members!',
      },

      // Percentage rollout: 50% of users get express payment
      {
        flag: 'express-payment',
        match: (ctx) => {
          if (!ctx.userId) return false;
          // Simple hash-based percentage rollout
          const hash = ctx.userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return hash % 100 < 50;
        },
        variant: 'on',
      },
    ],
  }),

  schema: flags,

  // Track flag exposures for analytics
  onExposure: (flag, variant, context) => {
    console.log('[Analytics] Flag Exposure:', {
      flag,
      variant,
      userId: context.userId,
      attributes: context.attributes,
      timestamp: new Date().toISOString(),
    });
  },
});

// Initialize the client
client.initialize();
