'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import AuthGuard from './AuthGuard';

const PUBLIC_PATHS = ['/login'];

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic) {
    return <main style={{ flex: 1, overflow: 'auto', background: 'var(--background)' }}>{children}</main>;
  }

  return (
    <AuthGuard>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--background)' }}>
        {children}
      </main>
    </AuthGuard>
  );
}
