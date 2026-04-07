'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, CheckSquare, FileText, Briefcase, LogOut, DollarSign, Sun, Moon } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const navItems = [
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/finance', label: 'Finance', icon: DollarSign },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <aside style={{
      width: '220px', minWidth: '220px',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <Image src="/logo.svg" alt="Planora" width={30} height={30} />
            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.03em' }}>
              Planora
            </span>
          </div>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '8px 12px', borderRadius: '9px',
                textDecoration: 'none', fontSize: '0.855rem',
                fontWeight: active ? '600' : '400',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                background: active ? 'var(--surface-2)' : 'transparent',
                transition: 'all 0.12s',
                position: 'relative',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: '3px', borderRadius: '0 3px 3px 0',
                  background: 'var(--accent)',
                }} />
              )}
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      {user && (
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '8px 10px', borderRadius: '10px',
            background: 'var(--surface-2)', marginBottom: '6px',
          }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: '700', color: '#fff',
              }}>
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || 'User'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '7px 10px', borderRadius: '8px',
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
