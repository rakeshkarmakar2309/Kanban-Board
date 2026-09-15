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

export default function Sidebar() {
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
        <a className="nav-item" href="#"><Activity size={14} /> Pulse</a>
        <a className="nav-item" href="#"><Inbox size={14} /> Inbox <span className="nav-count">9+</span></a>
        <a className="nav-item" href="#"><ListChecks size={14} /> My issues</a>
        <a className="nav-item" href="#"><GitPullRequest size={14} /> Reviews</a>
        <a className="nav-item" href="#"><Bot size={14} /> Agent</a>
        <p className="nav-label nav-label-spaced">Your teams</p>
        <a className="nav-item team-item" href="#"><span className="team-dot green" /> Demo Workspace <MoreHorizontal size={14} className="nav-more" /></a>
        <a className="nav-item sub-item active" href="#"><PanelsTopLeft size={13} /> Home</a>
        <a className="nav-item sub-item active" href="#"><CircleDot size={13} /> Issues</a>
        <a className="nav-item sub-item" href="#"><Milestone size={13} /> Cycles</a>
        <a className="nav-item sub-item" href="#"><CircleDot size={13} /> Current</a>
        <a className="nav-item sub-item" href="#"><Milestone size={13} /> Upcoming</a>
        <a className="nav-item sub-item" href="#"><FolderKanban size={13} /> Projects</a>
        <a className="nav-item sub-item" href="#"><PanelsTopLeft size={13} /> Views</a>
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item"><Settings2 size={14} /> Settings</button>
        <span className="user-avatar">MC</span>
      </div>
    </aside>
  );
}
