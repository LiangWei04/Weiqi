import React from 'react';
import { NavLink } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import type { EventItem, NotificationResult, UserSettings } from '../../types/dashboard';
import ConfirmDeleteDialog from '../shared/ConfirmDeleteDialog';
import DatePickerField from '../shared/DatePickerField';
import FormInput from '../shared/FormInput';
import { getApiErrorMessage } from '../../utils/apiErrors';

const EventManagementForm = ({
  eventItem,
  onChanged,
  onCancel,
}: {
  eventItem: EventItem;
  onChanged: (message: string) => void | Promise<void>;
  onCancel?: () => void;
}) => {
  const [form, setForm] = React.useState({
    title: eventItem.title,
    description: eventItem.description || '',
    eventDate: toDateInput(eventItem.event_date),
    registrationDeadline: toDateInput(eventItem.registration_deadline || ''),
    venue: eventItem.venue,
    capacity: String(eventItem.capacity),
    status: eventItem.status,
    requiresApproval: eventItem.requires_approval,
    reason: '',
  });
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const isDraft = eventItem.status === 'Draft';

  const updateEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await apiClient.put<{ message: string; notification?: NotificationResult }>(`/events/${eventItem.id}`, {
        title: form.title,
        description: form.description,
        eventDate: form.eventDate,
        registrationDeadline: form.registrationDeadline,
        venue: form.venue,
        capacity: Number(form.capacity),
        status: form.status,
        requiresApproval: form.requiresApproval,
        reason: form.reason,
      });
      await onChanged(`${response.data.message}. ${notificationText(response.data.notification)}`);
    } catch (error) {
      await onChanged(getApiErrorMessage(error, 'Could not update this event.'));
    }
  };

  const deleteEvent = async () => {
    if (!isDraft && !form.reason.trim()) {
      await onChanged('Please write a reason before deleting or cancelling this event.');
      return;
    }

    const response = await apiClient.delete<{ message: string; notification?: NotificationResult }>(`/events/${eventItem.id}`, {
      data: { reason: form.reason },
    });
    await onChanged(`${response.data.message}. ${notificationText(response.data.notification)}`);
  };

  return (
    <form className="management-form" onSubmit={updateEvent}>
      <div className="form-grid">
        <FormInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
        <DatePickerField label="Date" value={form.eventDate} onChange={(eventDate) => setForm({ ...form, eventDate })} required />
        <DatePickerField label="Registration Deadline" value={form.registrationDeadline} onChange={(registrationDeadline) => setForm({ ...form, registrationDeadline })} required />
        <FormInput label="Venue" value={form.venue} onChange={(venue) => setForm({ ...form, venue })} required />
        <FormInput label="Capacity" type="number" value={form.capacity} onChange={(capacity) => setForm({ ...form, capacity })} required />
      </div>
      <label className="form-field">
        <span>Status</span>
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
          <option value="Draft">Draft</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} />
        Require approval
      </label>
      <label className="form-field">
        <span>Description</span>
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>
      <label className="form-field">
        <span>{isDraft ? 'Reason for updates (not needed for draft delete)' : 'Reason for change or cancellation'}</span>
        <textarea value={form.reason} required={!isDraft} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
      </label>
      <div className="row-actions">
        {onCancel && <button type="button" className="secondary-action compact" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="primary-action compact">Update Event</button>
        <button type="button" className="danger-action compact" onClick={() => setConfirmOpen(true)}>Delete Event</button>
      </div>
      <ConfirmDeleteDialog
        open={confirmOpen}
        title={`Delete ${eventItem.title}?`}
        detail={isDraft ? 'This draft has not been published, so no member notification reason is required.' : 'Registered members will receive an in-app notification. Email will be attempted in the background if configured.'}
        reason={form.reason}
        requireReason={!isDraft}
        onClose={() => setConfirmOpen(false)}
        onConfirm={deleteEvent}
      />
    </form>
  );
};

const CreateEventPage = ({
  settings,
  onCreated,
}: {
  settings: UserSettings;
  onCreated: (message: string) => void | Promise<void>;
}) => (
  <section className="panel create-event-panel">
    <div className="panel-heading">
      <div>
        <p className="eyebrow">New activity</p>
        <h2>Create Event</h2>
      </div>
      <NavLink to="/events" className="secondary-action compact">Back to Events</NavLink>
    </div>
    <p className="panel-intro">
      Add CCA activities such as training sessions, clinics, friendly match days or meetings. New events are saved as drafts until you publish them.
    </p>
    <CreateEventForm settings={settings} onCreated={onCreated} />
  </section>
);

const CreateEventForm = ({
  settings,
  onCreated,
}: {
  settings: UserSettings;
  onCreated: (message: string) => void | Promise<void>;
}) => {
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    eventDate: '',
    registrationDeadline: '',
    venue: settings.defaultCompetitionVenue,
    capacity: String(settings.defaultEventCapacity),
    requiresApproval: settings.defaultRequiresApproval,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiClient.post('/events', {
      title: form.title,
      description: form.description,
      eventDate: form.eventDate,
      registrationDeadline: form.registrationDeadline || form.eventDate,
      venue: form.venue,
      capacity: Number(form.capacity),
      requiresApproval: form.requiresApproval,
      status: 'Draft',
    });
    setForm({ ...form, title: '', description: '', eventDate: '', registrationDeadline: '' });
    await onCreated('Event saved as draft. Publish it when you are ready for members to register.');
  };

  return (
    <form className="event-create-form" onSubmit={submit}>
      <div className="form-grid">
        <FormInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
        <DatePickerField label="Date" value={form.eventDate} onChange={(eventDate) => setForm({ ...form, eventDate })} required />
        <DatePickerField label="Registration Deadline" value={form.registrationDeadline} onChange={(registrationDeadline) => setForm({ ...form, registrationDeadline })} required />
        <FormInput label="Venue" value={form.venue} onChange={(venue) => setForm({ ...form, venue })} required />
        <FormInput label="Capacity" type="number" value={form.capacity} onChange={(capacity) => setForm({ ...form, capacity })} required />
      </div>
      <label className="check-row">
        <input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} />
        Require approval
      </label>
      <label className="form-field">
        <span>Description</span>
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>
      <button type="submit" className="primary-action compact">Save Draft</button>
    </form>
  );
};


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

const toDateInput = (dateValue: string) => {
  if (!dateValue) {
    return '';
  }

  return new Date(dateValue).toISOString().slice(0, 10);
};

export { CreateEventPage, EventManagementForm };
