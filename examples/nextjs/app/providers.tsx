'use client';

import { ReactNode } from 'react';
import { FlagProvider } from 'crucible-react';
import { client } from './client';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FlagProvider client={client} context={{ userId: 'demo-user' }}>
      {children}
    </FlagProvider>
  );
}
