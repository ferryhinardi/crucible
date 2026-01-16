'use client';

import { useFlag } from 'crucible-react';

export default function Home() {
  const checkoutVariant = useFlag('checkout-redesign', 'control');
  const expressPayment = useFlag('express-payment', 'off');

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Crucible Next.js Example</h1>

      <div style={{ marginTop: '2rem' }}>
        <h2>Feature Flags</h2>

        <div style={{ marginTop: '1rem' }}>
          <strong>Checkout Redesign:</strong> {checkoutVariant}
          {checkoutVariant === 'variant-a' && (
            <p style={{ color: 'green' }}>🎉 New checkout experience!</p>
          )}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <strong>Express Payment:</strong> {expressPayment}
          {expressPayment === 'on' && <p style={{ color: 'blue' }}>⚡ Fast checkout enabled</p>}
        </div>
      </div>
    </main>
  );
}
