import React from 'react';
import apiClient from '../../utils/apiClient';
import type { AppNotification, Competition, EventItem } from '../../types/dashboard';
import { formatDateTime } from '../../utils/formatters';

const NotificationMenu = ({
  notifications,
  canAnnounce,
  events,
  competitions,
  onRead,
  onMessage,
}: {
  notifications: AppNotification[];
  canAnnounce: boolean;
  events: EventItem[];
  competitions: Competition[];
  onRead: (notificationId: number) => void;
  onMessage: (message: string) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const [announcementOpen, setAnnouncementOpen] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState({ title: '', message: '', target: 'All' });
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;
  const selectedTargetLabel = announcement.target === 'All'
    ? 'All active users'
    : announcement.target.replace(':', ': ');

  const submitAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    const [targetType, targetId] = announcement.target.split(':');
    const response = await apiClient.post<{ message: string; recipients: number; target: string }>('/notifications/announcements', {
      title: announcement.title,
      message: announcement.message,
      targetType,
      targetId: targetId ? Number(targetId) : null,
    });
    setAnnouncement({ title: '', message: '', target: 'All' });
    setAnnouncementOpen(false);
    onMessage(`${response.data.message} to ${response.data.recipients} member(s): ${response.data.target}.`);
  };

  return (
    <div className="notification-wrap">
      <button type="button" className="notification-button" onClick={() => setOpen(!open)} aria-label="Notifications">
        <BellIcon />
        {unreadCount > 0 && <strong>{unreadCount}</strong>}
      </button>
      {open && (
        <div className="notification-popover">
          <div className="notification-head">
            <strong>Notifications</strong>
          </div>
          <div className="notification-list">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={notification.read_at ? 'notification-item' : 'notification-item unread'}
                onClick={() => onRead(notification.id)}
              >
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <small>{formatDateTime(notification.created_at)}</small>
              </button>
            ))}
            {notifications.length === 0 && <p className="empty-state">No notifications yet.</p>}
          </div>
          {canAnnounce && (
            <div className="announcement-box">
              <button type="button" className="secondary-action compact" onClick={() => setAnnouncementOpen(!announcementOpen)}>
                {announcementOpen ? 'Close Announcement' : 'Create Announcement'}
              </button>
              {announcementOpen && (
                <form onSubmit={submitAnnouncement}>
                  <label className="form-field">
                    <span>Target</span>
                    <select value={announcement.target} onChange={(event) => setAnnouncement({ ...announcement, target: event.target.value })}>
                      <option value="All">All active users</option>
                      {events.map((eventItem) => (
                        <option key={`Event:${eventItem.id}`} value={`Event:${eventItem.id}`}>Event: {eventItem.title}</option>
                      ))}
                      {competitions.map((competition) => (
                        <option key={`Competition:${competition.id}`} value={`Competition:${competition.id}`}>Competition: {competition.title}</option>
                      ))}
                    </select>
                    <small className="target-hint">Recipients: {selectedTargetLabel}</small>
                  </label>
                  <label className="form-field">
                    <span>Title</span>
                    <input value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} required />
                  </label>
                  <label className="form-field">
                    <span>Message</span>
                    <textarea value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} required />
                  </label>
                  <button type="submit" className="primary-action compact">Send</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BellIcon = () => (
  <svg className="bell-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export default NotificationMenu;
