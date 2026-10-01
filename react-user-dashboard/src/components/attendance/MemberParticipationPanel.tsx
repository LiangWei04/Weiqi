import { demoMode } from '../../utils/demo';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import type { EventRegistration, Registration } from '../../types/dashboard';
import ConfirmDeleteDialog from '../shared/ConfirmDeleteDialog';
import PaginationControls from '../shared/PaginationControls';
import { paginate } from '../../utils/pagination';
import { formatRank, getAttendanceMarkingState, getErrorMessage } from './attendanceUtils';

const MetricCard = ({ label, value, hint }: { label: string; value: number | string; hint: string }) => (
  <article className="metric-card">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{hint}</small>
  </article>
);

const MemberParticipationPanel = ({
  registrations,
  eventRegistrations,
  canApprove,
  canDelete,
  currentRole,
  onChanged,
}: {
  registrations: Registration[];
  eventRegistrations: EventRegistration[];
  canApprove: boolean;
  canDelete: boolean;
  currentRole: string;
  onChanged: (message: string) => void;
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('All');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [activityFilter, setActivityFilter] = React.useState('All');
  const [memberPage, setMemberPage] = React.useState(1);
  const [expandedMembers, setExpandedMembers] = React.useState<Set<string>>(new Set());
  const [removeTarget, setRemoveTarget] = React.useState<{ id: number; type: 'Competition' | 'Event'; title: string } | null>(null);
  const memberRows = React.useMemo(() => {
    const members = new Map<string, {
      key: string;
      name: string;
      email: string;
      total: number;
      pending: number;
      registered: number;
      attended: number;
      items: Array<{
        id: number;
        type: 'Competition' | 'Event';
        title: string;
        detail: string;
        activityDate: string;
        status: string;
        attended: boolean;
        profile: {
          username?: string | null;
          role?: string | null;
          school?: string | null;
          rankType?: string | null;
          rankValue?: number | null;
        };
      }>;
    }>();

    const ensureMember = (key: string, name: string, email: string) => {
      const existing = members.get(key);
      if (existing) {
        return existing;
      }

      const nextMember = {
        key,
        name,
        email,
        total: 0,
        pending: 0,
        registered: 0,
        attended: 0,
        items: [],
      };
      members.set(key, nextMember);
      return nextMember;
    };

    registrations.forEach((registration) => {
      const member = ensureMember(registration.participant_email.toLowerCase(), registration.participant_name, registration.participant_email);
      member.total += 1;
      member.pending += registration.status === 'Pending Approval' ? 1 : 0;
      member.registered += registration.status === 'Registered' ? 1 : 0;
      member.attended += registration.attended ? 1 : 0;
      member.items.push({
        id: registration.id,
        type: 'Competition',
        title: registration.competition_title,
        detail: registration.category_name,
        activityDate: registration.competition_start_date,
        status: registration.status,
        attended: registration.attended,
        profile: {
          username: registration.participant_username,
          role: registration.participant_role,
          school: registration.school,
          rankType: registration.rank_type,
          rankValue: registration.rank_value,
        },
      });
    });

    eventRegistrations.forEach((registration) => {
      const member = ensureMember(registration.member_email.toLowerCase(), registration.member_name, registration.member_email);
      member.total += 1;
      member.pending += registration.status === 'Pending Approval' ? 1 : 0;
      member.registered += registration.status === 'Registered' ? 1 : 0;
      member.attended += registration.attended ? 1 : 0;
      member.items.push({
        id: registration.id,
        type: 'Event',
        title: registration.event_title,
        detail: registration.requires_approval ? 'Approval required' : 'Auto approval',
        activityDate: registration.event_date,
        status: registration.status,
        attended: registration.attended,
        profile: {
          username: registration.member_username,
          role: registration.member_role,
          school: registration.school,
          rankType: registration.rank_type,
          rankValue: registration.rank_value,
        },
      });
    });

    return Array.from(members.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [registrations, eventRegistrations]);

  const activityOptions = React.useMemo(() => {
    const activities = memberRows.flatMap((member) => member.items
      .filter((item) => typeFilter === 'All' || item.type === typeFilter)
      .map((item) => `${item.type}: ${item.title}`));
    return Array.from(new Set(activities)).sort();
  }, [memberRows, typeFilter]);

  const getVisibleItems = React.useCallback((member: typeof memberRows[number]) => member.items.filter((item) => {
    const matchesType = typeFilter === 'All' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesActivity = activityFilter === 'All' || activityFilter === `${item.type}: ${item.title}`;
    return matchesType && matchesStatus && matchesActivity;
  }), [activityFilter, statusFilter, typeFilter]);

  const visibleMembers = memberRows.filter((member) => {
    const query = search.trim().toLowerCase();
    const visibleItems = getVisibleItems(member);
    const matchesSearch = query === ''
      || member.name.toLowerCase().includes(query)
      || member.email.toLowerCase().includes(query)
      || member.items.some((item) => item.title.toLowerCase().includes(query) || item.detail.toLowerCase().includes(query));
    return matchesSearch && visibleItems.length > 0;
  });
  const memberSlice = paginate(visibleMembers, memberPage, 8);

  const totalSignups = memberRows.reduce((sum, member) => sum + member.total, 0);
  const pendingTotal = memberRows.reduce((sum, member) => sum + member.pending, 0);
  const registeredTotal = memberRows.reduce((sum, member) => sum + member.registered, 0);
  const attendedTotal = memberRows.reduce((sum, member) => sum + member.attended, 0);
  const attendanceRate = registeredTotal === 0 ? 0 : Math.round((attendedTotal / registeredTotal) * 100);

  const updateCompetitionStatus = async (registrationId: number, status: string) => {
    try {
      await apiClient.put(`/competitions/registrations/${registrationId}/status`, { status });
      onChanged(`Competition registration marked as ${status}.`);
    } catch (error) {
      onChanged(getErrorMessage(error, 'Could not update competition registration.'));
    }
  };

  const updateEventStatus = async (registrationId: number, status: 'approve' | 'reject') => {
    try {
      await apiClient.put(`/registrations/${registrationId}/${status}`);
      onChanged(`Event registration ${status === 'approve' ? 'approved' : 'rejected'}.`);
    } catch (error) {
      onChanged(getErrorMessage(error, 'Could not update event registration.'));
    }
  };

  const updateCompetitionAttendance = async (registrationId: number, attended: boolean) => {
    try {
      await apiClient.put(`/competitions/registrations/${registrationId}/attendance`, { attended });
      onChanged('Competition attendance updated.');
    } catch (error) {
      onChanged(getErrorMessage(error, 'Could not update competition attendance.'));
    }
  };

  const updateEventAttendance = async (registrationId: number, attended: boolean) => {
    try {
      await apiClient.put(`/registrations/${registrationId}/attendance`, { attended });
      onChanged('Event attendance updated.');
    } catch (error) {
      onChanged(getErrorMessage(error, 'Could not update event attendance.'));
    }
  };

  const removeRegistration = async (item: { id: number; type: 'Competition' | 'Event'; title: string }) => {
    try {
      if (item.type === 'Competition') {
        await apiClient.delete(`/competitions/registrations/${item.id}`);
      } else {
        await apiClient.delete(`/registrations/${item.id}`);
      }
      onChanged(`${item.type} registration removed.`);
    } catch (error) {
      onChanged(getErrorMessage(error, `Could not remove ${item.type.toLowerCase()} registration.`));
    }
  };

  const toggleMember = (key: string) => {
    setExpandedMembers((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  React.useEffect(() => {
    setMemberPage(1);
  }, [activityFilter, search, statusFilter, typeFilter]);

  React.useEffect(() => {
    if (activityFilter !== 'All' && !activityOptions.includes(activityFilter)) {
      setActivityFilter('All');
    }
  }, [activityFilter, activityOptions]);

  return (
    <section className="panel large-panel member-management-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Member activity</p>
          <h2>Event & Competition Members</h2>
        </div>
        <button type="button" className="secondary-action compact" onClick={() => navigate('/attendance')}>
          Back to Attendance
        </button>
      </div>

      <div className="member-summary-grid">
        <MetricCard label="Members" value={memberRows.length} hint="with signups" />
        <MetricCard label="Signups" value={totalSignups} hint="events and competitions" />
        <MetricCard label="Pending" value={pendingTotal} hint="waiting for approval" />
        <MetricCard label="Attendance" value={`${attendanceRate}%`} hint={`${attendedTotal} marked present`} />
      </div>

      <div className="member-toolbar">
        <label className="form-field">
          <span>Search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Member, email, event, competition, category" />
        </label>
        <label className="form-field">
          <span>Type</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="All">All types</option>
            <option value="Event">Events</option>
            <option value="Competition">Competitions</option>
          </select>
        </label>
        <label className="form-field">
          <span>Activity</span>
          <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
            <option value="All">{typeFilter === 'All' ? 'All events and competitions' : `All ${typeFilter.toLowerCase()}s`}</option>
            {activityOptions.map((activity) => (
              <option key={activity} value={activity}>{activity}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Registered">Registered</option>
            <option value="Rejected">Rejected</option>
          </select>
        </label>
      </div>

      <div className="member-list">
        {memberSlice.items.map((member) => {
          const isExpanded = expandedMembers.has(member.key);
          const visibleItems = getVisibleItems(member);
          return (
          <article className="member-card" key={member.key}>
            <button type="button" className="member-card-head member-card-toggle" onClick={() => toggleMember(member.key)} aria-expanded={isExpanded}>
              <span>
                <strong>{member.name}</strong>
                <small>{member.email} - {visibleItems.length} matching signup(s)</small>
              </span>
              <dl>
                <div><dt>Total</dt><dd>{member.total}</dd></div>
                <div><dt>Approved</dt><dd>{member.registered}</dd></div>
                <div><dt>Pending</dt><dd>{member.pending}</dd></div>
                <div><dt>Present</dt><dd>{member.attended}</dd></div>
              </dl>
            </button>
            {isExpanded && (
              <div className="member-registration-list">
                {visibleItems.map((item) => (
                  <div className="member-registration-row" key={`${member.key}-${item.type}-${item.id}`}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.type} - {item.detail}</small>
                    </span>
                    <span className={item.status === 'Pending Approval' ? 'status-pill warning' : 'status-pill'}>
                      {item.status}
                    </span>
                    {item.status === 'Pending Approval' && canApprove && (
                      <span className="row-actions">
                        {item.type === 'Competition' ? (
                          <>
                            <button type="button" className="secondary-action compact" onClick={() => updateCompetitionStatus(item.id, 'Registered')}>Approve</button>
                            <button type="button" className="secondary-action compact" onClick={() => updateCompetitionStatus(item.id, 'Rejected')}>Reject</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="secondary-action compact" onClick={() => updateEventStatus(item.id, 'approve')}>Approve</button>
                            <button type="button" className="secondary-action compact" onClick={() => updateEventStatus(item.id, 'reject')}>Reject</button>
                          </>
                        )}
                      </span>
                    )}
                    {item.status === 'Registered' && (
                      (() => {
                        const attendanceState = getAttendanceMarkingState(item.activityDate, currentRole);
                        return (
                      <label className="check-row table-check" title={attendanceState.help}>
                        <input
                          type="checkbox"
                          checked={item.attended}
                          disabled={demoMode || !attendanceState.canMark}
                          onChange={(event) => {
                            if (item.type === 'Competition') {
                              updateCompetitionAttendance(item.id, event.target.checked);
                            } else {
                              updateEventAttendance(item.id, event.target.checked);
                            }
                          }}
                        />
                        {attendanceState.label}
                      </label>
                        );
                      })()
                    )}
                    {canDelete && (
                      <button type="button" className="danger-action compact" onClick={() => setRemoveTarget(item)}>
                        Remove
                      </button>
                    )}
                    <div className="member-registration-details">
                      <dl className="detail-grid compact-details">
                        <div><dt>Username</dt><dd>{item.profile.username || '-'}</dd></div>
                        <div><dt>Role</dt><dd>{item.profile.role || '-'}</dd></div>
                        <div><dt>School</dt><dd>{item.profile.school || '-'}</dd></div>
                        <div><dt>Rank</dt><dd>{formatRank(item.profile.rankType, item.profile.rankValue)}</dd></div>
                      </dl>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
        })}
        {visibleMembers.length === 0 && (
          <p className="empty-state">No member signups match the current filters.</p>
        )}
      </div>
      <PaginationControls page={memberPage} totalPages={memberSlice.totalPages} onPageChange={setMemberPage} />
      <ConfirmDeleteDialog
        open={Boolean(removeTarget)}
        title={`Remove member from ${removeTarget?.title || 'activity'}?`}
        detail="This removes the member registration record from the selected event or competition."
        reason="Captain removed this registration"
        confirmLabel="Remove"
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (removeTarget) {
            await removeRegistration(removeTarget);
            setRemoveTarget(null);
          }
        }}
      />
    </section>
  );
};

export default MemberParticipationPanel;
