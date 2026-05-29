import React from 'react';
import { NavLink } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import type { Competition, CompetitionDetail, EventItem, NotificationResult, OptionsResponse, TournamentData } from '../../types/dashboard';
import ConfirmDeleteDialog from '../shared/ConfirmDeleteDialog';
import DatePickerField from '../shared/DatePickerField';
import EditModal from '../shared/EditModal';
import FormInput from '../shared/FormInput';
import FormSelect from '../shared/FormSelect';
import { EventManagementForm } from '../events/EventsPanel';
import TournamentOperationsPanel from './TournamentOperationsPanel';
import { CategoriesPanel, CategoryCapacityEditor, CreateCategoryForm } from './CompetitionCategories';
import { getApiErrorMessage } from '../../utils/apiErrors';

const DraftsPanel = ({
  eventDrafts,
  competitionDrafts,
  selectedCompetition,
  options,
  onSelectCompetition,
  onChanged,
  onCategoryCreated,
}: {
  eventDrafts: EventItem[];
  competitionDrafts: Competition[];
  selectedCompetition: CompetitionDetail | null;
  options: OptionsResponse;
  onSelectCompetition: (competitionId: number) => void;
  onChanged: (message: string) => void;
  onCategoryCreated: (message: string) => void;
}) => {
  const [editingEvent, setEditingEvent] = React.useState<EventItem | null>(null);

  const publishEvent = async (eventItem: EventItem) => {
    const response = await apiClient.put<{ message: string; notification?: NotificationResult }>(`/events/${eventItem.id}`, {
      status: 'Open',
      reason: 'Event published for member registration.',
    });
    onChanged(`${response.data.message}. ${notificationText(response.data.notification)}`);
  };

  return (
    <section className="drafts-page">
      <section className="panel large-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Unpublished activities</p>
            <h2>Event Drafts</h2>
          </div>
          <NavLink to="/events/create" className="primary-action compact">Create Event</NavLink>
        </div>
        <div className="event-grid">
          {eventDrafts.map((eventItem) => (
            <article className="event-card draft-card" key={eventItem.id}>
              <div>
                <span className="status-pill warning">Draft</span>
                <h3>{eventItem.title}</h3>
                <p>{eventItem.description || 'No description added yet.'}</p>
              </div>
              <dl className="detail-grid compact-details">
                <div><dt>Date</dt><dd>{formatDate(eventItem.event_date)}</dd></div>
                <div><dt>Venue</dt><dd>{eventItem.venue}</dd></div>
                <div><dt>Capacity</dt><dd>{eventItem.capacity}</dd></div>
                <div><dt>Approval</dt><dd>{eventItem.requires_approval ? 'Required' : 'Automatic'}</dd></div>
              </dl>
              <div className="event-actions">
                <button type="button" className="secondary-action compact" onClick={() => setEditingEvent(eventItem)}>Edit</button>
                <button type="button" className="primary-action compact" onClick={() => publishEvent(eventItem)}>Publish</button>
              </div>
            </article>
          ))}
          {eventDrafts.length === 0 && <p className="empty-state">No event drafts yet.</p>}
        </div>
      </section>

      <section className="content-grid drafts-competition-grid">
        <CompetitionsPanel
          competitions={competitionDrafts}
          selectedId={selectedCompetition?.id || competitionDrafts[0]?.id}
          canCreateEvents
          onSelect={onSelectCompetition}
          title="Competition Drafts"
          eyebrow="Unpublished tournaments"
          emptyMessage="No competition drafts yet."
          createLabel="Create Competition"
          createTo="/competitions/create"
          showDraftLink={false}
        />
        <CompetitionDetailPanel
          competition={selectedCompetition}
          canCreateEvents
          options={options}
          onCompetitionChanged={onChanged}
          onCategoryCreated={onCategoryCreated}
        />
      </section>

      {editingEvent && (
        <EditModal title={`Edit ${editingEvent.title}`} onClose={() => setEditingEvent(null)}>
          <EventManagementForm
            eventItem={editingEvent}
            onCancel={() => setEditingEvent(null)}
            onChanged={async (nextMessage) => {
              setEditingEvent(null);
              onChanged(nextMessage);
            }}
          />
        </EditModal>
      )}
    </section>
  );
};

const CompetitionsPanel = ({
  competitions,
  archivedCompetitions = [],
  selectedId,
  canCreateEvents,
  onSelect,
  title = 'Competitions',
  eyebrow = 'Tournament setup',
  emptyMessage = 'No competitions have been created yet.',
  createLabel = 'Create Competition',
  createTo = '/competitions/create',
  showDraftLink = true,
}: {
  competitions: Competition[];
  archivedCompetitions?: Competition[];
  selectedId?: number;
  canCreateEvents: boolean;
  onSelect: (competitionId: number) => void;
  title?: string;
  eyebrow?: string;
  emptyMessage?: string;
  createLabel?: string;
  createTo?: string;
  showDraftLink?: boolean;
}) => {
  const [showArchive, setShowArchive] = React.useState(false);

  const renderCompetitionCard = (competition: Competition) => {
    const fillRate = competition.total_capacity === 0 ? 0 : Math.round((competition.registration_count / competition.total_capacity) * 100);
    return (
      <article
        className={[
          'event-card',
          selectedId === competition.id ? 'selected-card' : '',
          competition.is_archived ? 'archived-card' : '',
        ].join(' ')}
        key={competition.id}
      >
        <div>
          <span className={competition.is_archived ? 'status-pill warning' : 'status-pill'}>
            {competition.is_archived ? 'Archived' : competition.status}
          </span>
          <h3>{competition.title}</h3>
          <p>{competition.description || 'No description added yet.'}</p>
        </div>
        <dl className="detail-grid compact-details">
          <div><dt>Date</dt><dd>{formatDate(competition.start_date)}</dd></div>
          <div><dt>Venue</dt><dd>{competition.venue_name || 'Venue pending'}</dd></div>
          <div><dt>Signups</dt><dd>{competition.registration_count}/{competition.total_capacity || 0} ({fillRate}%)</dd></div>
          {!competition.is_archived && <div><dt>Pending</dt><dd>{competition.pending_count}</dd></div>}
          {competition.is_archived && <div><dt>Status</dt><dd>Registration closed</dd></div>}
        </dl>
        <div className="event-actions">
          <button type="button" className="secondary-action compact" onClick={() => onSelect(competition.id)}>
            {selectedId === competition.id ? 'Selected' : 'View Details'}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div id="competitions" className="panel large-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {canCreateEvents && (
          <div className="row-actions">
            {showDraftLink && (
              <NavLink to="/drafts" className="secondary-action compact">
                Drafts
              </NavLink>
            )}
            <NavLink to={createTo} className="primary-action compact">
              {createLabel}
            </NavLink>
          </div>
        )}
      </div>
      <div className="event-grid">
        {competitions.map(renderCompetitionCard)}
        {competitions.length === 0 && <p className="empty-state">{emptyMessage}</p>}
      </div>
      {canCreateEvents && archivedCompetitions.length > 0 && (
        <div className="panel-section">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Auto archive</p>
              <h2>Archived Competitions</h2>
            </div>
            <button type="button" className="secondary-action compact" onClick={() => setShowArchive((current) => !current)}>
              {showArchive ? 'Hide Archive' : `Show Archive (${archivedCompetitions.length})`}
            </button>
          </div>
          {showArchive && (
            <div className="event-grid">
              {archivedCompetitions.map(renderCompetitionCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CreateCompetitionPage = ({
  options,
  onCreated,
}: {
  options: OptionsResponse;
  onCreated: (message: string) => void | Promise<void>;
}) => (
  <section className="panel create-event-panel">
    <div className="panel-heading">
      <div>
        <p className="eyebrow">New tournament</p>
        <h2>Create Competition</h2>
      </div>
      <NavLink to="/competitions" className="secondary-action compact">Back to Competitions</NavLink>
    </div>
    <p className="panel-intro">
      Create the competition as a draft first, then add categories from the competition detail panel before publishing it.
    </p>
    <CreateCompetitionForm options={options} onCreated={onCreated} />
  </section>
);

const CreateCompetitionForm = ({
  options,
  onCreated,
}: {
  options: OptionsResponse;
  onCreated: (message: string) => void | Promise<void>;
}) => {
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    venueId: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    requiresApproval: true,
    allowWaitlist: true,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiClient.post('/competitions', {
      ...form,
      venueId: toNumberOrNull(form.venueId),
      status: 'Draft',
    });
    setForm({ ...form, title: '', description: '' });
    await onCreated('Competition saved as draft. Publish it when categories and details are ready.');
  };

  return (
    <form id="setup" className="event-create-form" onSubmit={submit}>
      <div className="form-grid">
        <FormInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
        <DatePickerField label="Start Date" value={form.startDate} onChange={(startDate) => setForm({ ...form, startDate })} required />
        <DatePickerField label="End Date" value={form.endDate} onChange={(endDate) => setForm({ ...form, endDate })} />
        <FormSelect label="Venue" value={form.venueId} options={options.venues} onChange={(venueId) => setForm({ ...form, venueId })} />
        <DatePickerField label="Registration Deadline" value={form.registrationDeadline} onChange={(registrationDeadline) => setForm({ ...form, registrationDeadline })} />
      </div>
      <label className="check-row">
        <input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} />
        Require registration approval
      </label>
      <label className="check-row">
        <input type="checkbox" checked={form.allowWaitlist} onChange={(event) => setForm({ ...form, allowWaitlist: event.target.checked })} />
        Allow waitlist
      </label>
      <label className="form-field">
        <span>Description</span>
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>
      <button type="submit" className="primary-action compact">Save Draft</button>
    </form>
  );
};

const CompetitionDetailPanel = ({
  competition,
  canCreateEvents,
  options,
  onCompetitionChanged,
  onCategoryCreated,
}: {
  competition: CompetitionDetail | null;
  canCreateEvents: boolean;
  options: OptionsResponse;
  onCompetitionChanged: (message: string) => void;
  onCategoryCreated: (message: string) => void;
}) => {
  const [showManage, setShowManage] = React.useState(false);
  const [tournament, setTournament] = React.useState<TournamentData | null>(null);
  const [tournamentLoading, setTournamentLoading] = React.useState(false);
  const [detailTab, setDetailTab] = React.useState<'overview' | 'rules'>('overview');
  const [tournamentOpen, setTournamentOpen] = React.useState(false);

  React.useEffect(() => {
    setShowManage(false);
    setDetailTab('overview');
    setTournamentOpen(false);
  }, [competition?.id]);

  const loadTournament = React.useCallback(async (showLoading = true) => {
    if (!competition) {
      setTournament(null);
      return;
    }

    if (showLoading) {
      setTournamentLoading(true);
    }
    try {
      const response = await apiClient.get<TournamentData>(`/competitions/${competition.id}/tournament`);
      setTournament(response.data);
    } finally {
      if (showLoading) {
        setTournamentLoading(false);
      }
    }
  }, [competition]);

  React.useEffect(() => {
    loadTournament().catch((error) => {
      console.error('Failed to load tournament data:', error);
      setTournament(null);
    });
  }, [loadTournament]);

  const publishCompetition = async () => {
    if (!competition) {
      return;
    }

    const response = await apiClient.put<{ message: string; notification?: NotificationResult }>(`/competitions/${competition.id}`, {
      status: 'Open',
      reason: 'Competition published for member registration.',
    });
    onCompetitionChanged(`${response.data.message}. ${notificationText(response.data.notification)}`);
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Selected competition</p>
          <h2>{competition?.title || 'No competition selected'}</h2>
        </div>
        {competition && canCreateEvents && (
          <div className="row-actions">
            {competition.status === 'Draft' && (
              <button type="button" className="primary-action compact" onClick={publishCompetition}>
                Publish
              </button>
            )}
            <button type="button" className="secondary-action compact" onClick={() => setShowManage(!showManage)}>
              {showManage ? 'Close Edit' : 'Edit Competition'}
            </button>
          </div>
        )}
      </div>
      {competition ? (
        <div className="detail-stack">
          <div className="competition-detail-tabs">
            <button type="button" className={detailTab === 'overview' ? 'selected' : ''} onClick={() => setDetailTab('overview')}>Overview</button>
            <button type="button" className={detailTab === 'rules' ? 'selected' : ''} onClick={() => setDetailTab('rules')}>Rules & Setup</button>
            <button type="button" className={tournamentOpen ? 'selected' : ''} onClick={() => setTournamentOpen(true)}>Open Tournament Engine</button>
          </div>
          {showManage && canCreateEvents && (
            <CompetitionManagementForm
              competition={competition}
              options={options}
              onChanged={onCompetitionChanged}
            />
          )}
          {detailTab === 'overview' && (
            <>
              <p>{competition.description}</p>
              <dl className="detail-grid">
                <div><dt>Format</dt><dd>{competition.tournament_format || '-'}</dd></div>
                <div><dt>Scoring</dt><dd>{competition.scoring_system || '-'}</dd></div>
                <div><dt>Approval</dt><dd>{competition.requires_approval ? 'Required' : 'Automatic'}</dd></div>
                <div><dt>Signups</dt><dd>{competition.confirmed_signups || 0} confirmed / {competition.pending_signups || 0} pending</dd></div>
                <div><dt>Attendance</dt><dd>{competition.attended_count || 0} present</dd></div>
                <div><dt>Registration Deadline</dt><dd>{competition.registration_deadline ? formatDate(competition.registration_deadline) : '-'}</dd></div>
              </dl>
            </>
          )}
          {tournamentOpen && (
            <TournamentOperationsPanel
              competitionId={competition.id}
              competitionTitle={competition.title}
              tournament={tournament}
              loading={tournamentLoading}
              canManage={canCreateEvents}
              onClose={() => setTournamentOpen(false)}
              onChanged={async (nextMessage) => {
                await loadTournament();
                onCompetitionChanged(nextMessage);
              }}
              onResultChanged={async () => {
                await loadTournament(false);
              }}
            />
          )}
          {detailTab === 'rules' && (
            <>
              <div className="competition-detail-list">
                <DetailBlock title="Late Policy" text={competition.late_policy} />
                <DetailBlock title="Arbiter / Disputes" text={competition.arbiter_policy} />
                <DetailBlock title="Rules" text={competition.rules_text} />
              </div>
              {canCreateEvents && (
                <>
                  <CategoryCapacityEditor categories={competition.categories} onChanged={onCategoryCreated} />
                  <CreateCategoryForm competitionId={competition.id} onCreated={onCategoryCreated} />
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="empty-state">Select a competition to view its settings.</p>
      )}
    </div>
  );
};

const CompetitionManagementForm = ({
  competition,
  options,
  onChanged,
}: {
  competition: CompetitionDetail;
  options: OptionsResponse;
  onChanged: (message: string) => void | Promise<void>;
}) => {
  const currentVenue = options.venues.find((venue) => venue.name === competition.venue_name);
  const [form, setForm] = React.useState({
    title: competition.title,
    description: competition.description || '',
    venueId: currentVenue ? String(currentVenue.id) : '',
    startDate: toDateInput(competition.start_date),
    endDate: toDateInput(competition.end_date),
    registrationDeadline: toDateInput(competition.registration_deadline || ''),
    status: competition.status,
    requiresApproval: competition.requires_approval,
    allowWaitlist: competition.allow_waitlist,
    reason: '',
  });
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const isDraft = competition.status === 'Draft';

  const updateCompetition = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await apiClient.put<{ message: string; notification?: NotificationResult }>(`/competitions/${competition.id}`, {
        title: form.title,
        description: form.description,
        venueId: toNumberOrNull(form.venueId),
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        registrationDeadline: form.registrationDeadline,
        status: form.status,
        requiresApproval: form.requiresApproval,
        allowWaitlist: form.allowWaitlist,
        reason: form.reason,
      });
      await onChanged(`${response.data.message}. ${notificationText(response.data.notification)}`);
    } catch (error) {
      await onChanged(getApiErrorMessage(error, 'Could not update this competition.'));
    }
  };

  const deleteCompetition = async () => {
    if (!isDraft && !form.reason.trim()) {
      await onChanged('Please write a reason before deleting or cancelling this competition.');
      return;
    }

    const response = await apiClient.delete<{ message: string; notification?: NotificationResult }>(`/competitions/${competition.id}`, {
      data: { reason: form.reason },
    });
    await onChanged(`${response.data.message}. ${notificationText(response.data.notification)}`);
  };

  return (
    <form className="management-form" onSubmit={updateCompetition}>
      <div className="form-grid">
        <FormInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
        <DatePickerField label="Start Date" value={form.startDate} onChange={(startDate) => setForm({ ...form, startDate })} required />
        <DatePickerField label="End Date" value={form.endDate} onChange={(endDate) => setForm({ ...form, endDate })} />
        <FormSelect label="Venue" value={form.venueId} options={options.venues} onChange={(venueId) => setForm({ ...form, venueId })} />
      </div>
      <div className="form-grid">
        <DatePickerField label="Registration Deadline" value={form.registrationDeadline} onChange={(registrationDeadline) => setForm({ ...form, registrationDeadline })} />
        <label className="form-field">
          <span>Status</span>
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="Draft">Draft</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <label className="check-row">
        <input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} />
        Require registration approval
      </label>
      <label className="check-row">
        <input type="checkbox" checked={form.allowWaitlist} onChange={(event) => setForm({ ...form, allowWaitlist: event.target.checked })} />
        Allow waitlist
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
        <button type="submit" className="primary-action compact">Update Competition</button>
        <button type="button" className="danger-action compact" onClick={() => setConfirmOpen(true)}>Delete Competition</button>
      </div>
      <ConfirmDeleteDialog
        open={confirmOpen}
        title={`Delete ${competition.title}?`}
        detail={isDraft ? 'This draft has not been published, so no member notification reason is required.' : 'Registered members will receive an in-app notification. Email will be attempted in the background if configured.'}
        reason={form.reason}
        requireReason={!isDraft}
        onClose={() => setConfirmOpen(false)}
        onConfirm={deleteCompetition}
      />
    </form>
  );
};

const DetailBlock = ({ title, text }: { title: string; text: string | null }) => (
  <article>
    <strong>{title}</strong>
    <p>{text || '-'}</p>
  </article>
);


const formatDate = (dateValue: string) => {
  if (!dateValue) {
    return 'Date pending';
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
};

const toDateInput = (dateValue: string) => {
  if (!dateValue) {
    return '';
  }

  return new Date(dateValue).toISOString().slice(0, 10);
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

const toNumberOrNull = (value: string) => (value ? Number(value) : null);

export { CategoriesPanel, CompetitionsPanel, CreateCompetitionPage, CompetitionDetailPanel, DraftsPanel };

