'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CheckSquare, FileText, Briefcase, DollarSign } from 'lucide-react';

const navItems = [
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/finance', label: 'Finance', icon: DollarSign },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', padding: '10px 4px',
              textDecoration: 'none',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.62rem', fontWeight: active ? '600' : '400',
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
