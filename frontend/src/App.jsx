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
import Sidebar from "./components/Sidebar";
import {
  BadgeCheck,
  Archive,
  ChevronDown,
  Circle,
  CirclePlus,
  GripVertical,
  Command,
  Pencil,
  ListTodo,
  Plus,
  MoreHorizontal,
  PanelLeft,
  Search,
  Star,
  Moon,
  Sun,
  Settings2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const columns = [
  { id: "backlog", label: "Backlog", color: "tone-slate", icon: Archive },
  { id: "todo", label: "Todo", color: "tone-yellow", icon: ListTodo },
  {
    id: "in-progress",
    label: "In progress",
    color: "tone-coral",
    icon: Sun,
  },
  { id: "done", label: "Done", color: "tone-blue", icon: BadgeCheck },
];
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const pageLabels = {
  home: "Home",
  issues: "Issues",
  backlog: "Backlog",
  upcoming: "Upcoming",
  pulse: "Pulse",
  inbox: "Inbox",
  "my-issues": "My issues",
  reviews: "Reviews",
  agent: "Agent",
  workspace: "Demo Workspace",
  cycles: "Cycles",
  current: "Current",
  projects: "Projects",
  views: "Views",
  settings: "Settings",
};
const boardPages = new Set(["home", "issues", "backlog", "upcoming"]);
const getInitials = (name) => name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const uniqueUsers = (users) => {
  const seen = new Set();
  return users.filter((user) => {
    const key = user.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
async function request(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
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
function upsertTask(items, task) {
  return sortTasks([...items.filter((item) => item.id !== task.id), task]);
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
  const [currentUserName, setCurrentUserName] = useState(() =>
    localStorage.getItem("kanban-authenticated") === "false"
      ? null
      : localStorage.getItem("kanban-user-name") || "Maya Chen",
  );
  const [activeUsers, setActiveUsers] = useState(() => {
    const name = localStorage.getItem("kanban-authenticated") === "false"
      ? null
      : localStorage.getItem("kanban-user-name") || "Maya Chen";
    return name ? [{ name, initials: getInitials(name) }] : [];
  });
  const [theme, setTheme] = useState(
    () => localStorage.getItem("kanban-theme") || "dark",
  );
  const [activePage, setActivePage] = useState(() => {
    const page = window.location.hash.replace("#/", "");
    return pageLabels[page] ? page : "home";
  });
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
  const reconcileEvent = (event) => {
    const task = JSON.parse(event.data);
    if (pending.current.has(task.id)) {
      deferredEvents.current.set(task.id, { type: event.type, task });
      return;
    }
    setTasks((current) =>
      event.type === "task-deleted"
        ? current.filter((item) => item.id !== task.id)
        : sortTasks([...current.filter((item) => item.id !== task.id), task]),
    );
  };
  useEffect(() => {
    let cancelled = false;
    request("/api/board")
      .then((board) => {
        if (!cancelled) setTasks(board);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    setConnectionState("connecting");
    if (currentUserName) {
      setActiveUsers([{ name: currentUserName, initials: getInitials(currentUserName) }]);
    } else {
      setActiveUsers([]);
    }
    request("/api/presence")
      .then((users) => {
        setActiveUsers((current) => uniqueUsers([...users, ...current]));
      })
      .catch(() => undefined);
    const eventUrl = currentUserName
      ? `${API_BASE_URL}/api/events?user=${encodeURIComponent(currentUserName)}`
      : `${API_BASE_URL}/api/events`;
    const events = new EventSource(eventUrl);
    events.onopen = () => setConnectionState("live");
    events.onerror = () => setConnectionState("reconnecting");
    events.addEventListener("presence-updated", (event) => setActiveUsers(uniqueUsers(JSON.parse(event.data))));
    events.addEventListener("task-created", reconcileEvent);
    events.addEventListener("task-updated", reconcileEvent);
    events.addEventListener("task-deleted", reconcileEvent);
    return () => events.close();
  }, [currentUserName]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set("search", query);
    if (priority) next.set("priority", priority);
    if (assignee) next.set("assignee", assignee);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next.toString() ? `?${next}` : ""}${window.location.hash}`,
    );
  }, [query, priority, assignee]);
  useEffect(() => {
    const handleHashChange = () => {
      const page = window.location.hash.replace("#/", "");
      setActivePage(pageLabels[page] ? page : "home");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("kanban-theme", theme);
  }, [theme]);

  const assignees = [
    ...new Set(tasks.map((task) => task.assignee).filter(Boolean)),
  ].sort();
  const visible = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(query.toLowerCase()) &&
      (!priority || task.priority === priority) &&
      (!assignee || task.assignee === assignee),
  );
  const pageTasks = visible.filter((task) => {
    if (activePage === "backlog") return task.status === "backlog" || task.status === "todo";
    if (activePage === "upcoming") return task.status === "backlog" || task.status === "todo";
    return true;
  });
  const pageCountLabel = activePage === "home" ? "tasks" : "issues";
  const navigateTo = (page) => {
    window.location.hash = `/${page}`;
    setActivePage(page);
  };
  const login = () => {
    const name = window.prompt("Enter your display name", "Maya Chen")?.trim();
    if (!name) return;
    localStorage.setItem("kanban-user-name", name);
    localStorage.setItem("kanban-authenticated", "true");
    setCurrentUserName(name);
  };
  const logout = () => {
    localStorage.setItem("kanban-authenticated", "false");
    setCurrentUserName(null);
  };
  const openTask = (task) => setModal({ task });
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
          : upsertTask(current, result),
      );
      notify(existingId ? "Task updated" : "Task created");
      return true;
    } catch (e) {
      if (existingId) setTasks(snapshots.current.get(existingId));
      notify(`Could not save task: ${e.message}`);
      return false;
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
    const sourceStatus = active.status;
    const targetStatus = columns.some((column) => column.id === overId)
      ? overId
      : tasks.find((task) => task.id === overId)?.status || sourceStatus;
    const sourceItems = tasks
      .filter((task) => task.status === sourceStatus && task.id !== activeId)
      .sort((a, b) => a.position - b.position);
    const targetItems = sourceStatus === targetStatus
      ? sourceItems
      : tasks.filter((task) => task.status === targetStatus).sort((a, b) => a.position - b.position);
    const overIndex = columns.some((column) => column.id === overId)
      ? targetItems.length
      : Math.max(0, targetItems.findIndex((task) => task.id === overId));
    const reorderedTarget = [
      ...targetItems.slice(0, overIndex),
      { ...active, status: targetStatus },
      ...targetItems.slice(overIndex),
    ];
    const changed = tasks
      .filter((task) => task.status === sourceStatus || task.status === targetStatus)
      .map((task) => {
        const list = task.id === activeId
          ? reorderedTarget
          : task.status === sourceStatus && sourceStatus !== targetStatus
            ? sourceItems
            : reorderedTarget;
        const position = list.findIndex((item) => item.id === task.id);
        return position === -1
          ? task
          : { ...task, status: list[position].status, position };
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
    changed.forEach((task) => pending.current.add(task.id));
    try {
      await Promise.all(
        changed.map((task) =>
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
    <div className={`app-shell ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      <Sidebar activePage={activePage} onNavigate={navigateTo} activeUsers={activeUsers} currentUserName={currentUserName} onLogin={login} onLogout={logout} />
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation"><PanelLeft size={16} /></button><div className="workspace-switcher"><span className="workspace-avatar">D</span><span>Demo Workspace</span><ChevronDown size={13} /></div><span className="crumb-chevron">›</span><span className="topbar-muted">{activePage === "home" || activePage === "issues" ? "Cycles" : "Views"}</span><span className="crumb-chevron">›</span><strong>{pageLabels[activePage]}</strong><button className="crumb-icon" aria-label="Favorite page"><Star size={15} /></button><button className="crumb-icon" aria-label="More page actions"><MoreHorizontal size={16} /></button></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Open command menu"><Command size={16} /></button><button className="icon-button" aria-label="Open board settings"><Settings2 size={16} /></button>
            <button
              type="button"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              className="theme-toggle icon-button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => setModal({ task: null })}
              className="primary-button"
            >
              <Plus size={18} /> New task
            </button>
          </div>
        </header>
        <main className="app-container">
        {!boardPages.has(activePage) ? <EmptyPage title={pageLabels[activePage]} /> : <>
        <div className="reference-context"><div className="issue-total">{pageTasks.length} {pageCountLabel}</div><div className="reference-filter-row"><button className="reference-filter"><UserRound size={13} /><span>Assignee</span><span className="reference-filter-word">is</span><span className="reference-assignee">{assignee || "Everyone"}</span>{assignee && <X size={13} onClick={() => setAssignee("")} />}</button><button className="reference-filter-add" aria-label="Add filter"><Plus size={15} /></button></div></div>
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
            <span>{pageTasks.length} {pageCountLabel}</span>
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
                  tasks={pageTasks.filter((task) => task.status === column.id)}
                  onOpen={openTask}
                />
              ))}
            </section>
          </DndContext>
        )}
        </>}
        </main>
      </div>
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
      {modal && (
        <TaskModal
          key={modal.task?.id || "new-task"}
          task={modal.task}
          onClose={() => setModal(null)}
          onSave={async (draft) => {
            const saved = await saveTask(draft, modal.task?.id);
            if (saved) setModal(null);
          }}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}

function EmptyPage({ title }) {
  return (
    <section className="empty-page">
      <div className="empty-page-mark">O</div>
      <h1 className="empty-page-title">{title}</h1>
      <p className="empty-page-copy">This workspace view is ready for your next layer of work.</p>
    </section>
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
  const StatusIcon = columns.find((column) => column.id === task.status)?.icon || Circle;
  const taskNumber = task.id.startsWith("task-") ? task.id.replace("task-", "").padStart(3, "0") : task.id.slice(0, 6).toUpperCase();
  const updatedDate = task.updatedAt ? new Date(task.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently";
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
          onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task);
        }
      }}
      role="button"
      tabIndex={0}
      className={`task-card group ${isDragging ? "is-dragging" : ""}`}
    >
      <div className="task-card-top">
        <span className="task-id">DEMO-{taskNumber}</span>
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
      <h3 className="task-title"><StatusIcon size={14} className={`task-status-icon status-${task.status}`} />{task.title}</h3>
      <p className="task-description">
        {task.description || "No description yet."}
      </p>
      <div className="task-tags">
        <span className="task-chip"><span className={`chip-dot priority-dot-${task.priority}`} />{task.priority}</span>
        <span className="task-chip"><span className="chip-dot assignee-dot" />{task.assignee || "Unassigned"}</span>
      </div>
      <div className="task-footer">
        <span>Updated {updatedDate}</span>
        <button
          type="button"
          className="edit-button"
          aria-label={`Edit ${task.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(task);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Pencil size={13} />
        </button>
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
  useEffect(() => {
    setDraft({
      title: task?.title || "",
      description: task?.description || "",
      priority: task?.priority || "medium",
      assignee: task?.assignee || "",
      status: task?.status || "backlog",
    });
  }, [task]);
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
