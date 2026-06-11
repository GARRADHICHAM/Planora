'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, Timestamp, query, orderBy, where,
} from 'firebase/firestore';
import { Plus, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/useIsMobile';

const PRIORITIES = ['low', 'medium', 'high'];
const priorityColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };

const emptyTaskForm = { title: '', description: '', priority: 'medium', dueDate: '', sectionId: '' };
const emptySectionForm = { name: '' };

export default function TasksPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [editTaskId, setEditTaskId] = useState(null);

  // Section modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionForm, setSectionForm] = useState(emptySectionForm);
  const [editSectionId, setEditSectionId] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'sections'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => setSections(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user]);

  // ── Sections ──────────────────────────────────────────────
  function openNewSection() {
    setSectionForm(emptySectionForm);
    setEditSectionId(null);
    setShowSectionModal(true);
  }

  function openEditSection(s) {
    setSectionForm({ name: s.name });
    setEditSectionId(s.id);
    setShowSectionModal(true);
  }

  async function saveSection() {
    if (!sectionForm.name.trim() || !user) return;
    if (editSectionId) {
      await updateDoc(doc(db, 'sections', editSectionId), { name: sectionForm.name });
    } else {
      await addDoc(collection(db, 'sections'), { name: sectionForm.name, userId: user.uid, createdAt: Timestamp.now() });
    }
    setShowSectionModal(false);
  }

  async function deleteSection() {
    if (!editSectionId) return;
    // Move tasks in this section to unsectioned
    const sectionTasks = tasks.filter((t) => t.sectionId === editSectionId);
    await Promise.all(sectionTasks.map((t) => updateDoc(doc(db, 'tasks', t.id), { sectionId: null })));
    await deleteDoc(doc(db, 'sections', editSectionId));
    setShowSectionModal(false);
  }

  // ── Tasks ─────────────────────────────────────────────────
  function openNewTask(sectionId = null) {
    setTaskForm({ ...emptyTaskForm, sectionId: sectionId || '' });
    setEditTaskId(null);
    setShowTaskModal(true);
  }

  function openEditTask(task) {
    const dueDate = task.dueDate?.toDate
      ? task.dueDate.toDate().toISOString().slice(0, 10)
      : task.dueDate || '';
    setTaskForm({ title: task.title, description: task.description || '', priority: task.priority || 'medium', dueDate, sectionId: task.sectionId || '' });
    setEditTaskId(task.id);
    setShowTaskModal(true);
  }

  async function saveTask() {
    if (!taskForm.title.trim() || !user) return;
    const data = {
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate ? Timestamp.fromDate(new Date(taskForm.dueDate)) : null,
      sectionId: taskForm.sectionId || null,
      userId: user.uid,
      done: editTaskId ? undefined : false,
    };
    if (editTaskId) {
      const { done, ...rest } = data;
      await updateDoc(doc(db, 'tasks', editTaskId), rest);
    } else {
      await addDoc(collection(db, 'tasks'), { ...data, createdAt: Timestamp.now() });
    }
    setShowTaskModal(false);
    setEditTaskId(null);
  }

  async function deleteTask() {
    if (!editTaskId) return;
    await deleteDoc(doc(db, 'tasks', editTaskId));
    setShowTaskModal(false);
    setEditTaskId(null);
  }

  async function toggleDone(task) {
    await updateDoc(doc(db, 'tasks', task.id), { done: !task.done });
  }

  function toggleCollapse(id) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const formatDate = (ts) => {
    if (!ts) return null;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = d < today;
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { label, isOverdue };
  };

  const unsectionedTasks = tasks.filter((t) => !t.sectionId);

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '760px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Tasks</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isMobile && (
            <button onClick={openNewSection} className="btn btn-secondary">
              <Plus size={14} /> New Section
            </button>
          )}
          <button onClick={() => openNewTask(null)} className="btn btn-primary">
            <Plus size={14} /> {isMobile ? 'Task' : 'New Task'}
          </button>
          {isMobile && (
            <button onClick={openNewSection} className="btn btn-secondary">
              <Plus size={14} /> Section
            </button>
          )}
        </div>
      </div>

      {/* Unsectioned tasks */}
      {unsectionedTasks.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {unsectionedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleDone} onEdit={openEditTask} formatDate={formatDate} />
            ))}
          </div>
          <AddTaskInline onAdd={() => openNewTask(null)} />
        </div>
      )}

      {unsectionedTasks.length === 0 && sections.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', fontSize: '0.9rem' }}>
          No tasks yet — create a section or add a task.
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        const sectionTasks = tasks.filter((t) => t.sectionId === section.id);
        const isCollapsed = collapsed[section.id];
        const doneCount = sectionTasks.filter((t) => t.done).length;

        return (
          <div key={section.id} style={{ marginBottom: '28px' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => toggleCollapse(section.id)} className="icon-btn">
                {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </button>
              <span
                style={{ fontWeight: '700', fontSize: '0.9rem', flex: 1, cursor: 'pointer' }}
                onClick={() => openEditSection(section)}
              >
                {section.name}
              </span>
              {sectionTasks.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {doneCount}/{sectionTasks.length}
                </span>
              )}
            </div>

            {/* Tasks in section */}
            {!isCollapsed && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {sectionTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={toggleDone} onEdit={openEditTask} formatDate={formatDate} />
                  ))}
                </div>
                <AddTaskInline onAdd={() => openNewTask(section.id)} />
              </>
            )}
          </div>
        );
      })}

      {/* Unsectioned add button (when there are sections) */}
      {sections.length > 0 && unsectionedTasks.length === 0 && (
        <button
          onClick={() => openNewTask(null)}
          className="ghost-btn"
          style={{ marginBottom: '8px' }}
        >
          <Plus size={14} /> Add task
        </button>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowTaskModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>{editTaskId ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={() => setShowTaskModal(false)} className="icon-btn"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                placeholder="Task title *"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="input"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={3}
                className="input" style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="input">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="input" />
                </div>
              </div>
              {sections.length > 0 && (
                <div>
                  <label className="label">Section</label>
                  <select value={taskForm.sectionId} onChange={(e) => setTaskForm({ ...taskForm, sectionId: e.target.value })} className="input">
                    <option value="">No section</option>
                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {editTaskId ? <button onClick={deleteTask} className="btn btn-danger"><Trash2 size={14} /> Delete</button> : <div />}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowTaskModal(false)} className="btn btn-secondary">Cancel</button>
                  <button onClick={saveTask} className="btn btn-primary">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSectionModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>{editSectionId ? 'Edit Section' : 'New Section'}</h3>
              <button onClick={() => setShowSectionModal(false)} className="icon-btn"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                placeholder="Section name *"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && saveSection()}
                className="input"
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {editSectionId ? <button onClick={deleteSection} className="btn btn-danger"><Trash2 size={14} /> Delete</button> : <div />}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowSectionModal(false)} className="btn btn-secondary">Cancel</button>
                  <button onClick={saveSection} className="btn btn-primary">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onToggle, onEdit, formatDate }) {
  const priorityColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };
  const due = formatDate(task.dueDate);

  return (
    <div
      onClick={() => onEdit(task)}
      className="card-row"
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 12px', borderRadius: '8px',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task); }}
        style={{
          width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
          border: `1.5px solid ${task.done ? '#22c55e' : 'var(--border)'}`,
          background: task.done ? '#22c55e' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {task.done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: '0.875rem', fontWeight: '400',
          color: task.done ? 'var(--text-muted)' : 'var(--text)',
          textDecoration: task.done ? 'line-through' : 'none',
        }}>
          {task.title}
        </span>
        {task.description && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.description}
          </div>
        )}
      </div>

      {/* Priority dot */}
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
        background: priorityColor[task.priority] || '#888',
      }} />

      {/* Due date — far right */}
      {due && (
        <span style={{
          fontSize: '0.75rem', fontWeight: '500', flexShrink: 0,
          color: due.isOverdue ? 'var(--danger)' : 'var(--text-muted)',
        }}>
          {due.label}
        </span>
      )}
    </div>
  );
}

function AddTaskInline({ onAdd }) {
  return (
    <button
      onClick={onAdd}
      className="ghost-btn"
      style={{ width: '100%', marginTop: '2px' }}
    >
      <Plus size={14} /> Add task
    </button>
  );
}

