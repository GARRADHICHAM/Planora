'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, CheckSquare, FileText, Briefcase, LogOut, DollarSign } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

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
      padding: '24px 0',
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image src="/logo.svg" alt="Planora" width={32} height={32} />
          <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Planora
          </h1>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px', flex: 1 }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px',
                textDecoration: 'none', fontSize: '0.875rem',
                fontWeight: active ? '600' : '400',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                background: active ? 'var(--surface-2)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      {user && (
        <div style={{ padding: '12px 10px 0', borderTop: '1px solid var(--border)', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', marginBottom: '4px' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
            ) : (
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: '700', color: '#fff',
              }}>
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.825rem',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
