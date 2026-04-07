import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import LayoutShell from '@/components/LayoutShell';

export const metadata = {
  title: 'Planora',
  description: 'My personal planner',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('planora-theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />
      </head>
      <body style={{ display: 'flex', height: '100vh', overflow: 'hidden' }} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <LayoutShell>{children}</LayoutShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
