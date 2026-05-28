import React from 'react';
import apiClient from '../../utils/apiClient';
import type { ManagedUser } from '../../types/dashboard';
import ConfirmDeleteDialog from '../shared/ConfirmDeleteDialog';
import PaginationControls from '../shared/PaginationControls';
import { paginate } from '../../utils/pagination';

const UsersPanel = ({
  users,
  currentUserId,
  onUsersChanged,
}: {
  users: ManagedUser[];
  currentUserId?: number;
  onUsersChanged: (message: string) => void;
}) => {
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('All');
  const [userPage, setUserPage] = React.useState(1);
  const [deleteTarget, setDeleteTarget] = React.useState<ManagedUser | null>(null);
  const roles = ['Captain', 'Vice-Captain', 'Secretary', 'Member'];
  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = query === ''
      || user.name.toLowerCase().includes(query)
      || (user.username || '').toLowerCase().includes(query)
      || user.email.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  const userSlice = paginate(filteredUsers, userPage, 8);

  React.useEffect(() => {
    setUserPage(1);
  }, [roleFilter, search]);

  const changeRole = async (user: ManagedUser, nextRole: string) => {
    if (user.id === currentUserId) {
      onUsersChanged('You cannot change your own role.');
      return;
    }

    await apiClient.put(`/users/${user.id}/role`, { role: nextRole });
    onUsersChanged(`${user.name} is now ${nextRole}.`);
  };

  const deleteUser = async (user: ManagedUser) => {
    if (user.id === currentUserId) {
      onUsersChanged('Use Settings to deactivate your own account.');
      return;
    }

    await apiClient.delete(`/users/${user.id}`);
    onUsersChanged(`${user.email} was deleted.`);
  };

  return (
    <section className="panel user-management-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Role-based access</p>
          <h2>User Management</h2>
        </div>
      </div>

      <div className="user-toolbar">
        <label className="form-field">
          <span>Search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, username or email" />
        </label>
        <label className="form-field">
          <span>Role</span>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="All">All roles</option>
            {roles.map((roleOption) => (
              <option key={roleOption} value={roleOption}>{roleOption}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="permission-grid">
        <PermissionCard role="Captain" permissions="Users, roles, events, competitions, approvals, attendance" />
        <PermissionCard role="Vice-Captain" permissions="Attendance marking only" />
        <PermissionCard role="Secretary" permissions="Events, competitions, registration approvals, member records" />
        <PermissionCard role="Member" permissions="View events, view competitions, register" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userSlice.items.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.username || '-'}</td>
                <td>{user.email}</td>
                <td>
                  {user.id === currentUserId ? (
                    <span className="status-pill">{user.role}</span>
                  ) : (
                    <select className="mini-select" value={user.role} onChange={(event) => changeRole(user, event.target.value)}>
                      {roles.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>{roleOption}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  <span className={user.active ? 'status-pill' : 'status-pill warning'}>
                    {user.active ? user.status : 'Inactive'}
                  </span>
                </td>
                <td>{user.emailVerified ? 'Yes' : 'No'}</td>
                <td>
                  {user.id === currentUserId ? (
                    <span className="muted-line">Current account</span>
                  ) : (
                    <button type="button" className="danger-action compact" onClick={() => setDeleteTarget(user)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7}>No users match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls page={userPage} totalPages={userSlice.totalPages} onPageChange={setUserPage} />
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.email || 'user'}?`}
        detail="This permanently deletes the user account. This cannot be undone."
        reason="Captain requested user deletion"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteUser(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
    </section>
  );
};

const PermissionCard = ({ role, permissions }: { role: string; permissions: string }) => (
  <article className="permission-card">
    <strong>{role}</strong>
    <span>{permissions}</span>
  </article>
);

export default UsersPanel;
