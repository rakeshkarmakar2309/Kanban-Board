import {
  CircleDot,
  Inbox,
  LogIn,
  LogOut,
  Milestone,
  PanelsTopLeft,
  Search,
  Settings2,
} from "lucide-react";

const pageLinks = [
  { id: "home", label: "Home", icon: PanelsTopLeft },
  { id: "issues", label: "Issues", icon: CircleDot },
  { id: "backlog", label: "Backlog", icon: Inbox },
  { id: "upcoming", label: "Upcoming", icon: Milestone },
  { id: "cycles", label: "Cycles", icon: Milestone },
  { id: "current", label: "Current", icon: CircleDot },
];

export default function Sidebar({ activePage, onNavigate, activeUsers = [], currentUserName, onLogin, onLogout }) {
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
        {pageLinks.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item sub-item workspace-page ${activePage === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
        <p className="nav-label nav-label-spaced">Active users</p>
        <div className="active-users" aria-label="Active collaborators">
          {activeUsers.length ? activeUsers.map((user) => (
            <div className="active-user" key={user.name} title={`${user.name} is active`}>
              <span className="active-user-avatar"><span className="active-user-dot" />{user.initials}</span>
              <span className="active-user-name">{user.name}</span>
            </div>
          )) : <span className="active-users-empty">Waiting for collaborators</span>}
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="footer-actions">
          <button type="button" className={`nav-item ${activePage === "settings" ? "active" : ""}`} onClick={() => onNavigate("settings")}><Settings2 size={14} /> Settings</button>
          {currentUserName ? <button type="button" className="nav-item" onClick={onLogout}><LogOut size={14} /> Log out</button> : <button type="button" className="nav-item" onClick={onLogin}><LogIn size={14} /> Log in</button>}
        </div>
        <span className="user-avatar">{currentUserName ? currentUserName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "--"}</span>
      </div>
    </aside>
  );
}
