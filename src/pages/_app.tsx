import { ThemeProvider } from '@/components/ui/theme-provider';
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
      <SocketProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          <Component {...pageProps} />
        </ThemeProvider>
      </SocketProvider>
    </>
  )
}

export default MyApp;
