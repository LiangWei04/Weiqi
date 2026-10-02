import { demoMode } from '../../utils/demo';
import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  canManageAttendance: boolean;
  canManageMembers: boolean;
  canManageUsers: boolean;
}

const Sidebar = ({ canManageAttendance, canManageMembers, canManageUsers }: SidebarProps) => (
  <aside className="sidebar">
    <div className="brand-mark"><strong>TourneyHub</strong><small>Weiqi CCA</small></div>
    <nav className="side-nav" aria-label="Primary">
      <SideNavLink to="/dashboard">Dashboard</SideNavLink>
      <SideNavLink to="/events">Events</SideNavLink>
      <SideNavLink to="/competitions">Competitions</SideNavLink>
      {canManageAttendance && <SideNavLink to="/attendance">Attendance</SideNavLink>}
      {canManageMembers && <SideNavLink to="/members">Members</SideNavLink>}
      {canManageUsers && <SideNavLink to="/users">Users</SideNavLink>}
    </nav>
    {!demoMode && <NavLink
      to="/settings"
      className={({ isActive }) => [
        'mt-auto grid h-12 w-12 place-items-center rounded-2xl border border-app-border bg-app-surface text-2xl text-app-text no-underline transition hover:border-app-cyan hover:bg-app-cyan/10 hover:text-app-cyan hover:no-underline',
        isActive ? 'border-app-cyan bg-app-cyan/10 text-app-cyan' : '',
      ].join(' ')}
      aria-label="Settings"
      title="Settings"
    >
      <span aria-hidden="true">{'\u2699'}</span>
    </NavLink>}
  </aside>
);

const SideNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <NavLink
    to={to}
    className={({ isActive }) => isActive ? 'active' : undefined}
  >
    {children}
  </NavLink>
);

export default Sidebar;
