import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  CirclePlus,
  Clock3,
  GripVertical,
  Inbox,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

const columns = [
  { id: "backlog", label: "Backlog", color: "bg-slate-300", icon: Inbox },
  { id: "todo", label: "Todo", color: "bg-lemon", icon: Clock3 },
  {
    id: "in-progress",
    label: "In progress",
    color: "bg-coral",
    icon: LoaderCircle,
  },
  { id: "done", label: "Done", color: "bg-mint", icon: Check },
];
async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok)
    throw new Error((await response.json()).error || "Something went wrong");
  return response.status === 204 ? null : response.json();
}
function sortTasks(items) {
  return [...items].sort(
    (a, b) => a.status.localeCompare(b.status) || a.position - b.position,
  );
}

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(params.get("search") || "");
  const [priority, setPriority] = useState(params.get("priority") || "");
  const [assignee, setAssignee] = useState(params.get("assignee") || "");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [connectionState, setConnectionState] = useState("connecting");
  const pending = useRef(new Set());
  const snapshots = useRef(new Map());
  const deferredEvents = useRef(new Map());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  };
  const releasePending = (ids, localResults = new Map()) => {
    ids.forEach((id) => pending.current.delete(id));
    const queued = ids
      .map((id) => [id, deferredEvents.current.get(id)])
      .filter(([, event]) => event);
    queued.forEach(([id]) => deferredEvents.current.delete(id));
    if (!queued.length) return;
    setTasks((current) =>
      sortTasks(
        queued.reduce((next, [id, event]) => {
          const local = localResults.get(id);
          const remoteIsNewer =
            event.type === "task-deleted" ||
            !local ||
            new Date(event.task.updatedAt) > new Date(local.updatedAt);
          if (!remoteIsNewer) return next;
          return event.type === "task-deleted"
            ? next.filter((item) => item.id !== id)
            : [...next.filter((item) => item.id !== id), event.task];
        }, current),
      ),
    );
  };
  useEffect(() => {
    let events;
    let cancelled = false;
    const reconcileEvent = (event) => {
      const task = JSON.parse(event.data);
      if (pending.current.has(task.id)) {
        deferredEvents.current.set(task.id, { type: event.type, task });
        return;
      }
      setTasks((current) =>
        event.type === "task-deleted"
          ? current.filter((item) => item.id !== task.id)
          : sortTasks([
              ...current.filter((item) => item.id !== task.id),
              task,
            ]),
      );
    };
    request("/api/board")
      .then((board) => {
        if (cancelled) return;
        setTasks(board);
        events = new EventSource("/api/events");
        events.onopen = () => setConnectionState("live");
        events.onerror = () => setConnectionState("reconnecting");
        events.addEventListener("task-created", reconcileEvent);
        events.addEventListener("task-updated", reconcileEvent);
        events.addEventListener("task-deleted", reconcileEvent);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
      events?.close();
    };
  }, []);
  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set("search", query);
    if (priority) next.set("priority", priority);
    if (assignee) next.set("assignee", assignee);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next.toString() ? `?${next}` : ""}`,
    );
  }, [query, priority, assignee]);

  const assignees = [
    ...new Set(tasks.map((task) => task.assignee).filter(Boolean)),
  ].sort();
  const visible = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(query.toLowerCase()) &&
      (!priority || task.priority === priority) &&
      (!assignee || task.assignee === assignee),
  );
  const saveTask = async (draft, existingId) => {
    const snapshot = tasks;
    const optimistic = {
      ...(existingId ? tasks.find((task) => task.id === existingId) : {}),
      ...draft,
      id: existingId || `temp-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      position: existingId
        ? tasks.find((task) => task.id === existingId).position
        : tasks.filter((task) => task.status === draft.status).length,
    };
    if (existingId) {
      pending.current.add(existingId);
      snapshots.current.set(existingId, snapshot);
      setTasks((current) =>
        current.map((task) => (task.id === existingId ? optimistic : task)),
      );
    }
    let committedTask = optimistic;
    try {
      const result = await request(
        existingId ? `/api/tasks/${existingId}` : "/api/tasks",
        { method: existingId ? "PATCH" : "POST", body: JSON.stringify(draft) },
      );
      committedTask = result;
      setTasks((current) =>
        existingId
          ? current.map((task) => (task.id === existingId ? result : task))
          : sortTasks([...current, result]),
      );
      notify(existingId ? "Task updated" : "Task created");
    } catch (e) {
      if (existingId) setTasks(snapshots.current.get(existingId));
      notify(`Could not save task: ${e.message}`);
    } finally {
      if (existingId) {
        releasePending([existingId], new Map([[existingId, committedTask]]));
        snapshots.current.delete(existingId);
      }
    }
  };
  const deleteTask = async (task) => {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    const snapshot = tasks;
    pending.current.add(task.id);
    setTasks((current) => current.filter((item) => item.id !== task.id));
    try {
      await request(`/api/tasks/${task.id}`, { method: "DELETE" });
      notify("Task deleted");
      setModal(null);
    } catch (e) {
      setTasks(snapshot);
      notify(`Could not delete task: ${e.message}`);
    } finally {
      releasePending([task.id]);
    }
  };
  const moveTask = async (activeId, overId) => {
    const active = tasks.find((task) => task.id === activeId);
    if (!active) return;
    const target = columns.some((column) => column.id === overId)
      ? overId
      : tasks.find((task) => task.id === overId)?.status || active.status;
    const siblings = tasks
      .filter((task) => task.status === target && task.id !== activeId)
      .sort((a, b) => a.position - b.position);
    const index = columns.some((column) => column.id === overId)
      ? siblings.length
      : Math.max(
          0,
          siblings.findIndex((task) => task.id === overId),
        );
    const next = [
      ...siblings.slice(0, index),
      { ...active, status: target },
      ...siblings.slice(index),
    ];
    const changed = tasks
      .filter((task) => task.status === active.status || task.status === target)
      .map((task) => {
        const updated = next.find((item) => item.id === task.id);
        return updated
          ? { ...task, status: updated.status, position: next.indexOf(updated) }
          : task;
      });
    const snapshot = tasks;
    setTasks((current) =>
      sortTasks([
        ...current.filter(
          (task) => task.status !== active.status && task.status !== target,
        ),
        ...changed,
      ]),
    );
    changed
      .filter((task) => task.status === target || task.id === activeId)
      .forEach((task) => pending.current.add(task.id));
    try {
      await Promise.all(
        changed
          .filter((task) => task.status === target || task.id === activeId)
          .map((task) =>
            request(`/api/tasks/${task.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                status: task.status,
                position: task.position,
              }),
            }),
          ),
      );
    } catch (e) {
      setTasks(snapshot);
      notify(`Move rolled back: ${e.message}`);
    } finally {
      releasePending(
        changed.map((task) => task.id),
        new Map(changed.map((task) => [task.id, task])),
      );
    }
  };
  const onDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) moveTask(active.id, over.id);
  };

  return (
    <div className="app-shell">
      <div className="app-container">
        <header className="app-header">
          <div>
            <div className="workspace-label">
              <span className="workspace-dot" /> Orbit workspace
            </div>
            <h1 className="app-title">
              Project pulse<span className="app-title-mark">.</span>
            </h1>
            <p className="app-subtitle">
              A clear place for the work in motion, the work waiting, and the
              work worth celebrating.
            </p>
          </div>
          <button
            onClick={() => setModal({ task: null })}
            className="primary-button"
          >
            <Plus size={18} /> New task
          </button>
        </header>
        <section className="board-toolbar">
          <div className="toolbar-controls">
            <label className="search-field">
              <span className="sr-only">Search tasks</span>
              <Search
                className="search-icon"
                size={16}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
                placeholder="Search tasks..."
                type="search"
              />
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="filter-input"
            >
              <option value="">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="filter-input"
            >
              <option value="">Everyone</option>
              {assignees.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="board-status">
            <span>{visible.length} tasks</span>
            <span className="status-divider" />
            <span className="live-status">
              <span className={`live-dot ${connectionState !== "live" ? "is-reconnecting" : ""}`} />{" "}
              {connectionState === "live" ? "Live" : connectionState === "connecting" ? "Connecting" : "Reconnecting"}
            </span>
          </div>
        </section>
        {loading ? (
          <div className="loading-state">
            Loading your board...
          </div>
        ) : error ? (
          <div className="error-state">
            {error}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <section className="board-grid">
              {columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  tasks={visible.filter((task) => task.status === column.id)}
                  onOpen={(task) => setModal({ task })}
                />
              ))}
            </section>
          </DndContext>
        )}
      </div>
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
      {modal && (
        <TaskModal
          task={modal.task}
          onClose={() => setModal(null)}
          onSave={(draft) => {
            saveTask(draft, modal.task?.id);
            setModal(null);
          }}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}

function Column({ column, tasks, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const Icon = column.icon;
  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? "is-over" : "is-idle"}`}
    >
      <div className="column-header">
        <div className="column-heading">
          <span className={`column-icon ${column.color}`}>
            <Icon size={16} />
          </span>
          <h2 className="column-title">{column.label}</h2>
          <span className="column-count">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onOpen({ status: column.id })}
          className="column-add"
          aria-label={`Add task to ${column.label}`}
        >
          <CirclePlus size={18} />
        </button>
      </div>
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="task-list">
          {tasks.length ? (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} onOpen={onOpen} />
            ))
          ) : (
            <div className="empty-column">
              Drop work here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
function TaskCard({ task, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      onClick={() => onOpen({ task })}
      className={`task-card group ${isDragging ? "is-dragging" : ""}`}
    >
      <div className="task-card-top">
        <span
          className={`priority-badge priority-${task.priority}`}
        >
          {task.priority}
        </span>
        <button
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="drag-handle"
          aria-label="Drag task"
        >
          <GripVertical size={17} />
        </button>
      </div>
      <h3 className="task-title">
        {task.title}
      </h3>
      <p className="task-description">
        {task.description || "No description yet."}
      </p>
      <div className="task-footer">
        <span>{task.assignee || "Unassigned"}</span>
        <Pencil
          size={13}
          className="edit-icon"
        />
      </div>
    </article>
  );
}

function TaskModal({ task, onClose, onSave, onDelete }) {
  const editing = Boolean(task?.id);
  const [draft, setDraft] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "medium",
    assignee: task?.assignee || "",
    status: task?.status || "backlog",
  });
  const [saving, setSaving] = useState(false);
  const update = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    await onSave({ ...draft, title: draft.title.trim() });
    setSaving(false);
  };
  return (
    <div className="modal-backdrop">
      <form
        onSubmit={submit}
        className="task-modal"
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">
              {editing ? "Task details" : "New task"}
            </p>
            <h2 className="modal-title">
              {editing ? "Shape the next move" : "Add work to the board"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="task-form">
          <label className="form-label">
            Title
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className="form-control"
              required
              maxLength={120}
            />
          </label>
          <label className="form-label">
            Description
            <textarea
              value={draft.description}
              onChange={(e) => update("description", e.target.value)}
              className="form-control min-h-24"
            />
          </label>
          <div className="form-grid">
            <label className="form-label">
              Priority
              <select
                value={draft.priority}
                onChange={(e) => update("priority", e.target.value)}
                className="form-control"
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
              </select>
            </label>
            <label className="form-label">
              Assignee
              <input
                value={draft.assignee}
                onChange={(e) => update("assignee", e.target.value)}
                className="form-control"
                placeholder="Name"
              />
            </label>
            <label className="form-label">
              Status
              <select
                value={draft.status}
                onChange={(e) => update("status", e.target.value)}
                className="form-control"
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="modal-footer">
          {editing ? (
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="delete-button"
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : (
            <span />
          )}
          {editing && (
            <span className="modal-note">
              Changes save to the live board
            </span>
          )}
          <button
            disabled={saving}
            className="save-button"
          >
            {saving ? "Saving..." : editing ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
