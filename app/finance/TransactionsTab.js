'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, Timestamp, query, where, orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Plus, X, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Housing', 'Health', 'Shopping', 'Entertainment', 'Education', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];

const CATEGORY_COLORS = {
  Food: '#f59e0b', Transport: '#0ea5e9', Housing: '#6366f1',
  Health: '#22c55e', Shopping: '#f43f5e', Entertainment: '#a855f7',
  Education: '#10b981', Salary: '#22c55e', Freelance: '#6366f1',
  Investment: '#0ea5e9', Gift: '#f43f5e', Other: '#888',
};

const emptyForm = { type: 'expense', amount: '', category: 'Food', description: '', date: '' };

export default function TransactionsTab() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const monthlyTransactions = transactions.filter((t) => {
    const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const income = monthlyTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthlyTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  const expenseByCategory = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});

  function openNew() {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(t) {
    const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    setForm({
      type: t.type, amount: String(t.amount),
      category: t.category, description: t.description || '',
      date: d.toISOString().slice(0, 10),
    });
    setEditId(t.id);
    setShowModal(true);
  }

  async function save() {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0 || !form.date || !user) return;
    const data = {
      type: form.type, amount, category: form.category,
      description: form.description,
      date: Timestamp.fromDate(new Date(form.date)),
      userId: user.uid,
    };
    if (editId) {
      await updateDoc(doc(db, 'transactions', editId), data);
    } else {
      await addDoc(collection(db, 'transactions'), { ...data, createdAt: Timestamp.now() });
    }
    setShowModal(false);
    setEditId(null);
  }

  async function remove() {
    if (!editId) return;
    await deleteDoc(doc(db, 'transactions', editId));
    setShowModal(false);
    setEditId(null);
  }

  const fmt = (n) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const monthLabel = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={iconBtnStyle}><ChevronLeft size={20} /></button>
          <span style={{ fontWeight: '600', fontSize: '1rem', minWidth: '160px', textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={iconBtnStyle}><ChevronRight size={20} /></button>
        </div>
        <button onClick={openNew} style={btnStyle('primary')}><Plus size={15} /> Add Transaction</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <SummaryCard label="Income" value={fmt(income)} icon={<TrendingUp size={20} />} color="#22c55e" />
        <SummaryCard label="Expenses" value={fmt(expenses)} icon={<TrendingDown size={20} />} color="#ef4444" />
        <SummaryCard label="Balance" value={fmt(balance)} icon={<Wallet size={20} />} color={balance >= 0 ? '#6366f1' : '#ef4444'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
        {/* Transaction list */}
        <div>
          <h3 style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-muted)' }}>Transactions</h3>
          {monthlyTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.875rem' }}>No transactions this month.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {monthlyTransactions.map((t) => {
                const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                return (
                  <div key={t.id} onClick={() => openEdit(t)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: `${CATEGORY_COLORS[t.category] || '#888'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700', color: CATEGORY_COLORS[t.category] || '#888' }}>
                      {t.category.slice(0, 3).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{t.description || t.category}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t.category} · {d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense breakdown */}
        <div>
          <h3 style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-muted)' }}>Expense Breakdown</h3>
          {Object.keys(expenseByCategory).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No expenses yet.</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
                const pct = expenses > 0 ? (amount / expenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{cat}</span>
                      <span style={{ fontWeight: '600' }}>{fmt(amount)}</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: CATEGORY_COLORS[cat] || '#888', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>{editId ? 'Edit Transaction' : 'New Transaction'}</h3>
              <button onClick={() => setShowModal(false)} style={iconBtnStyle}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '0', background: 'var(--surface-2)', borderRadius: '8px', padding: '3px' }}>
                {['expense', 'income'].map((t) => (
                  <button key={t} onClick={() => setForm({ ...form, type: t, category: t === 'expense' ? 'Food' : 'Salary' })} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', background: form.type === t ? (t === 'expense' ? '#ef4444' : '#22c55e') : 'transparent', color: form.type === t ? '#fff' : 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <label style={labelStyle}>Amount *</label>
                <input type="number" placeholder="0.00" value={form.amount} min="0" step="0.01" onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ ...inputStyle, fontSize: '1.2rem', fontWeight: '600' }} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {categories.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, category: c })} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', border: `1px solid ${form.category === c ? CATEGORY_COLORS[c] : 'var(--border)'}`, cursor: 'pointer', background: form.category === c ? `${CATEGORY_COLORS[c]}33` : 'transparent', color: form.category === c ? CATEGORY_COLORS[c] : 'var(--text-muted)', fontWeight: form.category === c ? '600' : '400' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description (optional)</label>
                <input placeholder="e.g. Grocery run" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {editId ? <button onClick={remove} style={btnStyle('danger')}><Trash2 size={14} /> Delete</button> : <div />}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowModal(false)} style={btnStyle('secondary')}>Cancel</button>
                  <button onClick={save} style={btnStyle('primary')}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({ label, value, icon, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>{label}</span>
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: '800', color, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function btnStyle(variant) {
  const base = { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer', border: '1px solid transparent' };
  if (variant === 'primary') return { ...base, background: 'var(--accent)', color: '#fff' };
  if (variant === 'secondary') return { ...base, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' };
  if (variant === 'danger') return { ...base, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' };
  return base;
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', width: '440px', maxWidth: '95vw' };
const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' };
const labelStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' };
const iconBtnStyle = { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' };
