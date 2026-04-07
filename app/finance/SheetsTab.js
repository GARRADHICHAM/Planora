'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, Timestamp, query, where, orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, X, ChevronLeft } from 'lucide-react';

let _id = 0;
function rowId() { return `row_${Date.now()}_${++_id}`; }

export default function SheetsTab() {
  const { user } = useAuth();
  const [sheets, setSheets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');

  // Derive selected from live sheets — no stale closure issue
  const selected = sheets.find((s) => s.id === selectedId) || null;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'sheets'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setSheets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  async function createSheet() {
    if (!newSheetName.trim() || !user) return;
    const ref = await addDoc(collection(db, 'sheets'), {
      name: newSheetName.trim(),
      userId: user.uid,
      createdAt: Timestamp.now(),
      rows: [],
    });
    setNewSheetName('');
    setShowNewSheet(false);
    setSelectedId(ref.id);
  }

  async function deleteSheet(sheet) {
    await deleteDoc(doc(db, 'sheets', sheet.id));
    if (selectedId === sheet.id) setSelectedId(null);
  }

  async function addRow() {
    if (!selected) return;
    const newRow = { id: rowId(), label: 'New row', type: 'expense', amount: 0 };
    await updateDoc(doc(db, 'sheets', selected.id), {
      rows: [...(selected.rows || []), newRow],
    });
  }

  async function updateRow(rowId, changes) {
    if (!selected) return;
    const rows = (selected.rows || []).map((r) => r.id === rowId ? { ...r, ...changes } : r);
    await updateDoc(doc(db, 'sheets', selected.id), { rows });
  }

  async function deleteRow(rowId) {
    if (!selected) return;
    const rows = (selected.rows || []).filter((r) => r.id !== rowId);
    await updateDoc(doc(db, 'sheets', selected.id), { rows });
  }

  async function renameSheet(name) {
    if (!selected) return;
    await updateDoc(doc(db, 'sheets', selected.id), { name });
  }

  const fmt = (n) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  function calcTotals(sheet) {
    const rows = sheet.rows || [];
    const revenue = rows.filter((r) => r.type === 'revenue').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const expenses = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    return { revenue, expenses, balance: revenue - expenses };
  }

  // ── Sheet list ────────────────────────────────────────────────
  if (!selected) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Budget Sheets</h3>
          <button onClick={() => setShowNewSheet(true)} style={btnStyle('primary')}>
            <Plus size={15} /> New Sheet
          </button>
        </div>

        {showNewSheet && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              autoFocus
              placeholder="Sheet name (e.g. April Budget)"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createSheet()}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={createSheet} style={btnStyle('primary')}>Create</button>
            <button onClick={() => setShowNewSheet(false)} style={btnStyle('secondary')}>Cancel</button>
          </div>
        )}

        {sheets.length === 0 && !showNewSheet && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: '0.875rem' }}>
            No sheets yet. Create one to start budgeting.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {sheets.map((sheet) => {
            const { revenue, expenses, balance } = calcTotals(sheet);
            return (
              <div
                key={sheet.id}
                onClick={() => setSelectedId(sheet.id)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', cursor: 'pointer', position: 'relative' }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSheet(sheet); }}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '12px', paddingRight: '20px' }}>{sheet.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Revenue</span>
                    <span style={{ color: '#22c55e', fontWeight: '600' }}>{fmt(revenue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expenses</span>
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>{fmt(expenses)}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: '600' }}>Balance</span>
                    <span style={{ fontWeight: '800', color: balance >= 0 ? '#6366f1' : '#ef4444' }}>{fmt(balance)}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                  {(sheet.rows || []).length} rows
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Sheet detail ──────────────────────────────────────────────
  const { revenue, expenses, balance } = calcTotals(selected);
  const revenueRows = (selected.rows || []).filter((r) => r.type === 'revenue');
  const expenseRows = (selected.rows || []).filter((r) => r.type === 'expense');

  return (
    <div>
      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setSelectedId(null)} style={iconBtnStyle}>
          <ChevronLeft size={20} />
        </button>
        <input
          value={selected.name}
          onChange={(e) => renameSheet(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '1.2rem', fontWeight: '700', outline: 'none', flex: 1 }}
        />
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total Revenue', value: fmt(revenue), color: '#22c55e' },
          { label: 'Total Expenses', value: fmt(expenses), color: '#ef4444' },
          { label: 'Balance', value: fmt(balance), color: balance >= 0 ? '#6366f1' : '#ef4444' },
        ].map((c) => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 36px', background: 'var(--surface-2)', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          {['Label', 'Type', 'Amount', ''].map((h) => (
            <div key={h} style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>

        {/* Revenue section */}
        {revenueRows.length > 0 && (
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '6px 16px', fontSize: '0.72rem', fontWeight: '700', color: '#22c55e', background: '#22c55e0d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</div>
            {revenueRows.map((row) => (
              <SheetRow key={row.id} row={row} onUpdate={(changes) => updateRow(row.id, changes)} onDelete={() => deleteRow(row.id)} />
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 36px', padding: '8px 16px', background: '#22c55e0d' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#22c55e', gridColumn: '1/3' }}>Subtotal</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#22c55e' }}>{fmt(revenue)}</div>
            </div>
          </div>
        )}

        {/* Expense section */}
        {expenseRows.length > 0 && (
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '6px 16px', fontSize: '0.72rem', fontWeight: '700', color: '#ef4444', background: '#ef44440d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expenses</div>
            {expenseRows.map((row) => (
              <SheetRow key={row.id} row={row} onUpdate={(changes) => updateRow(row.id, changes)} onDelete={() => deleteRow(row.id)} />
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 36px', padding: '8px 16px', background: '#ef44440d' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ef4444', gridColumn: '1/3' }}>Subtotal</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#ef4444' }}>{fmt(expenses)}</div>
            </div>
          </div>
        )}

        {(selected.rows || []).length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px', fontSize: '0.875rem' }}>
            No rows yet. Click "Add Row" to get started.
          </div>
        )}

        {/* Balance row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 36px', padding: '14px 16px', background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', gridColumn: '1/3' }}>Balance</div>
          <div style={{ fontWeight: '800', fontSize: '1.1rem', color: balance >= 0 ? '#6366f1' : '#ef4444' }}>{fmt(balance)}</div>
        </div>

        {/* Add row */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button onClick={addRow} style={{ ...btnStyle('secondary'), fontSize: '0.8rem', padding: '6px 12px' }}>
            <Plus size={13} /> Add Row
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetRow({ row, onUpdate, onDelete }) {
  const [label, setLabel] = useState(row.label);
  const [amount, setAmount] = useState(String(row.amount || ''));

  // Sync if row changes from Firestore
  useEffect(() => { setLabel(row.label); }, [row.label]);
  useEffect(() => { setAmount(String(row.amount || '')); }, [row.amount]);

  const TYPE_COLOR = { revenue: '#22c55e', expense: '#ef4444' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 36px', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => onUpdate({ label })}
        style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', padding: '11px 0' }}
      />
      <div style={{ display: 'flex', gap: '4px' }}>
        {['revenue', 'expense'].map((t) => (
          <button
            key={t}
            onClick={() => onUpdate({ type: t })}
            style={{
              padding: '3px 8px', borderRadius: '4px', border: 'none', fontSize: '0.7rem',
              cursor: 'pointer', fontWeight: '600', textTransform: 'capitalize',
              background: row.type === t ? `${TYPE_COLOR[t]}22` : 'transparent',
              color: row.type === t ? TYPE_COLOR[t] : 'var(--text-muted)',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        type="number"
        value={amount}
        min="0"
        step="0.01"
        onChange={(e) => setAmount(e.target.value)}
        onBlur={() => onUpdate({ amount: parseFloat(amount) || 0 })}
        placeholder="0.00"
        style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.875rem', fontWeight: '600', outline: 'none', padding: '11px 0', textAlign: 'right', paddingRight: '12px' }}
      />
      <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
        <X size={14} />
      </button>
    </div>
  );
}

function btnStyle(variant) {
  const base = { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer', border: '1px solid transparent' };
  if (variant === 'primary') return { ...base, background: 'var(--accent)', color: '#fff' };
  if (variant === 'secondary') return { ...base, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' };
  return base;
}

const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' };
const iconBtnStyle = { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' };
