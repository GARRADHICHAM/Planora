'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, Timestamp, query, where, orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Plus, X, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Table2 } from 'lucide-react';
import TransactionsTab from './TransactionsTab';
import SheetsTab from './SheetsTab';

export default function FinancePage() {
  const [tab, setTab] = useState('transactions');

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Finance</h2>
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
          {[
            { id: 'transactions', label: 'Transactions' },
            { id: 'sheets', label: 'Sheets' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '6px 16px', borderRadius: '6px', border: 'none',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-muted)',
                fontWeight: tab === t.id ? '600' : '400',
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'sheets' && <SheetsTab />}
    </div>
  );
}
