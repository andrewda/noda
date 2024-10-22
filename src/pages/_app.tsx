import { ThemeProvider } from '@/components/ui/theme-provider';
import Head from 'next/head';
import './globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="cesium/Widgets/widgets.css" />
      </Head>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <Component {...pageProps} />
      </ThemeProvider>
    </>
  )
}

export default MyApp;
