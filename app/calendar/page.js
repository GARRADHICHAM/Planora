'use client';
import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp,
  query, where, getDocs,
} from 'firebase/firestore';
import { Plus, Upload, X, Trash2, CalendarDays } from 'lucide-react';
import ICAL from 'ical.js';
import { useAuth } from '@/context/AuthContext';

const EVENT_COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Sky', value: '#0ea5e9' },
  { label: 'Purple', value: '#a855f7' },
];

const emptyForm = {
  title: '',
  start: '',
  end: '',
  allDay: false,
  color: '#6366f1',
  description: '',
  type: 'event',
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [imports, setImports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportsPanel, setShowImportsPanel] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [deletingImportId, setDeletingImportId] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'events'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title,
            start: data.start?.toDate ? data.start.toDate() : data.start,
            end: data.end?.toDate ? data.end.toDate() : data.end,
            allDay: data.allDay || false,
            backgroundColor: data.color || '#6366f1',
            borderColor: data.color || '#6366f1',
            extendedProps: { description: data.description, type: data.type, importId: data.importId },
          };
        })
      );
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'calendar_imports'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setImports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  function openNew(dateInfo) {
    const start = dateInfo?.startStr || '';
    const end = dateInfo?.endStr || '';
    setForm({ ...emptyForm, start, end });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(info) {
    const ev = info.event;
    const toLocalInput = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      const pad = (n) => String(n).padStart(2, '0');
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };
    setForm({
      title: ev.title,
      start: toLocalInput(ev.start),
      end: toLocalInput(ev.end),
      allDay: ev.allDay,
      color: ev.backgroundColor || '#6366f1',
      description: ev.extendedProps?.description || '',
      type: ev.extendedProps?.type || 'event',
    });
    setEditId(ev.id);
    setShowModal(true);
  }

  async function saveEvent() {
    if (!form.title.trim() || !user) return;
    const data = {
      title: form.title,
      start: form.start ? Timestamp.fromDate(new Date(form.start)) : null,
      end: form.end ? Timestamp.fromDate(new Date(form.end)) : null,
      allDay: form.allDay,
      color: form.color,
      description: form.description,
      type: form.type,
      userId: user.uid,
    };
    if (editId) {
      await updateDoc(doc(db, 'events', editId), data);
    } else {
      await addDoc(collection(db, 'events'), data);
    }
    setShowModal(false);
    setForm(emptyForm);
    setEditId(null);
  }

  async function deleteEvent() {
    if (!editId) return;
    await deleteDoc(doc(db, 'events', editId));
    setShowModal(false);
    setEditId(null);
  }

  async function handleICSImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const jcal = ICAL.parse(text);
      const comp = new ICAL.Component(jcal);
      const vevents = comp.getAllSubcomponents('vevent');

      // Create an import record first
      const importRef = await addDoc(collection(db, 'calendar_imports'), {
        filename: file.name,
        count: vevents.length,
        importedAt: Timestamp.now(),
        userId: user.uid,
      });

      const batch = vevents.map((ve) => {
        const ev = new ICAL.Event(ve);
        const start = ev.startDate?.toJSDate();
        const end = ev.endDate?.toJSDate();
        return addDoc(collection(db, 'events'), {
          title: ev.summary || 'Imported Event',
          start: start ? Timestamp.fromDate(start) : null,
          end: end ? Timestamp.fromDate(end) : null,
          allDay: ev.startDate?.isDate || false,
          color: '#6366f1',
          description: ev.description || '',
          type: 'event',
          importId: importRef.id,
          userId: user.uid,
        });
      });
      await Promise.all(batch);
    } catch {
      alert('Could not parse the file. Make sure it is a valid .ics file.');
    }
    e.target.value = '';
  }

  async function deleteImport(imp) {
    if (!user) return;
    setDeletingImportId(imp.id);
    try {
      const q = query(
        collection(db, 'events'),
        where('userId', '==', user.uid),
        where('importId', '==', imp.id)
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'calendar_imports', imp.id));
    } finally {
      setDeletingImportId(null);
    }
  }

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Calendar</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {imports.length > 0 && (
            <button onClick={() => setShowImportsPanel(true)} style={btnStyle('secondary')}>
              <CalendarDays size={15} /> Imported ({imports.length})
            </button>
          )}
          <button onClick={() => fileRef.current?.click()} style={btnStyle('secondary')}>
            <Upload size={15} /> Import .ics
          </button>
          <input ref={fileRef} type="file" accept=".ics,.vcs" style={{ display: 'none' }} onChange={handleICSImport} />
          <button onClick={() => openNew({})} style={btnStyle('primary')}>
            <Plus size={15} /> Add Event
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, background: 'var(--surface)', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          events={events}
          selectable
          select={openNew}
          eventClick={openEdit}
          height="100%"
          editable
          eventDrop={async (info) => {
            await updateDoc(doc(db, 'events', info.event.id), {
              start: Timestamp.fromDate(info.event.start),
              end: info.event.end ? Timestamp.fromDate(info.event.end) : null,
            });
          }}
        />
      </div>

      {/* Event Modal */}
      {showModal && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>{editId ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => setShowModal(false)} style={iconBtnStyle}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['event', 'task', 'reminder'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, type: t })}
                    style={{
                      padding: '5px 14px', borderRadius: '20px',
                      border: '1px solid var(--border)',
                      background: form.type === t ? 'var(--accent)' : 'transparent',
                      color: form.type === t ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <input
                placeholder="Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Start</label>
                  <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End</label>
                  <input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
                All day
              </label>

              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm({ ...form, color: c.value })}
                      title={c.label}
                      style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: c.value, border: form.color === c.value ? '2px solid white' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {editId ? (
                  <button onClick={deleteEvent} style={btnStyle('danger')}><Trash2 size={14} /> Delete</button>
                ) : <div />}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowModal(false)} style={btnStyle('secondary')}>Cancel</button>
                  <button onClick={saveEvent} style={btnStyle('primary')}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Imported Calendars Panel */}
      {showImportsPanel && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setShowImportsPanel(false)}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>Imported Calendars</h3>
              <button onClick={() => setShowImportsPanel(false)} style={iconBtnStyle}><X size={16} /></button>
            </div>

            {imports.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No imported calendars.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {imports.map((imp) => (
                  <div
                    key={imp.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', background: 'var(--surface-2)',
                      borderRadius: '8px', border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{imp.filename}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {imp.count} events · imported {formatDate(imp.importedAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteImport(imp)}
                      disabled={deletingImportId === imp.id}
                      style={{
                        ...btnStyle('danger'),
                        opacity: deletingImportId === imp.id ? 0.5 : 1,
                        fontSize: '0.8rem', padding: '5px 10px',
                      }}
                    >
                      <Trash2 size={13} />
                      {deletingImportId === imp.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
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
