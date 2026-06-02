import React from 'react';
import { NavLink } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import type { CurrentUser, EventComment, EventItem, NotificationResult, OptionsResponse } from '../../types/dashboard';
import { formatDate, formatDateTime } from '../../utils/formatters';
import EditModal from '../shared/EditModal';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { CreateEventPage, EventManagementForm } from './EventForms';

const eventReactionOptions = [
  { type: 'like', icon: '\u{1F44D}', label: 'Like' },
  { type: 'heart', icon: '\u2764\uFE0F', label: 'Love' },
  { type: 'clap', icon: '\u{1F44F}', label: 'Clap' },
  { type: 'eyes', icon: '\u{1F440}', label: 'Interested' },
];

const EventsPanel = ({
  events,
  archivedEvents,
  canCreateEvents,
  canModerateComments,
  currentUser,
  options,
  onChanged,
}: {
  events: EventItem[];
  archivedEvents: EventItem[];
  canCreateEvents: boolean;
  canModerateComments: boolean;
  currentUser: CurrentUser | null;
  options: OptionsResponse;
  onChanged: (message: string) => void;
}) => {
  const [editingEvent, setEditingEvent] = React.useState<EventItem | null>(null);
  const [showArchive, setShowArchive] = React.useState(false);
  const [commentEvent, setCommentEvent] = React.useState<EventItem | null>(null);
  const [comments, setComments] = React.useState<EventComment[]>([]);
  const [commentText, setCommentText] = React.useState('');
  const [editingComment, setEditingComment] = React.useState<EventComment | null>(null);
  const [editingText, setEditingText] = React.useState('');

  const loadComments = async (eventItem: EventItem) => {
    const response = await apiClient.get<EventComment[]>(`/events/${eventItem.id}/comments`);
    setComments(response.data);
  };

  const openComments = async (eventItem: EventItem) => {
    setCommentEvent(eventItem);
    setCommentText('');
    setEditingComment(null);
    await loadComments(eventItem);
  };

  const registerForEvent = async (eventItem: EventItem) => {
    const response = await apiClient.post<{ message: string }>(`/events/${eventItem.id}/register`);
    onChanged(response.data.message || `Registered for ${eventItem.title}.`);
  };

  const publishEvent = async (eventItem: EventItem) => {
    const response = await apiClient.put<{ message: string; notification?: NotificationResult }>(`/events/${eventItem.id}`, {
      status: 'Open',
      reason: 'Event published for member registration.',
    });
    onChanged(`${response.data.message}. ${notificationText(response.data.notification)}`);
  };

  const togglePinned = async (eventItem: EventItem) => {
    const response = await apiClient.put<{ message: string; notification?: NotificationResult }>(`/events/${eventItem.id}`, {
      pinned: !eventItem.pinned,
      reason: eventItem.pinned ? 'Event unpinned from the Events page.' : 'Event pinned to the top of the Events page.',
    });
    onChanged(`${response.data.message}. ${eventItem.pinned ? 'Event unpinned.' : 'Event pinned.'}`);
  };

  const toggleReaction = async (eventItem: EventItem, reactionType: string) => {
    if (eventItem.current_user_reaction === reactionType) {
      await apiClient.delete(`/events/${eventItem.id}/reaction`);
      onChanged('Reaction removed.');
      return;
    }

    await apiClient.put(`/events/${eventItem.id}/reaction`, { reactionType });
    onChanged('Reaction updated.');
  };

  const submitComment = async () => {
    if (!commentEvent || !commentText.trim()) {
      return;
    }

    try {
      await apiClient.post(`/events/${commentEvent.id}/comments`, { commentText: commentText.trim() });
      setCommentText('');
      await loadComments(commentEvent);
      onChanged('Comment added.');
    } catch (error) {
      onChanged(getErrorMessage(error, 'Could not send comment.'));
    }
  };

  const saveCommentEdit = async () => {
    if (!editingComment || !commentEvent || !editingText.trim()) {
      return;
    }

    try {
      await apiClient.put(`/events/comments/${editingComment.id}`, { commentText: editingText.trim() });
      setEditingComment(null);
      setEditingText('');
      await loadComments(commentEvent);
      onChanged('Comment updated.');
    } catch (error) {
      onChanged(getErrorMessage(error, 'Could not update comment.'));
    }
  };

  const deleteComment = async (comment: EventComment) => {
    if (!commentEvent) {
      return;
    }

    try {
      await apiClient.delete(`/events/comments/${comment.id}`);
      await loadComments(commentEvent);
      onChanged('Comment deleted.');
    } catch (error) {
      onChanged(getErrorMessage(error, 'Could not delete comment.'));
    }
  };

  const renderEventCard = (eventItem: EventItem) => {
    const activeSignups = eventItem.active_signups ?? eventItem.registered + eventItem.pending_requests;
    const fillRate = eventItem.capacity === 0 ? 0 : Math.round((activeSignups / eventItem.capacity) * 100);
    const attendanceRate = eventItem.registered === 0 ? 0 : Math.round((eventItem.attended / eventItem.registered) * 100);
    const ownStatus = eventItem.current_user_registration_status;
    const registrationClosed = isPastDate(eventItem.registration_deadline);
    const canRegister = !ownStatus && eventItem.status === 'Open' && !registrationClosed && activeSignups < eventItem.capacity && !eventItem.is_archived;
    const registerLabel = eventItem.is_archived
      ? 'Archived'
      : registrationClosed && ownStatus !== 'Registered'
        ? 'Registration Closed'
        : ownStatus || (activeSignups >= eventItem.capacity ? 'Full' : 'Register');

    return (
      <article className={eventItem.is_archived ? 'event-card archived-card' : 'event-card'} key={eventItem.id}>
        <div>
          <div className='flex flex-wrap gap-2'>
              <span className={eventItem.is_archived ? 'status-pill warning' : 'status-pill'}>{eventItem.is_archived ? 'Archived' : eventItem.status}</span>
              {eventItem.pinned && <span className="status-pill">Pinned</span>}
          </div>
          <h3>{eventItem.title}</h3>
          <p>{eventItem.description || 'No description added yet.'}</p>
        </div>
        <dl className="detail-grid compact-details">
          <div><dt>Date</dt><dd>{formatDate(eventItem.event_date)}</dd></div>
          <div><dt>Register By</dt><dd>{eventItem.registration_deadline ? formatDate(eventItem.registration_deadline) : '-'}</dd></div>
          <div><dt>Venue</dt><dd>{eventItem.venue}</dd></div>
          <div><dt>Signups</dt><dd>{activeSignups}/{eventItem.capacity} ({fillRate}%)</dd></div>
          {eventItem.is_archived && (
            <div><dt>Attendance</dt><dd>{eventItem.attended}/{eventItem.registered} ({attendanceRate}%)</dd></div>
          )}
        </dl>
        <div className="event-social-row">
          {eventReactionOptions.map((reaction) => (
            <button
              key={reaction.type}
              type="button"
              className={eventItem.current_user_reaction === reaction.type ? 'reaction-chip active' : 'reaction-chip'}
              onClick={() => toggleReaction(eventItem, reaction.type)}
              title={reaction.label}
            >
              <span>{reaction.icon}</span>
              <strong>{eventItem.reaction_counts?.[reaction.type] || 0}</strong>
            </button>
          ))}
          <button type="button" className="comment-chip" onClick={() => openComments(eventItem)} title="Comments">
            <span>{'\u{1F4AC}'}</span>
            <strong>{eventItem.comment_count || 0}</strong>
          </button>
        </div>
        <div className="event-actions">
          <button type="button" className="secondary-action compact" disabled={!canRegister} onClick={() => registerForEvent(eventItem)}>
            {registerLabel}
          </button>
          {canCreateEvents && (
            <>
              <button type="button" className="secondary-action compact" onClick={() => togglePinned(eventItem)}>
                {eventItem.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button type="button" className="secondary-action compact" onClick={() => setEditingEvent(eventItem)}>
                Edit
              </button>
            </>
          )}
          {canCreateEvents && eventItem.status === 'Draft' && (
            <button type="button" className="primary-action compact" onClick={() => publishEvent(eventItem)}>
              Publish
            </button>
          )}
          {eventItem.pending_requests > 0 && <span className="status-pill warning">{eventItem.pending_requests} pending</span>}
        </div>
      </article>
    );
  };

  return (
    <section className="panel large-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CCA programme</p>
          <h2>Events</h2>
        </div>
        <div className="row-actions">
          <NavLink to="/my-events" className="secondary-action compact">
            My Events
          </NavLink>
          {canCreateEvents && (
            <>
              <NavLink to="/drafts" className="secondary-action compact">
                Drafts
              </NavLink>
              <NavLink to="/events/create" className="primary-action compact">
                Create Event
              </NavLink>
            </>
          )}
        </div>
      </div>
      <div className="event-grid">
        {events.map(renderEventCard)}
        {events.length === 0 && <p className="empty-state">No current or upcoming events. Passed events are archived automatically.</p>}
      </div>
      {canCreateEvents && archivedEvents.length > 0 && (
        <div className="panel-section">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Auto archive</p>
              <h2>Archived Events</h2>
            </div>
            <button type="button" className="secondary-action compact" onClick={() => setShowArchive((current) => !current)}>
              {showArchive ? 'Hide Archive' : `Show Archive (${archivedEvents.length})`}
            </button>
          </div>
          {showArchive && (
            <div className="event-grid">
              {archivedEvents.map(renderEventCard)}
            </div>
          )}
        </div>
      )}
      {canCreateEvents && editingEvent && (
        <EditModal title={`Edit ${editingEvent.title}`} onClose={() => setEditingEvent(null)}>
          <EventManagementForm
            eventItem={editingEvent}
            options={options}
            onCancel={() => setEditingEvent(null)}
            onChanged={async (nextMessage) => {
              setEditingEvent(null);
              onChanged(nextMessage);
            }}
          />
        </EditModal>
      )}
      {commentEvent && (
        <div className="dialog-backdrop" role="presentation">
          <section className="event-chat-modal" role="dialog" aria-modal="true" aria-label={`${commentEvent.title} comments`}>
            <div className="edit-modal-head">
              <div>
                <p className="eyebrow">Event discussion</p>
                <h3>{commentEvent.title}</h3>
              </div>
              <button type="button" className="secondary-action compact" onClick={() => setCommentEvent(null)}>Close</button>
            </div>
            <div className="comment-list">
              {comments.map((comment) => (
                <article className={comment.is_owner ? 'comment-bubble own-comment' : 'comment-bubble'} key={comment.id}>
                  <div className="comment-meta">
                    <strong>{comment.user_name}</strong>
                    <small>{formatDateTime(comment.created_at)}{comment.edited_at ? ' - edited' : ''}</small>
                  </div>
                  {editingComment?.id === comment.id ? (
                    <div className="comment-edit-box">
                      <textarea value={editingText} onChange={(event) => setEditingText(event.target.value)} rows={3} />
                      <div className="row-actions">
                        <button type="button" className="secondary-action compact" onClick={() => setEditingComment(null)}>Cancel</button>
                        <button type="button" className="primary-action compact" onClick={saveCommentEdit}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <p>{comment.comment_text}</p>
                  )}
                  <div className="comment-actions">
                    {comment.is_owner && comment.can_edit && editingComment?.id !== comment.id && (
                      <button type="button" className="ghost-action" onClick={() => {
                        setEditingComment(comment);
                        setEditingText(comment.comment_text);
                      }}>
                        Edit
                      </button>
                    )}
                    {(canModerateComments || comment.can_delete_own) && (
                      <button type="button" className="ghost-action danger-text" onClick={() => deleteComment(comment)}>
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {comments.length === 0 && <p className="empty-state">No comments yet. Start the discussion.</p>}
            </div>
            <div className="comment-compose">
              <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={3} placeholder={`Comment as ${currentUser?.name || 'member'}`} />
              <button type="button" className="primary-action compact" onClick={submitComment}>Send</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};


const getErrorMessage = getApiErrorMessage;

const notificationText = (notification?: NotificationResult) => {
  if (!notification) {
    return 'No notification summary returned.';
  }

  if (notification.inApp && notification.inApp > 0) {
    return `${notification.inApp} in-app notification(s) created. Email is sending in the background.`;
  }

  if (notification.sent > 0) {
    return `${notification.sent} participant email(s) sent.`;
  }

  if (notification.skipped > 0) {
    return `${notification.skipped} participant notification(s) skipped because email is not configured.`;
  }

  return 'No signed-up participants needed notification.';
};

const isPastDate = (dateValue?: string | null) => {
  if (!dateValue) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateValue);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate < today;
};

export { CreateEventPage, EventManagementForm };
export default EventsPanel;
