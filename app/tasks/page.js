'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp, query, orderBy, where,
} from 'firebase/firestore';
import { Plus, X, Trash2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'in progress', 'done'];

const priorityColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };
const statusColor = { todo: '#888', 'in progress': '#6366f1', done: '#22c55e' };

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  dueDate: '',
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  function openNew() {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(task) {
    const dueDate = task.dueDate?.toDate
      ? task.dueDate.toDate().toISOString().slice(0, 10)
      : task.dueDate || '';
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      dueDate,
    });
    setEditId(task.id);
    setShowModal(true);
  }

  async function saveTask() {
    if (!form.title.trim() || !user) return;
    const data = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate ? Timestamp.fromDate(new Date(form.dueDate)) : null,
      userId: user.uid,
    };
    if (editId) {
      await updateDoc(doc(db, 'tasks', editId), data);
    } else {
      await addDoc(collection(db, 'tasks'), { ...data, createdAt: Timestamp.now() });
    }
    setShowModal(false);
    setEditId(null);
  }

  async function deleteTask() {
    if (!editId) return;
    await deleteDoc(doc(db, 'tasks', editId));
    setShowModal(false);
    setEditId(null);
  }

  async function toggleStatus(task) {
    const next = { todo: 'in progress', 'in progress': 'done', done: 'todo' };
    await updateDoc(doc(db, 'tasks', task.id), { status: next[task.status] || 'todo' });
  }

  const filtered = filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Tasks</h2>
        <button onClick={openNew} style={btnStyle('primary')}>
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '5px 14px', borderRadius: '20px',
              border: '1px solid var(--border)',
              background: filterStatus === s ? 'var(--accent)' : 'transparent',
              color: filterStatus === s ? '#fff' : 'var(--text-muted)',
              fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: '0.9rem' }}>
            No tasks yet. Create one!
          </div>
        )}
        {filtered.map((task) => (
          <div
            key={task.id}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}
            onClick={() => openEdit(task)}
          >
            {/* Status toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleStatus(task); }}
              style={{
                width: '20px', height: '20px', borderRadius: '50%',
                border: `2px solid ${statusColor[task.status] || '#888'}`,
                background: task.status === 'done' ? statusColor['done'] : 'transparent',
                flexShrink: 0, cursor: 'pointer', marginTop: '2px',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontWeight: '500', fontSize: '0.9rem',
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                  color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)',
                }}>
                  {task.title}
                </span>
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
                  background: `${priorityColor[task.priority]}22`,
                  color: priorityColor[task.priority], fontWeight: '500',
                }}>
                  {task.priority}
                </span>
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
                  background: `${statusColor[task.status]}22`,
                  color: statusColor[task.status], fontWeight: '500', textTransform: 'capitalize',
                }}>
                  {task.status}
                </span>
              </div>
              {task.description && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {task.description}
                </p>
              )}
              {task.dueDate && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Due: {task.dueDate.toDate ? task.dueDate.toDate().toLocaleDateString() : task.dueDate}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>{editId ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={() => setShowModal(false)} style={iconBtnStyle}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                placeholder="Task title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
                autoFocus
              />

              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {editId ? (
                  <button onClick={deleteTask} style={btnStyle('danger')}>
                    <Trash2 size={14} /> Delete
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowModal(false)} style={btnStyle('secondary')}>Cancel</button>
                  <button onClick={saveTask} style={btnStyle('primary')}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(variant) {
  const base = {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 14px', borderRadius: '8px',
    fontSize: '0.85rem', fontWeight: '500',
    cursor: 'pointer', border: '1px solid transparent',
  };
  if (variant === 'primary') return { ...base, background: 'var(--accent)', color: '#fff' };
  if (variant === 'secondary') return { ...base, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' };
  if (variant === 'danger') return { ...base, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' };
  return base;
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: '14px', padding: '24px', width: '480px', maxWidth: '95vw',
};
const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text)', fontSize: '0.875rem', outline: 'none',
};
const labelStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' };
const iconBtnStyle = {
  background: 'transparent', border: 'none', color: 'var(--text-muted)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px',
};
