'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import AuthGuard from './AuthGuard';
import { useIsMobile } from '@/hooks/useIsMobile';

const PUBLIC_PATHS = ['/login'];

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic) {
    return (
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--background)' }}>
        {children}
      </main>
    );
  }

  return (
    <AuthGuard>
      {!isMobile && <Sidebar />}
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--background)',
        paddingBottom: isMobile ? '70px' : '0',
      }}>
        {children}
      </main>
      {isMobile && <MobileNav />}
    </AuthGuard>
  );
}
