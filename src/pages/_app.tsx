import { ThemeProvider } from '@/components/ui/theme-provider';
import Head from 'next/head';
import './globals.css';
import { SocketProvider } from '@/lib/socket';

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = '';
  });
}

function MyApp({ Component, pageProps }: any) {
  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="cesium/Widgets/widgets.css" />
      </Head>
      <SocketProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          <Component {...pageProps} />
        </ThemeProvider>
      </SocketProvider>
    </>
  )
}

export default MyApp;
