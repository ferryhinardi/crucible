import { FlagProvider } from 'crucible-react';
import { client } from './client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FlagProvider client={client} context={{ userId: 'demo-user' }}>
          {children}
        </FlagProvider>
      </body>
    </html>
  );
}
