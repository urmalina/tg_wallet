// pages/_app.tsx
import './globals.css'; // Import global styles
import type { AppProps } from 'next/app';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    // TonConnect UI Provider to wrap your application
    <TonConnectUIProvider manifestUrl="https://raw.githubusercontent.com/urmalina/ton_connect_manifest/refs/heads/main/tonconnect-manifest.json">
      <Component {...pageProps} />
    </TonConnectUIProvider>
  );
}

export default MyApp;