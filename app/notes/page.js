'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp, query, orderBy, where,
} from 'firebase/firestore';
import { Plus, X, Trash2, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/useIsMobile';

const NOTE_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#0ea5e9', '#a855f7',
];

export default function NotesPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notes'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotes(data);
      if (selected) {
        const updated = data.find((n) => n.id === selected.id);
        if (updated) setSelected(updated);
      }
    });
    return () => unsub();
  }, [user]);

  async function createNote() {
    if (!user) return;
    const ref = await addDoc(collection(db, 'notes'), {
      title: 'Untitled',
      content: '',
      color: NOTE_COLORS[0],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId: user.uid,
    });
    setSelected({ id: ref.id, title: 'Untitled', content: '', color: NOTE_COLORS[0] });
    setEditTitle('Untitled');
    setEditContent('');
  }

  function openNote(note) {
    setSelected(note);
    setEditTitle(note.title);
    setEditContent(note.content || '');
  }

  async function saveNote() {
    if (!selected) return;
    setSaving(true);
    await updateDoc(doc(db, 'notes', selected.id), {
      title: editTitle || 'Untitled',
      content: editContent,
      updatedAt: Timestamp.now(),
    });
    setSaving(false);
  }

  async function updateColor(color) {
    if (!selected) return;
    await updateDoc(doc(db, 'notes', selected.id), { color });
    setSelected({ ...selected, color });
  }

  async function deleteNote() {
    if (!selected) return;
    await deleteDoc(doc(db, 'notes', selected.id));
    setSelected(null);
  }

  // Auto-save on content change (debounced via blur)
  const filtered = notes.filter((n) =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const showList = !isMobile || !selected;
  const showEditor = !isMobile || !!selected;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar / List */}
      {showList && (
        <div style={{
          width: isMobile ? '100%' : '260px',
          minWidth: isMobile ? 'unset' : '260px',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--surface)',
        }}>
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Notes</h2>
              <button onClick={createNote} className="icon-btn" title="New note">
                <Plus size={18} />
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input" style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: '0.8rem' }}>
                {search ? 'No results' : 'No notes yet'}
              </div>
            )}
            {filtered.map((note) => (
              <div
                key={note.id}
                onClick={() => openNote(note)}
                className={selected?.id === note.id ? 'list-item active' : 'list-item'}
                style={{
                  padding: '10px 12px',
                  borderLeft: `3px solid ${note.color || NOTE_COLORS[0]}`,
                  marginBottom: '4px',
                }}
              >
                <div style={{ fontWeight: '500', fontSize: '0.85rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.title || 'Untitled'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.content ? note.content.slice(0, 60) : 'Empty'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {formatDate(note.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      {showEditor && (
        selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface)',
            }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {isMobile && (
                  <button onClick={() => setSelected(null)} className="icon-btn" title="Back">
                    <ArrowLeft size={18} />
                  </button>
                )}
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateColor(c)}
                    className={(selected.color || NOTE_COLORS[0]) === c ? 'swatch active' : 'swatch'}
                    style={{ width: '18px', height: '18px', background: c }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {saving && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saving...</span>}
                <button onClick={saveNote} className="btn btn-primary">Save</button>
                <button onClick={deleteNote} className="icon-btn" title="Delete note">
                  <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            </div>

            {/* Title */}
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveNote}
              placeholder="Note title"
              style={{
                padding: '20px 20px 8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: isMobile ? '1.2rem' : '1.4rem',
                fontWeight: '700',
                outline: 'none',
                width: '100%',
              }}
            />

            {/* Content */}
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={saveNote}
              placeholder="Start writing..."
              style={{
                flex: 1, padding: '8px 20px 28px',
                background: 'transparent', border: 'none',
                color: 'var(--text)', fontSize: '0.95rem',
                lineHeight: '1.7', outline: 'none', resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: 'var(--text-muted)' }}>
            <p>Select a note or create a new one</p>
            <button onClick={createNote} className="btn btn-primary"><Plus size={15} /> New Note</button>
          </div>
        )
      )}
    </div>
  );
}

