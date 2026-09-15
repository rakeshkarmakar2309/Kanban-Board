import {
  Activity,
  Bot,
  CircleDot,
  FolderKanban,
  Inbox,
  ListChecks,
  Milestone,
  MoreHorizontal,
  PanelsTopLeft,
  GitPullRequest,
  Search,
  Settings2,
} from "lucide-react";

const pageLinks = [
  { id: "home", label: "Home", icon: PanelsTopLeft },
  { id: "issues", label: "Issues", icon: CircleDot },
  { id: "backlog", label: "Backlog", icon: Inbox },
  { id: "upcoming", label: "Upcoming", icon: Milestone },
];
const secondaryLinks = [
  { id: "pulse", label: "Pulse", icon: Activity },
  { id: "inbox", label: "Inbox", icon: Inbox, count: "9+" },
  { id: "my-issues", label: "My issues", icon: ListChecks },
  { id: "reviews", label: "Reviews", icon: GitPullRequest },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "cycles", label: "Cycles", icon: Milestone },
  { id: "current", label: "Current", icon: CircleDot },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "views", label: "Views", icon: PanelsTopLeft },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">O</span>
        <span>Orbit</span>
        <span className="brand-chevron">⌄</span>
      </div>
      <div className="sidebar-search">
        <Search size={14} />
        <span>Quick find</span>
        <kbd>⌘ K</kbd>
      </div>
      <nav className="sidebar-nav" aria-label="Workspace navigation">
        <p className="nav-label">Workspace</p>
        {secondaryLinks.slice(0, 5).map(({ id, label, icon: Icon, count }) => (
          <button key={id} type="button" className={`nav-item ${activePage === id ? "active" : ""}`} onClick={() => onNavigate(id)}>
            <Icon size={14} /> {label} {count && <span className="nav-count">{count}</span>}
          </button>
        ))}
        <p className="nav-label nav-label-spaced">Your teams</p>
        <button type="button" className="nav-item team-item" onClick={() => onNavigate("workspace")}><span className="team-dot green" /> Demo Workspace <MoreHorizontal size={14} className="nav-more" /></button>
        {pageLinks.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item sub-item ${activePage === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
        {secondaryLinks.slice(5).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`nav-item sub-item ${activePage === id ? "active" : ""}`} onClick={() => onNavigate(id)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button type="button" className={`nav-item ${activePage === "settings" ? "active" : ""}`} onClick={() => onNavigate("settings")}><Settings2 size={14} /> Settings</button>
        <span className="user-avatar">MC</span>
      </div>
    </aside>
  );
}
