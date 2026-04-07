'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp, query, orderBy, where,
} from 'firebase/firestore';
import { Plus, X, Trash2, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const TASK_STATUSES = ['todo', 'in progress', 'done'];
const statusColor = { todo: '#888', 'in progress': '#6366f1', done: '#22c55e' };

const emptyProject = { name: '', description: '', color: '#6366f1' };
const emptySprint = { name: '', goal: '', startDate: '', endDate: '' };
const emptyTask = { title: '', status: 'todo', priority: 'medium' };

const PROJECT_COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#0ea5e9', '#a855f7'];

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedSprint, setExpandedSprint] = useState(null);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const [projectForm, setProjectForm] = useState(emptyProject);
  const [sprintForm, setSprintForm] = useState(emptySprint);
  const [taskForm, setTaskForm] = useState(emptyTask);

  const [editProjectId, setEditProjectId] = useState(null);
  const [editSprintId, setEditSprintId] = useState(null);
  const [editTaskId, setEditTaskId] = useState(null);
  const [taskSprintId, setTaskSprintId] = useState(null);

  // Load projects
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // Load sprints for selected project
  useEffect(() => {
    if (!selectedProject) { setSprints([]); setProjectTasks([]); return; }
    const q = query(
      collection(db, 'projects', selectedProject.id, 'sprints'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setSprints(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selectedProject]);

  // Load tasks for selected project
  useEffect(() => {
    if (!selectedProject) { setProjectTasks([]); return; }
    const q = query(
      collection(db, 'projects', selectedProject.id, 'tasks'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setProjectTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selectedProject]);

  // Project CRUD
  async function saveProject() {
    if (!projectForm.name.trim() || !user) return;
    if (editProjectId) {
      await updateDoc(doc(db, 'projects', editProjectId), { name: projectForm.name, description: projectForm.description, color: projectForm.color });
    } else {
      await addDoc(collection(db, 'projects'), { ...projectForm, createdAt: Timestamp.now(), userId: user.uid });
    }
    setShowProjectModal(false);
    setEditProjectId(null);
    setProjectForm(emptyProject);
  }

  async function deleteProject() {
    if (!editProjectId) return;
    await deleteDoc(doc(db, 'projects', editProjectId));
    if (selectedProject?.id === editProjectId) setSelectedProject(null);
    setShowProjectModal(false);
    setEditProjectId(null);
  }

  // Sprint CRUD
  async function saveSprint() {
    if (!sprintForm.name.trim() || !selectedProject) return;
    const data = {
      name: sprintForm.name,
      goal: sprintForm.goal,
      startDate: sprintForm.startDate ? Timestamp.fromDate(new Date(sprintForm.startDate)) : null,
      endDate: sprintForm.endDate ? Timestamp.fromDate(new Date(sprintForm.endDate)) : null,
    };
    if (editSprintId) {
      await updateDoc(doc(db, 'projects', selectedProject.id, 'sprints', editSprintId), data);
    } else {
      await addDoc(collection(db, 'projects', selectedProject.id, 'sprints'), { ...data, createdAt: Timestamp.now() });
    }
    setShowSprintModal(false);
    setEditSprintId(null);
    setSprintForm(emptySprint);
  }

  async function deleteSprint() {
    if (!editSprintId || !selectedProject) return;
    await deleteDoc(doc(db, 'projects', selectedProject.id, 'sprints', editSprintId));
    setShowSprintModal(false);
    setEditSprintId(null);
  }

  // Task CRUD
  async function saveTask() {
    if (!taskForm.title.trim() || !selectedProject) return;
    const data = {
      title: taskForm.title,
      status: taskForm.status,
      priority: taskForm.priority,
      sprintId: taskSprintId || null,
    };
    if (editTaskId) {
      await updateDoc(doc(db, 'projects', selectedProject.id, 'tasks', editTaskId), data);
    } else {
      await addDoc(collection(db, 'projects', selectedProject.id, 'tasks'), { ...data, createdAt: Timestamp.now() });
    }
    setShowTaskModal(false);
    setEditTaskId(null);
    setTaskForm(emptyTask);
    setTaskSprintId(null);
  }

  async function deleteTask() {
    if (!editTaskId || !selectedProject) return;
    await deleteDoc(doc(db, 'projects', selectedProject.id, 'tasks', editTaskId));
    setShowTaskModal(false);
    setEditTaskId(null);
  }

  async function cycleTaskStatus(task) {
    const next = { todo: 'in progress', 'in progress': 'done', done: 'todo' };
    await updateDoc(doc(db, 'projects', selectedProject.id, 'tasks', task.id), {
      status: next[task.status] || 'todo',
    });
  }

  function getSprintProgress(sprintId) {
    const tasks = projectTasks.filter((t) => t.sprintId === sprintId);
    if (tasks.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = tasks.filter((t) => t.status === 'done').length;
    return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
  }

  function getProjectProgress() {
    if (projectTasks.length === 0) return 0;
    return Math.round((projectTasks.filter((t) => t.status === 'done').length / projectTasks.length) * 100);
  }

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const backlogTasks = projectTasks.filter((t) => !t.sprintId);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Projects list */}
      <div style={{
        width: '240px', minWidth: '240px',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Projects</h2>
            <button
              onClick={() => { setProjectForm(emptyProject); setEditProjectId(null); setShowProjectModal(true); }}
              style={iconBtnStyle}
              title="New project"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {projects.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: '0.8rem' }}>
              No projects yet
            </div>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProject(p)}
              style={{
                padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                background: selectedProject?.id === p.id ? 'var(--surface-2)' : 'transparent',
                borderLeft: `3px solid ${p.color || '#6366f1'}`,
                marginBottom: '4px', transition: 'background 0.1s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: '500', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectForm({ name: p.name, description: p.description || '', color: p.color || '#6366f1' });
                  setEditProjectId(p.id);
                  setShowProjectModal(true);
                }}
                style={{ ...iconBtnStyle, padding: '2px' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Project detail */}
      {selectedProject ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedProject.color || '#6366f1' }} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{selectedProject.name}</h2>
            </div>
            {selectedProject.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '12px' }}>
                {selectedProject.description}
              </p>
            )}
            {/* Overall progress */}
            <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Overall progress</span>
              <span>{getProjectProgress()}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${getProjectProgress()}%`, background: selectedProject.color || '#6366f1', borderRadius: '4px', transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Sprints */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} style={{ color: '#f59e0b' }} /> Sprints
              </h3>
              <button
                onClick={() => { setSprintForm(emptySprint); setEditSprintId(null); setShowSprintModal(true); }}
                style={btnStyle('secondary')}
              >
                <Plus size={14} /> Add Sprint
              </button>
            </div>

            {sprints.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No sprints yet.</p>
            )}

            {sprints.map((sprint) => {
              const prog = getSprintProgress(sprint.id);
              const isOpen = expandedSprint === sprint.id;
              const sprintTasks = projectTasks.filter((t) => t.sprintId === sprint.id);
              return (
                <div key={sprint.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
                  {/* Sprint header */}
                  <div
                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                    onClick={() => setExpandedSprint(isOpen ? null : sprint.id)}
                  >
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{sprint.name}</span>
                        {sprint.startDate && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {prog.done}/{prog.total} tasks · {prog.pct}%
                        </span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--surface-2)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${prog.pct}%`, background: '#22c55e', borderRadius: '2px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSprintForm({
                          name: sprint.name, goal: sprint.goal || '',
                          startDate: sprint.startDate?.toDate ? sprint.startDate.toDate().toISOString().slice(0, 10) : '',
                          endDate: sprint.endDate?.toDate ? sprint.endDate.toDate().toISOString().slice(0, 10) : '',
                        });
                        setEditSprintId(sprint.id);
                        setShowSprintModal(true);
                      }}
                      style={{ ...iconBtnStyle, padding: '4px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Sprint tasks */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px 12px' }}>
                      {sprint.goal && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', fontStyle: 'italic' }}>
                          Goal: {sprint.goal}
                        </p>
                      )}
                      {sprintTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onCycle={() => cycleTaskStatus(task)}
                          onEdit={() => {
                            setTaskForm({ title: task.title, status: task.status, priority: task.priority || 'medium' });
                            setEditTaskId(task.id);
                            setTaskSprintId(task.sprintId);
                            setShowTaskModal(true);
                          }}
                        />
                      ))}
                      <button
                        onClick={() => { setTaskForm(emptyTask); setEditTaskId(null); setTaskSprintId(sprint.id); setShowTaskModal(true); }}
                        style={{ ...btnStyle('secondary'), marginTop: '6px', fontSize: '0.8rem', padding: '5px 10px' }}
                      >
                        <Plus size={13} /> Add task
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Backlog */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>Backlog</h3>
              <button
                onClick={() => { setTaskForm(emptyTask); setEditTaskId(null); setTaskSprintId(null); setShowTaskModal(true); }}
                style={btnStyle('secondary')}
              >
                <Plus size={14} /> Add Task
              </button>
            </div>
            {backlogTasks.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No backlog tasks.</p>
            )}
            {backlogTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onCycle={() => cycleTaskStatus(task)}
                onEdit={() => {
                  setTaskForm({ title: task.title, status: task.status, priority: task.priority || 'medium' });
                  setEditTaskId(task.id);
                  setTaskSprintId(task.sprintId);
                  setShowTaskModal(true);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '16px' }}>
          <p>Select a project or create one</p>
          <button
            onClick={() => { setProjectForm(emptyProject); setEditProjectId(null); setShowProjectModal(true); }}
            style={btnStyle('primary')}
          >
            <Plus size={15} /> New Project
          </button>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <Modal onClose={() => setShowProjectModal(false)} title={editProjectId ? 'Edit Project' : 'New Project'}>
          <input placeholder="Project name *" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} style={inputStyle} autoFocus />
          <textarea placeholder="Description (optional)" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => setProjectForm({ ...projectForm, color: c })} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: projectForm.color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <ModalActions
            onCancel={() => setShowProjectModal(false)}
            onSave={saveProject}
            onDelete={editProjectId ? deleteProject : null}
          />
        </Modal>
      )}

      {/* Sprint Modal */}
      {showSprintModal && (
        <Modal onClose={() => setShowSprintModal(false)} title={editSprintId ? 'Edit Sprint' : 'New Sprint'}>
          <input placeholder="Sprint name *" value={sprintForm.name} onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })} style={inputStyle} autoFocus />
          <input placeholder="Sprint goal (optional)" value={sprintForm.goal} onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })} style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Start</label>
              <input type="date" value={sprintForm.startDate} onChange={(e) => setSprintForm({ ...sprintForm, startDate: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End</label>
              <input type="date" value={sprintForm.endDate} onChange={(e) => setSprintForm({ ...sprintForm, endDate: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <ModalActions onCancel={() => setShowSprintModal(false)} onSave={saveSprint} onDelete={editSprintId ? deleteSprint : null} />
        </Modal>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <Modal onClose={() => setShowTaskModal(false)} title={editTaskId ? 'Edit Task' : 'New Task'}>
          <input placeholder="Task title *" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} style={inputStyle} autoFocus />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['low', 'medium', 'high'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {/* Sprint assignment */}
          {sprints.length > 0 && (
            <div>
              <label style={labelStyle}>Assign to Sprint</label>
              <select value={taskSprintId || ''} onChange={(e) => setTaskSprintId(e.target.value || null)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Backlog</option>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <ModalActions onCancel={() => setShowTaskModal(false)} onSave={saveTask} onDelete={editTaskId ? deleteTask : null} />
        </Modal>
      )}
    </div>
  );
}

function TaskRow({ task, onCycle, onEdit }) {
  const priorityColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };
  const statusColor = { todo: '#888', 'in progress': '#6366f1', done: '#22c55e' };
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 4px', borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}
      onClick={onEdit}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onCycle(); }}
        style={{
          width: '18px', height: '18px', borderRadius: '50%',
          border: `2px solid ${statusColor[task.status] || '#888'}`,
          background: task.status === 'done' ? statusColor['done'] : 'transparent',
          flexShrink: 0, cursor: 'pointer',
        }}
      />
      <span style={{
        flex: 1, fontSize: '0.875rem',
        textDecoration: task.status === 'done' ? 'line-through' : 'none',
        color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)',
      }}>
        {task.title}
      </span>
      <span style={{
        fontSize: '0.7rem', padding: '2px 7px', borderRadius: '10px',
        background: `${priorityColor[task.priority]}22`,
        color: priorityColor[task.priority],
      }}>
        {task.priority}
      </span>
    </div>
  );
}

function Modal({ onClose, title, children }) {
  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>{title}</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSave, onDelete }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
      {onDelete ? (
        <button onClick={onDelete} style={btnStyle('danger')}><Trash2 size={14} /> Delete</button>
      ) : <div />}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onCancel} style={btnStyle('secondary')}>Cancel</button>
        <button onClick={onSave} style={btnStyle('primary')}>Save</button>
      </div>
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
