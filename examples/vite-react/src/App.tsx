import { useState } from 'react';
import { FlagProvider, useFlag, useFlagWithStatus, useFlagContext } from 'crucible-react';
import { client } from './flags';

/**
 * Demo component showing various flag usage patterns.
 */
function FlagDemo() {
  const context = useFlagContext();

  // Basic useFlag hook - simple flag evaluation
  const checkoutVariant = useFlag('checkout-redesign', 'control');
  const expressPayment = useFlag('express-payment', 'off');
  const promoText = useFlag('promo-banner-text', 'Welcome!');

  // useFlagWithStatus - includes loading and error states
  const { value: newDashboard, status: dashboardStatus } = useFlagWithStatus(
    'new-dashboard',
    'off'
  );
  const { value: darkMode, status: darkModeStatus } = useFlagWithStatus('dark-mode', 'off');

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Current Context Display */}
      <section style={sectionStyle}>
        <h2>Current Context</h2>
        <pre style={codeStyle}>{JSON.stringify(context, null, 2)}</pre>
      </section>

      {/* Promo Banner */}
      <section style={{ ...sectionStyle, backgroundColor: '#f0f9ff', borderColor: '#0284c7' }}>
        <h2>Promo Banner (String Flag)</h2>
        <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0284c7' }}>{promoText}</p>
        <p style={noteStyle}>
          Premium users see a special 30% off message. VIP users see the default welcome text.
        </p>
      </section>

      {/* Checkout Redesign A/B Test */}
      <section style={sectionStyle}>
        <h2>Checkout Redesign (A/B Test)</h2>
        <div style={flagValueStyle}>
          Current variant: <strong>{checkoutVariant}</strong>
        </div>

        {checkoutVariant === 'control' && (
          <div style={{ ...variantBoxStyle, backgroundColor: '#f3f4f6' }}>
            <strong>Control:</strong> Original checkout flow
          </div>
        )}
        {checkoutVariant === 'variant-a' && (
          <div style={{ ...variantBoxStyle, backgroundColor: '#dcfce7' }}>
            <strong>Variant A:</strong> Streamlined single-page checkout
          </div>
        )}
        {checkoutVariant === 'variant-b' && (
          <div style={{ ...variantBoxStyle, backgroundColor: '#dbeafe' }}>
            <strong>Variant B:</strong> Multi-step wizard checkout (VIP exclusive)
          </div>
        )}

        <p style={noteStyle}>
          VIP users (userId starts with "vip-") get variant-b. Beta testers get variant-a. Others
          get control.
        </p>
      </section>

      {/* Express Payment Toggle */}
      <section style={sectionStyle}>
        <h2>Express Payment (On/Off Toggle)</h2>
        <div style={flagValueStyle}>
          Status:{' '}
          <strong style={{ color: expressPayment === 'on' ? '#16a34a' : '#dc2626' }}>
            {expressPayment === 'on' ? 'Enabled' : 'Disabled'}
          </strong>
        </div>

        {expressPayment === 'on' && (
          <div style={{ ...variantBoxStyle, backgroundColor: '#dcfce7' }}>
            Express checkout is enabled! Users can pay with one click.
          </div>
        )}

        <p style={noteStyle}>
          VIP users always get express payment. 50% of regular users get it via percentage rollout.
        </p>
      </section>

      {/* New Dashboard with Status */}
      <section style={sectionStyle}>
        <h2>New Dashboard (with Loading Status)</h2>

        {dashboardStatus.isLoading ? (
          <div style={loadingStyle}>Loading flag...</div>
        ) : dashboardStatus.error ? (
          <div style={errorStyle}>Error: {dashboardStatus.error.message}</div>
        ) : (
          <>
            <div style={flagValueStyle}>
              Status:{' '}
              <strong style={{ color: newDashboard === 'on' ? '#16a34a' : '#dc2626' }}>
                {newDashboard === 'on' ? 'Enabled' : 'Disabled'}
              </strong>
            </div>

            {newDashboard === 'on' && (
              <div style={{ ...variantBoxStyle, backgroundColor: '#fef3c7' }}>
                You have early access to the new dashboard!
              </div>
            )}
          </>
        )}

        <p style={noteStyle}>
          Uses useFlagWithStatus() to show loading and error states. VIP users get early access.
        </p>
      </section>

      {/* Dark Mode with Status */}
      <section style={sectionStyle}>
        <h2>Dark Mode (with Loading Status)</h2>

        {darkModeStatus.isLoading ? (
          <div style={loadingStyle}>Loading flag...</div>
        ) : darkModeStatus.error ? (
          <div style={errorStyle}>Error: {darkModeStatus.error.message}</div>
        ) : (
          <div style={flagValueStyle}>
            Status: <strong>{darkMode === 'on' ? 'Dark' : 'Light'}</strong> mode
          </div>
        )}

        <p style={noteStyle}>Dark mode is off by default for all users.</p>
      </section>
    </div>
  );
}

/**
 * Main App component with user context controls.
 */
export default function App() {
  const [userId, setUserId] = useState('user-123');
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [tier, setTier] = useState<'standard' | 'premium'>('standard');

  // Build the evaluation context
  const context = {
    userId,
    attributes: {
      betaTester: isBetaTester,
      tier,
    },
  };

  return (
    <FlagProvider client={client} context={context}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <h1>Crucible Vite + React Example</h1>
          <p style={{ color: '#6b7280' }}>
            Type-safe feature flags with targeting rules and percentage rollouts
          </p>
        </header>

        {/* User Context Controls */}
        <section style={{ ...sectionStyle, backgroundColor: '#faf5ff', borderColor: '#9333ea' }}>
          <h2>User Context Controls</h2>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Change these values to see how different users experience different flags.
          </p>

          <div style={controlsGridStyle}>
            {/* User ID Input */}
            <div style={controlGroupStyle}>
              <label htmlFor="userId" style={labelStyle}>
                User ID:
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={inputStyle}
                placeholder="e.g., vip-user-1, user-123"
              />
              <span style={hintStyle}>Try "vip-" prefix for VIP features</span>
            </div>

            {/* Beta Tester Toggle */}
            <div style={controlGroupStyle}>
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={isBetaTester}
                  onChange={(e) => setIsBetaTester(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                Beta Tester
              </label>
              <span style={hintStyle}>Gets checkout variant-a</span>
            </div>

            {/* Tier Select */}
            <div style={controlGroupStyle}>
              <label htmlFor="tier" style={labelStyle}>
                User Tier:
              </label>
              <select
                id="tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as 'standard' | 'premium')}
                style={inputStyle}
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
              <span style={hintStyle}>Premium gets special promo</span>
            </div>
          </div>

          {/* Quick User Presets */}
          <div style={{ marginTop: '1.5rem' }}>
            <strong>Quick Presets:</strong>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setUserId('user-123');
                  setIsBetaTester(false);
                  setTier('standard');
                }}
                style={presetButtonStyle}
              >
                Regular User
              </button>
              <button
                onClick={() => {
                  setUserId('vip-user-1');
                  setIsBetaTester(false);
                  setTier('standard');
                }}
                style={presetButtonStyle}
              >
                VIP User
              </button>
              <button
                onClick={() => {
                  setUserId('user-456');
                  setIsBetaTester(true);
                  setTier('standard');
                }}
                style={presetButtonStyle}
              >
                Beta Tester
              </button>
              <button
                onClick={() => {
                  setUserId('user-789');
                  setIsBetaTester(false);
                  setTier('premium');
                }}
                style={presetButtonStyle}
              >
                Premium User
              </button>
            </div>
          </div>
        </section>

        {/* Flag Demo */}
        <FlagDemo />

        {/* Footer */}
        <footer style={footerStyle}>
          <p>Open the browser console to see analytics events from flag exposures.</p>
          <p>
            <a href="https://github.com/anomalyco/crucible" style={{ color: '#2563eb' }}>
              View Crucible on GitHub
            </a>
          </p>
        </footer>
      </div>
    </FlagProvider>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto',
  padding: '2rem',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '2rem',
  paddingBottom: '1rem',
  borderBottom: '2px solid #e5e7eb',
};

const sectionStyle: React.CSSProperties = {
  padding: '1.5rem',
  marginBottom: '1.5rem',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
};

const codeStyle: React.CSSProperties = {
  backgroundColor: '#1f2937',
  color: '#f9fafb',
  padding: '1rem',
  borderRadius: '4px',
  overflow: 'auto',
  fontSize: '0.875rem',
};

const flagValueStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  marginBottom: '1rem',
};

const variantBoxStyle: React.CSSProperties = {
  padding: '1rem',
  borderRadius: '4px',
  marginBottom: '1rem',
};

const noteStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#6b7280',
  fontStyle: 'italic',
  marginTop: '0.5rem',
  marginBottom: 0,
};

const loadingStyle: React.CSSProperties = {
  color: '#9333ea',
  fontWeight: 'bold',
};

const errorStyle: React.CSSProperties = {
  color: '#dc2626',
  fontWeight: 'bold',
};

const controlsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
};

const controlGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '0.875rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
  fontSize: '1rem',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#9ca3af',
};

const presetButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  border: '1px solid #9333ea',
  backgroundColor: '#faf5ff',
  color: '#9333ea',
  cursor: 'pointer',
  fontSize: '0.875rem',
};

const footerStyle: React.CSSProperties = {
  marginTop: '3rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
  textAlign: 'center',
  color: '#6b7280',
  fontSize: '0.875rem',
};
