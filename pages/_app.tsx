// pages/_app.tsx
import './globals.css'; // Import global styles
import type { AppProps } from 'next/app';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Head from 'next/head';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    // TonConnect UI Provider to wrap your application
    <TonConnectUIProvider manifestUrl="https://raw.githubusercontent.com/urmalina/ton_connect_manifest/refs/heads/main/tonconnect-manifest.json">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      <Component {...pageProps} />
    </TonConnectUIProvider>
  );
}

export default MyApp;