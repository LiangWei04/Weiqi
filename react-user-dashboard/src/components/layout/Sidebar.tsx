import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  canManageAttendance: boolean;
  canManageMembers: boolean;
  canManageUsers: boolean;
}

const Sidebar = ({ canManageAttendance, canManageMembers, canManageUsers }: SidebarProps) => (
  <aside className="flex h-auto flex-col gap-6 border-r border-app-border bg-[#151515] p-5 lg:sticky lg:top-0 lg:h-screen lg:p-7">
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-app-cyan font-black text-app-ink">TH</span>
      <div>
        <strong className="block text-white">TourneysHub</strong>
        <small className="mt-0.5 block text-app-muted">Weiqi CCA</small>
      </div>
    </div>
    <nav className="grid gap-2" aria-label="Primary">
      <SideNavLink to="/dashboard">Dashboard</SideNavLink>
      <SideNavLink to="/events">Events</SideNavLink>
      <SideNavLink to="/competitions">Competitions</SideNavLink>
      {canManageAttendance && <SideNavLink to="/attendance">Attendance</SideNavLink>}
      {canManageMembers && <SideNavLink to="/members">Members</SideNavLink>}
      {canManageUsers && <SideNavLink to="/users">Users</SideNavLink>}
    </nav>
    <NavLink
      to="/settings"
      className={({ isActive }) => [
        'mt-auto grid h-12 w-12 place-items-center rounded-2xl border border-app-border bg-app-surface text-2xl text-white no-underline transition hover:border-app-cyan hover:bg-app-cyan/10 hover:text-app-cyan hover:no-underline',
        isActive ? 'border-app-cyan bg-app-cyan/10 text-app-cyan' : '',
      ].join(' ')}
      aria-label="Settings"
      title="Settings"
    >
      <span aria-hidden="true">{'\u2699'}</span>
    </NavLink>
  </aside>
);

const SideNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <NavLink
    to={to}
    className={({ isActive }) => [
      'rounded-md px-3.5 py-3 font-extrabold no-underline transition',
      isActive
        ? 'bg-app-cyan/10 text-app-cyan shadow-[inset_4px_0_0_#00e5ff]'
        : 'text-app-muted hover:bg-app-cyan/10 hover:text-app-cyan hover:no-underline hover:shadow-[inset_4px_0_0_#00e5ff]',
    ].join(' ')}
  >
    {children}
  </NavLink>
);

export default Sidebar;
