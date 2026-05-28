import React from 'react';
import { NavLink } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import type { AttendanceChangeRequest, EventRegistration, Registration } from '../../types/dashboard';
import PaginationControls from '../shared/PaginationControls';
import { paginate } from '../../utils/pagination';
import { formatDate } from '../../utils/formatters';
import { compareActivityDates, getAttendanceMarkingState, getErrorMessage } from './attendanceUtils';

const AttendancePanel = ({
  registrations,
  eventRegistrations,
  attendanceRequests,
  canApprove,
  currentRole,
  onStatusChanged,
}: {
  registrations: Registration[];
  eventRegistrations: EventRegistration[];
  attendanceRequests: AttendanceChangeRequest[];
  canApprove: boolean;
  currentRole: string;
  onStatusChanged: (message: string) => void;
}) => {
  const [activityFilter, setActivityFilter] = React.useState('All');
  const [queueFilter, setQueueFilter] = React.useState('All');
  const [queuePage, setQueuePage] = React.useState(1);
  const [selectedAttendanceActivityKey, setSelectedAttendanceActivityKey] = React.useState<string | null>(null);
  const [requestTarget, setRequestTarget] = React.useState<{
    id: number;
    type: 'Competition' | 'Event';
    name: string;
    detail: string;
    currentAttended: boolean;
  } | null>(null);
  const [requestReason, setRequestReason] = React.useState('');
  const pendingCompetitionRegistrations = registrations.filter((registration) => registration.status === 'Pending Approval');
  const pendingEventRegistrations = eventRegistrations.filter((registration) => registration.status === 'Pending Approval');
  const approvedCompetitionRegistrations = registrations.filter((registration) => registration.status === 'Registered');
  const approvedEventRegistrations = eventRegistrations.filter((registration) => registration.status === 'Registered');
  const activityOptionDates = new Map<string, string>();
  const addActivityOption = (label: string, activityDate: string) => {
    const currentDate = activityOptionDates.get(label);
    if (!currentDate || compareActivityDates(activityDate, currentDate) < 0) {
      activityOptionDates.set(label, activityDate);
    }
  };
  approvedCompetitionRegistrations.forEach((registration) => {
    addActivityOption(`Competition: ${registration.competition_title}`, registration.competition_start_date);
  });
  approvedEventRegistrations.forEach((registration) => {
    addActivityOption(`Event: ${registration.event_title}`, registration.event_date);
  });
  const activityOptions = Array.from(activityOptionDates.keys()).sort((left, right) => (
    compareActivityDates(activityOptionDates.get(left), activityOptionDates.get(right))
    || left.localeCompare(right)
  ));
  const queueOptions = Array.from(new Set([
    ...pendingCompetitionRegistrations.map((registration) => `Competition: ${registration.competition_title}`),
    ...pendingEventRegistrations.map((registration) => `Event: ${registration.event_title}`),
  ])).sort();
  const filteredPendingCompetitionRegistrations = pendingCompetitionRegistrations.filter((registration) => {
    return queueFilter === 'All' || queueFilter === `Competition: ${registration.competition_title}`;
  });
  const filteredPendingEventRegistrations = pendingEventRegistrations.filter((registration) => {
    return queueFilter === 'All' || queueFilter === `Event: ${registration.event_title}`;
  });
  const filteredCompetitionAttendance = approvedCompetitionRegistrations.filter((registration) => {
    const matchesActivity = activityFilter === 'All' || activityFilter === `Competition: ${registration.competition_title}`;
    return matchesActivity;
  });
  const filteredEventAttendance = approvedEventRegistrations.filter((registration) => {
    const matchesActivity = activityFilter === 'All' || activityFilter === `Event: ${registration.event_title}`;
    return matchesActivity;
  });
  const queueRows = [
    ...filteredPendingCompetitionRegistrations.map((registration) => ({
      key: `competition-${registration.id}`,
      type: 'Competition' as const,
      id: registration.id,
      name: registration.participant_name,
      detail: `${registration.competition_title} - ${registration.category_name}`,
      status: registration.status,
    })),
    ...filteredPendingEventRegistrations.map((registration) => ({
      key: `event-${registration.id}`,
      type: 'Event' as const,
      id: registration.id,
      name: registration.member_name,
      detail: registration.event_title,
      status: registration.status,
    })),
  ];
  const attendanceRows = [
    ...filteredCompetitionAttendance.map((registration) => ({
      key: `attendance-competition-${registration.id}`,
      type: 'Competition' as const,
      id: registration.id,
      name: registration.participant_name,
      detail: `${registration.competition_title} - ${registration.category_name}`,
      activityDate: registration.competition_start_date,
      attended: registration.attended,
    })),
    ...filteredEventAttendance.map((registration) => ({
      key: `attendance-event-${registration.id}`,
      type: 'Event' as const,
      id: registration.id,
      name: registration.member_name,
      detail: registration.event_title,
      activityDate: registration.event_date,
      attended: registration.attended,
    })),
  ].sort((left, right) => (
    compareActivityDates(left.activityDate, right.activityDate)
    || left.detail.localeCompare(right.detail)
    || left.name.localeCompare(right.name)
  ));
  const attendanceActivities = Array.from(attendanceRows.reduce((activities, row) => {
    const key = `${row.type}:${row.detail}`;
    const existingActivity = activities.get(key);
    if (existingActivity) {
      existingActivity.rows.push(row);
      existingActivity.present += row.attended ? 1 : 0;
      return activities;
    }

    activities.set(key, {
      key,
      type: row.type,
      detail: row.detail,
      activityDate: row.activityDate,
      rows: [row],
      present: row.attended ? 1 : 0,
    });
    return activities;
  }, new Map<string, {
    key: string;
    type: 'Competition' | 'Event';
    detail: string;
    activityDate: string;
    present: number;
    rows: typeof attendanceRows;
  }>()).values()).sort((left, right) => (
    compareActivityDates(left.activityDate, right.activityDate)
    || left.detail.localeCompare(right.detail)
  ));
  const selectedAttendanceActivity = attendanceActivities.find((activity) => activity.key === selectedAttendanceActivityKey) || null;
  const queueSlice = paginate(queueRows, queuePage, 8);

  React.useEffect(() => {
    setQueuePage(1);
  }, [queueFilter]);

  React.useEffect(() => {
    setSelectedAttendanceActivityKey(null);
  }, [activityFilter]);

  const updateCompetitionStatus = async (registrationId: number, status: string) => {
    try {
      await apiClient.put(`/competitions/registrations/${registrationId}/status`, { status });
      onStatusChanged(`Registration marked as ${status}.`);
    } catch (error) {
      onStatusChanged(getErrorMessage(error, 'Could not update competition registration.'));
    }
  };

  const updateEventStatus = async (registrationId: number, status: 'approve' | 'reject') => {
    try {
      await apiClient.put(`/registrations/${registrationId}/${status}`);
      onStatusChanged(`Event registration ${status === 'approve' ? 'approved' : 'rejected'}.`);
    } catch (error) {
      onStatusChanged(getErrorMessage(error, 'Could not update event registration.'));
    }
  };

  const updateCompetitionAttendance = async (registrationId: number, attended: boolean) => {
    try {
      await apiClient.put(`/competitions/registrations/${registrationId}/attendance`, { attended });
      onStatusChanged('Competition attendance updated.');
    } catch (error) {
      onStatusChanged(getErrorMessage(error, 'Could not update competition attendance.'));
    }
  };

  const updateEventAttendance = async (registrationId: number, attended: boolean) => {
    try {
      await apiClient.put(`/registrations/${registrationId}/attendance`, { attended });
      onStatusChanged('Event attendance updated.');
    } catch (error) {
      onStatusChanged(getErrorMessage(error, 'Could not update event attendance.'));
    }
  };

  const markActivityPresent = async () => {
    if (!selectedAttendanceActivity) {
      return;
    }

    const blockedRows = selectedAttendanceActivity.rows.filter((registration) => {
      const attendanceState = getAttendanceMarkingState(registration.activityDate, currentRole);
      return !attendanceState.canMark;
    });
    if (blockedRows.length > 0) {
      const firstBlocked = blockedRows[0];
      const attendanceState = getAttendanceMarkingState(firstBlocked.activityDate, currentRole);
      onStatusChanged(attendanceState.help);
      return;
    }

    const rowsToUpdate = selectedAttendanceActivity.rows.filter((registration) => !registration.attended);
    if (rowsToUpdate.length === 0) {
      onStatusChanged('Everyone in this activity is already marked present.');
      return;
    }

    try {
      await Promise.all(rowsToUpdate.map((registration) => (
        registration.type === 'Competition'
          ? apiClient.put(`/competitions/registrations/${registration.id}/attendance`, { attended: true })
          : apiClient.put(`/registrations/${registration.id}/attendance`, { attended: true })
      )));
      onStatusChanged(`Marked ${rowsToUpdate.length} member${rowsToUpdate.length === 1 ? '' : 's'} present for ${selectedAttendanceActivity.detail}.`);
    } catch (error) {
      onStatusChanged(getErrorMessage(error, 'Could not mark everyone present for this activity.'));
    }
  };

  const requestPastAttendanceChange = async () => {
    if (!requestTarget) {
      return;
    }

    if (!requestReason.trim()) {
      onStatusChanged('Please enter a reason for Captain approval.');
      return;
    }

    try {
      const path = requestTarget.type === 'Competition'
        ? `/attendance-requests/competitions/${requestTarget.id}`
        : `/attendance-requests/events/${requestTarget.id}`;
      await apiClient.post(path, {
        attended: !requestTarget.currentAttended,
        reason: requestReason.trim(),
      });
      setRequestTarget(null);
      setRequestReason('');
      onStatusChanged('Attendance change request sent to Captain.');
    } catch (error) {
      onStatusChanged(getErrorMessage(error, 'Could not send attendance change request.'));
    }
  };

  const reviewAttendanceRequest = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      await apiClient.put(`/attendance-requests/${requestId}/${action}`);
      onStatusChanged(`Attendance request ${action === 'approve' ? 'approved' : 'rejected'}.`);
    } catch (error) {
      onStatusChanged(getErrorMessage(error, `Could not ${action} attendance request.`));
    }
  };

  return (
    <div id="registrations" className="panel large-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Pending approvals</p>
          <h2>Registration Queue</h2>
        </div>
        {canApprove && (
          <NavLink to="/members" className="secondary-action compact">
            Manage Members
          </NavLink>
        )}
      </div>
      {currentRole === 'Captain' && (
        <div className="panel-section">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Captain approval</p>
              <h2>Attendance Change Requests</h2>
            </div>
          </div>
          <div className="data-list">
            {attendanceRequests.map((request) => (
              <article key={request.id} className="data-row">
                <span>
                  <strong>{request.member_name}</strong>
                  <small>
                    {request.activity_type}: {request.activity_title}
                    {request.category_name ? ` - ${request.category_name}` : ''}
                    {' '}on {formatDate(request.activity_date)}
                  </small>
                  <small>
                    Requested by {request.requester_name}: mark as {request.requested_attended ? 'Present' : 'Not present'}
                    {request.reason ? ` - ${request.reason}` : ''}
                  </small>
                </span>
                <span className="status-pill warning">Pending</span>
                <span className="row-actions">
                  <button type="button" className="secondary-action compact" onClick={() => reviewAttendanceRequest(request.id, 'approve')}>Approve</button>
                  <button type="button" className="secondary-action compact" onClick={() => reviewAttendanceRequest(request.id, 'reject')}>Reject</button>
                </span>
              </article>
            ))}
            {attendanceRequests.length === 0 && (
              <p className="empty-state">No past attendance change requests are waiting for approval.</p>
            )}
          </div>
        </div>
      )}
      <label className="form-field attendance-filter">
        <span>Queue Filter</span>
        <select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value)}>
          <option value="All">All pending requests</option>
          {queueOptions.map((activity) => (
            <option key={activity} value={activity}>{activity}</option>
          ))}
        </select>
      </label>
      <div className="data-list">
        {queueSlice.items.map((registration) => (
          <article key={registration.key} className="data-row">
            <span>
              <strong>{registration.name}</strong>
              <small>{registration.type}: {registration.detail}</small>
            </span>
            <span className="status-pill warning">{registration.status}</span>
            {canApprove && (
              <span className="row-actions">
                {registration.type === 'Competition' ? (
                  <>
                    <button type="button" className="secondary-action compact" onClick={() => updateCompetitionStatus(registration.id, 'Registered')}>Approve</button>
                    <button type="button" className="secondary-action compact" onClick={() => updateCompetitionStatus(registration.id, 'Rejected')}>Reject</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="secondary-action compact" onClick={() => updateEventStatus(registration.id, 'approve')}>Approve</button>
                    <button type="button" className="secondary-action compact" onClick={() => updateEventStatus(registration.id, 'reject')}>Reject</button>
                  </>
                )}
              </span>
            )}
          </article>
        ))}
        {queueRows.length === 0 && (
          <p className="empty-state">No pending approvals. Approved or rejected requests are removed from this queue.</p>
        )}
      </div>
      <PaginationControls page={queuePage} totalPages={queueSlice.totalPages} onPageChange={setQueuePage} />

      <div className="panel-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Attendance tracking</p>
            <h2>Activities</h2>
          </div>
        </div>
        <label className="form-field attendance-filter">
          <span>Activity Filter</span>
          <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
            <option value="All">All activities</option>
            {activityOptions.map((activity) => (
              <option key={activity} value={activity}>{activity}</option>
            ))}
          </select>
        </label>
        <div className="activity-attendance-grid">
          {attendanceActivities.map((activity) => {
            const attendanceState = getAttendanceMarkingState(activity.activityDate, currentRole);
            const attendanceRate = activity.rows.length === 0 ? 0 : Math.round((activity.present / activity.rows.length) * 100);
            return (
              <button type="button" className="activity-attendance-card" key={activity.key} onClick={() => setSelectedAttendanceActivityKey(activity.key)}>
                <span className="status-pill">{activity.type}</span>
                <strong>{activity.detail}</strong>
                <small>{formatDate(activity.activityDate)}</small>
                <dl className="detail-grid compact-details">
                  <div><dt>Signups</dt><dd>{activity.rows.length}</dd></div>
                  <div><dt>Present</dt><dd>{activity.present}/{activity.rows.length} ({attendanceRate}%)</dd></div>
                  <div><dt>Marking</dt><dd>{attendanceState.label}</dd></div>
                </dl>
              </button>
            );
          })}
          {attendanceActivities.length === 0 && (
            <p className="empty-state">No approved signups match this filter.</p>
          )}
        </div>
      </div>
      {selectedAttendanceActivity && (
        <div className="edit-modal-backdrop" role="presentation">
          <section className="edit-modal attendance-modal" role="dialog" aria-modal="true" aria-label={`${selectedAttendanceActivity.detail} attendance`}>
            <div className="edit-modal-head">
              <div>
                <p className="eyebrow">{selectedAttendanceActivity.type} attendance</p>
                <h3>{selectedAttendanceActivity.detail}</h3>
                <small>{formatDate(selectedAttendanceActivity.activityDate)}</small>
              </div>
              <button type="button" className="secondary-action compact" onClick={() => setSelectedAttendanceActivityKey(null)}>Close</button>
            </div>
            <div className="attendance-bulk-bar">
              <div>
                <strong>{selectedAttendanceActivity.present}/{selectedAttendanceActivity.rows.length} present</strong>
                <small>Mark everyone present first, then untick members who did not attend.</small>
              </div>
              <button type="button" className="primary-action compact" onClick={markActivityPresent}>
                Mark All Present
              </button>
            </div>
            <div className="data-list">
              {selectedAttendanceActivity.rows.map((registration) => {
                const attendanceState = getAttendanceMarkingState(registration.activityDate, currentRole);
                return (
                  <article key={registration.key} className="data-row">
                    <span>
                      <strong>{registration.name}</strong>
                      <small>{registration.type === 'Competition' ? registration.detail : selectedAttendanceActivity.detail}</small>
                    </span>
                    {attendanceState.canRequest ? (
                      <button
                        type="button"
                        className="secondary-action compact"
                        title={attendanceState.help}
                        onClick={() => setRequestTarget({
                          id: registration.id,
                          type: registration.type,
                          name: registration.name,
                          detail: registration.detail,
                          currentAttended: registration.attended,
                        })}
                      >
                        {attendanceState.label}
                      </button>
                    ) : (
                      <label className="check-row table-check" title={attendanceState.help}>
                        <input
                          type="checkbox"
                          checked={registration.attended}
                          disabled={!attendanceState.canMark}
                          onChange={(event) => {
                            if (registration.type === 'Competition') {
                              updateCompetitionAttendance(registration.id, event.target.checked);
                            } else {
                              updateEventAttendance(registration.id, event.target.checked);
                            }
                          }}
                        />
                        {registration.attended ? 'Present' : attendanceState.label}
                      </label>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
      {requestTarget && (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true">
            <h3>Request Captain Approval</h3>
            <p>
              Request to mark {requestTarget.name} as {requestTarget.currentAttended ? 'not present' : 'present'} for {requestTarget.detail}.
            </p>
            <label className="form-field">
              <span>Reason</span>
              <textarea
                value={requestReason}
                onChange={(event) => setRequestReason(event.target.value)}
                rows={4}
                placeholder="Explain why this past attendance record needs to change"
              />
            </label>
            <div className="dialog-actions">
              <button type="button" className="secondary-action compact" onClick={() => {
                setRequestTarget(null);
                setRequestReason('');
              }}>
                Cancel
              </button>
              <button type="button" className="primary-action compact" onClick={requestPastAttendanceChange}>
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePanel;

