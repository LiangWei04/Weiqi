import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar, Bubble, Line } from 'react-chartjs-2';
import apiClient from '../utils/apiClient';

ChartJS.register(
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

interface Competition {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  venue_name: string | null;
  organizer_name: string | null;
  tournament_format: string | null;
  scoring_system: string | null;
  requires_approval: boolean;
  allow_waitlist: boolean;
  round_count: number;
  schedule_text: string | null;
  awards_text: string | null;
  eligibility_text: string | null;
  registration_method: string | null;
  registration_deadline: string | null;
  time_control: string | null;
  late_policy: string | null;
  arbiter_policy: string | null;
  rules_text: string | null;
  category_count: number;
  registration_count: number;
  pending_count: number;
  total_capacity: number;
  confirmed_signups: number;
  pending_signups: number;
  attended_count: number;
}

interface Category {
  id: number;
  name: string;
  capacity: number;
  registration_fee: string;
  min_age: number | null;
  max_age: number | null;
  current_user_registration_status?: string | null;
}

interface CompetitionDetail extends Competition {
  categories: Category[];
  registration_opens_at: string | null;
  registration_closes_at: string | null;
}

interface Registration {
  id: number;
  status: string;
  attended: boolean;
  user_id: number;
  participant_name: string;
  participant_email: string;
  category_id: number;
  category_name: string;
  competition_id: number;
  competition_title: string;
  participant_username?: string | null;
  participant_role?: string | null;
  school?: string | null;
  rank_type?: string | null;
  rank_value?: number | null;
}

interface EventItem {
  id: number;
  title: string;
  description: string;
  event_date: string;
  venue: string;
  capacity: number;
  status: string;
  requires_approval: boolean;
  registered: number;
  pending_requests: number;
  active_signups: number;
  attended: number;
  current_user_registration_status: string | null;
}

interface EventRegistration {
  id: number;
  status: string;
  attended: boolean;
  event_id: number;
  member_name: string;
  member_email: string;
  event_title: string;
  requires_approval: boolean;
  member_username?: string | null;
  member_role?: string | null;
  school?: string | null;
  rank_type?: string | null;
  rank_value?: number | null;
}

interface SelectOption {
  id: number;
  name: string;
}

interface OptionsResponse {
  venues: SelectOption[];
  tournament_formats: SelectOption[];
  scoring_systems: SelectOption[];
}

interface CurrentUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  active?: boolean;
  status?: string;
  emailVerified?: boolean;
  authProvider?: string;
}

interface ManagedUser {
  id: number;
  name: string;
  username: string | null;
  email: string;
  role: string;
  active: boolean;
  status: string;
  emailVerified: boolean;
  authProvider: string;
  createdAt: string;
}

interface NamedTotal {
  name?: string;
  status?: string;
  total: number;
}

interface CapacityPoint {
  id: number;
  title: string;
  capacity: number;
  demand: number;
  confirmed: number;
  fill_rate: number;
}

interface CategoryDemandPoint {
  competition_title: string;
  category_name: string;
  capacity: number;
  demand: number;
  confirmed: number;
  pending: number;
}

interface RegistrationTrendPoint {
  registration_date: string;
  total: number;
}

interface VenueUtilizationPoint {
  venue_name: string;
  competition_count: number;
  total_capacity: number;
  total_demand: number;
}

interface EventPopularityPoint {
  id: number;
  title: string;
  capacity: number;
  registered: number;
  pending: number;
  attended: number;
  fill_rate: number;
}

interface AttendancePoint {
  title: string;
  registered: number;
  attended: number;
  attendance_rate: number;
}

interface DashboardStats {
  total_users: number;
  total_events: number;
  total_competitions: number;
  open_competitions: number;
  total_categories: number;
  total_competition_registrations: number;
  pending_competition_registrations: number;
  approved_competition_registrations: number;
  competition_approval_rate: number;
  competition_attendance_rate: number;
  competition_status_breakdown: NamedTotal[];
  format_breakdown: NamedTotal[];
  competition_registration_funnel: NamedTotal[];
  competition_capacity: CapacityPoint[];
  category_demand: CategoryDemandPoint[];
  registrations_over_time: RegistrationTrendPoint[];
  venue_utilization: VenueUtilizationPoint[];
  event_popularity: EventPopularityPoint[];
  attendance_by_event: AttendancePoint[];
  competition_attendance: AttendancePoint[];
}

interface UserSettings {
  notifyRegistrationUpdate: boolean;
  notifyEventReminder: boolean;
  notifyAttendanceMarked: boolean;
  defaultRequiresApproval: boolean;
  defaultEventCapacity: number;
  defaultCompetitionVenue: string;
}

interface NotificationResult {
  sent: number;
  skipped: number;
  inApp?: number;
}

interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  activity_type: string | null;
  activity_id: number | null;
  read_at: string | null;
  created_at: string;
}

interface MyActivity {
  activity_type: 'Event' | 'Competition';
  activity_id: number;
  title: string;
  description: string;
  activity_date: string;
  venue: string | null;
  status: string;
  attended: boolean;
  category_name: string | null;
}

const eventManagerRoles = new Set(['Captain', 'Vice-Captain']);
const attendanceManagerRoles = new Set(['Captain', 'Vice-Captain', 'Secretary']);

const chartPalette = {
  cyan: '#00e5ff',
  green: '#32d74b',
  red: '#ff453a',
  amber: '#ffd60a',
  blue: '#4f8cff',
  purple: '#bf5af2',
  grid: '#2c2c2e',
  text: '#ffffff',
  muted: '#98989d',
};

const defaultUserSettings: UserSettings = {
  notifyRegistrationUpdate: true,
  notifyEventReminder: true,
  notifyAttendanceMarked: false,
  defaultRequiresApproval: false,
  defaultEventCapacity: 20,
  defaultCompetitionVenue: '',
};

type DashboardView = 'analytics' | 'events' | 'my-events' | 'event-create' | 'competitions' | 'competition-create' | 'drafts' | 'attendance' | 'members' | 'users' | 'settings';

const pageTitles: Record<DashboardView, { eyebrow: string; title: string }> = {
  analytics: { eyebrow: 'Deep analytics', title: 'Dashboard' },
  events: { eyebrow: 'CCA activity', title: 'Events' },
  'my-events': { eyebrow: 'My activity', title: 'My Events' },
  'event-create': { eyebrow: 'CCA activity', title: 'Create Event' },
  competitions: { eyebrow: 'Tournament setup', title: 'Competitions' },
  'competition-create': { eyebrow: 'Tournament setup', title: 'Create Competition' },
  drafts: { eyebrow: 'Manager workspace', title: 'Drafts' },
  attendance: { eyebrow: 'Attendance control', title: 'Attendance' },
  members: { eyebrow: 'Participation control', title: 'Members' },
  users: { eyebrow: 'Captain control', title: 'Users' },
  settings: { eyebrow: 'Account control', title: 'Settings' },
};

const DashboardPage: React.FC<{ view?: DashboardView }> = ({ view = 'analytics' }) => {
  const navigate = useNavigate();
  const [role, setRole] = React.useState(localStorage.getItem('role') || 'Member');
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null);
  const [competitions, setCompetitions] = React.useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = React.useState<CompetitionDetail | null>(null);
  const [selectedDraftCompetition, setSelectedDraftCompetition] = React.useState<CompetitionDetail | null>(null);
  const [registrations, setRegistrations] = React.useState<Registration[]>([]);
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [eventRegistrations, setEventRegistrations] = React.useState<EventRegistration[]>([]);
  const [users, setUsers] = React.useState<ManagedUser[]>([]);
  const [userSettings, setUserSettings] = React.useState<UserSettings>(defaultUserSettings);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [myActivities, setMyActivities] = React.useState<MyActivity[]>([]);
  const [options, setOptions] = React.useState<OptionsResponse>({ venues: [], tournament_formats: [], scoring_systems: [] });
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [message, setMessage] = React.useState('');
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string }>>([]);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage('');
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const showToast = React.useCallback((nextMessage: string) => {
    const id = Date.now() + Math.random();
    setToasts((currentToasts) => [...currentToasts, { id, message: nextMessage }].slice(-3));
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const dismissToast = React.useCallback((id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const canCreateEvents = eventManagerRoles.has(role);
  const canManageAttendance = attendanceManagerRoles.has(role);
  const canManageUsers = role === 'Captain';
  const publishedEvents = events.filter((eventItem) => eventItem.status !== 'Draft');
  const draftEvents = events.filter((eventItem) => eventItem.status === 'Draft');
  const publishedCompetitions = competitions.filter((competition) => competition.status !== 'Draft');
  const draftCompetitions = competitions.filter((competition) => competition.status === 'Draft');
  const selectedCategories = selectedCompetition?.categories || [];
  const selectedId = selectedCompetition?.id;
  const totalRegistrations = competitions.reduce((sum, item) => sum + Number(item.registration_count || 0), 0);
  const pendingApprovals = competitions.reduce((sum, item) => sum + Number(item.pending_count || 0), 0);
  const totalAttendance = competitions.reduce((sum, item) => sum + Number(item.attended_count || 0), 0)
    + events.reduce((sum, item) => sum + Number(item.attended || 0), 0);
  const totalApproved = competitions.reduce((sum, item) => sum + Number(item.confirmed_signups || 0), 0)
    + events.reduce((sum, item) => sum + Number(item.registered || 0), 0);
  const attendanceRate = totalApproved === 0 ? 0 : Math.round((totalAttendance / totalApproved) * 100);

  const loadData = React.useCallback(async (freshRole?: string) => {
    const activeRole = freshRole || role;
    const canLoadManagementData = attendanceManagerRoles.has(activeRole);

    try {
      const [competitionResponse, eventResponse, optionsResponse] = await Promise.all([
        apiClient.get<Competition[]>('/competitions'),
        apiClient.get<EventItem[]>('/events'),
        apiClient.get<OptionsResponse>('/competitions/options'),
      ]);
      const statsResponse = await apiClient.get<DashboardStats>('/dashboard/stats');
      const settingsResponse = await apiClient.get<UserSettings>('/users/me/settings');
      const [notificationResponse, myActivityResponse] = await Promise.all([
        apiClient.get<AppNotification[]>('/notifications'),
        apiClient.get<MyActivity[]>('/notifications/my-activities'),
      ]);

      const nextCompetitions = competitionResponse.data;
      const nextPublishedCompetitions = nextCompetitions.filter((competition) => competition.status !== 'Draft');
      const nextDraftCompetitions = nextCompetitions.filter((competition) => competition.status === 'Draft');

      setCompetitions(nextCompetitions);
      setEvents(eventResponse.data);
      setOptions(optionsResponse.data);
      setStats(statsResponse.data);
      setUserSettings(settingsResponse.data);
      setNotifications(notificationResponse.data);
      setMyActivities(myActivityResponse.data);

      if (canLoadManagementData) {
        const [registrationResponse, eventRegistrationResponse] = await Promise.all([
          apiClient.get<Registration[]>('/competitions/registrations'),
          apiClient.get<EventRegistration[]>('/registrations'),
        ]);
        setRegistrations(registrationResponse.data);
        setEventRegistrations(eventRegistrationResponse.data);
      } else {
        setRegistrations([]);
        setEventRegistrations([]);
      }

      if (activeRole === 'Captain') {
        const userResponse = await apiClient.get<{ users: ManagedUser[] }>('/users?limit=100');
        setUsers(userResponse.data.users);
      } else {
        setUsers([]);
      }

      const selectedCompetitionId = selectedCompetition?.id;
      const selectedStillExists = selectedCompetitionId !== undefined
        && selectedCompetition?.status !== 'Draft'
        && nextPublishedCompetitions.some((competition) => competition.id === selectedCompetitionId);
      if (selectedCompetitionId && selectedStillExists) {
        const detailResponse = await apiClient.get<CompetitionDetail>(`/competitions/${selectedCompetitionId}`);
        setSelectedCompetition(detailResponse.data);
      } else {
        setSelectedCompetition(null);
      }

      const draftDetailId = selectedDraftCompetition?.status === 'Draft'
        ? selectedDraftCompetition?.id
        : nextDraftCompetitions[0]?.id;
      if (draftDetailId) {
        const draftDetailResponse = await apiClient.get<CompetitionDetail>(`/competitions/${draftDetailId}`);
        setSelectedDraftCompetition(draftDetailResponse.data);
      } else {
        setSelectedDraftCompetition(null);
      }

      setMessage('');
    } catch (error) {
      console.error('Failed to load tournament dashboard:', error);
      showToast('Unable to load tournament data. Please login and make sure the backend is running.');
    }
  }, [role, selectedCompetition?.id, selectedCompetition?.status, selectedDraftCompetition?.id, selectedDraftCompetition?.status, showToast]);

  React.useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    apiClient.get<CurrentUser>('/auth/me')
      .then((response) => {
        setCurrentUser(response.data);
        setRole(response.data.role);
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('userId', String(response.data.id));
        return loadData(response.data.role);
      })
      .catch((error) => {
        console.error('Session refresh failed:', error);
        navigate('/login', { replace: true });
      });
  }, [loadData, navigate]);

  const selectCompetition = async (competitionId: number) => {
    try {
      const response = await apiClient.get<CompetitionDetail>(`/competitions/${competitionId}`);
      setSelectedCompetition(response.data);
    } catch (error) {
      console.error('Failed to load competition:', error);
      setMessage('Unable to load this competition.');
    }
  };

  const selectDraftCompetition = async (competitionId: number) => {
    try {
      const response = await apiClient.get<CompetitionDetail>(`/competitions/${competitionId}`);
      setSelectedDraftCompetition(response.data);
    } catch (error) {
      console.error('Failed to load draft competition:', error);
      setMessage('Unable to load this draft competition.');
    }
  };

  const reloadWithMessage = async (nextMessage: string) => {
    await loadData(role);
    showToast(nextMessage);
  };

  const markNotificationRead = async (notificationId: number) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      setNotifications((current) => current.map((notification) => (
        notification.id === notificationId
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      )));
    } catch (error) {
      showToast(getErrorMessage(error, 'Could not update notification.'));
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    navigate('/login', { replace: true });
  };

  const deactivateAccount = async () => {
    try {
      await apiClient.put('/users/me/deactivate');
      logout();
    } catch (error) {
      console.error('Deactivate failed:', error);
      showToast('Could not deactivate your account.');
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[radial-gradient(circle_at_84%_0%,rgba(0,229,255,0.1),transparent_26%),#121212] lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar role={role} canManageAttendance={canManageAttendance} canManageUsers={canManageUsers} />
      <section className="min-w-0 p-5 text-white md:p-7">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-app-cyan">{pageTitles[view].eyebrow}</p>
            <h1 className="m-0 text-3xl font-black tracking-normal text-white">{pageTitles[view].title}</h1>
            {currentUser && <small className="mt-1 block text-sm font-bold text-app-muted">{currentUser.name} - {currentUser.email}</small>}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <NotificationMenu
              notifications={notifications}
              canAnnounce={canManageAttendance}
              events={events}
              competitions={competitions}
              onRead={markNotificationRead}
              onMessage={reloadWithMessage}
            />
            <button type="button" className="secondary-action compact" onClick={logout}>Logout</button>
          </div>
        </header>

        <ToastStack toasts={toasts} onClose={dismissToast} />

        {view === 'analytics' && (
          <>
            <OverviewMetrics
              competitionCount={competitions.length}
              totalRegistrations={totalRegistrations}
              pendingApprovals={pendingApprovals}
              eventCount={events.length}
              totalAttendance={totalAttendance}
              attendanceRate={attendanceRate}
            />
            {stats && <AnalyticsDashboard stats={stats} />}
          </>
        )}

        {view === 'events' && (
          <EventsPanel
            events={publishedEvents}
            canCreateEvents={canCreateEvents}
            onChanged={(nextMessage) => reloadWithMessage(nextMessage)}
          />
        )}

        {view === 'my-events' && (
          <MyEventsPanel activities={myActivities} />
        )}

        {view === 'event-create' && (
          canCreateEvents ? (
            <CreateEventPage
              settings={userSettings}
              onCreated={async (nextMessage) => {
                await loadData(role);
                showToast(nextMessage);
                navigate('/drafts');
              }}
            />
          ) : (
            <AccessNotice label="Create Event" />
          )
        )}

        {view === 'competitions' && (
          <>
            <section className="content-grid">
              <CompetitionsPanel
                competitions={publishedCompetitions}
                selectedId={selectedId}
                canCreateEvents={canCreateEvents}
                onSelect={selectCompetition}
              />
              <CompetitionDetailPanel
                competition={selectedCompetition}
                canCreateEvents={canCreateEvents}
                options={options}
                onCompetitionChanged={(nextMessage) => reloadWithMessage(nextMessage)}
                onCategoryCreated={(nextMessage) => reloadWithMessage(nextMessage)}
              />
            </section>
            <section className="content-grid single-column">
              <CategoriesPanel
                categories={selectedCategories}
                onRegistered={(nextMessage) => reloadWithMessage(nextMessage)}
              />
            </section>
          </>
        )}

        {view === 'competition-create' && (
          canCreateEvents ? (
            <CreateCompetitionPage
              options={options}
              onCreated={async (nextMessage) => {
                await loadData(role);
                showToast(nextMessage);
                navigate('/drafts');
              }}
            />
          ) : (
            <AccessNotice label="Create Competition" />
          )
        )}

        {view === 'drafts' && (
          canCreateEvents ? (
            <DraftsPanel
              eventDrafts={draftEvents}
              competitionDrafts={draftCompetitions}
              selectedCompetition={selectedDraftCompetition}
              options={options}
              onSelectCompetition={selectDraftCompetition}
              onChanged={(nextMessage) => reloadWithMessage(nextMessage)}
              onCategoryCreated={(nextMessage) => reloadWithMessage(nextMessage)}
            />
          ) : (
            <AccessNotice label="Drafts" />
          )
        )}

        {view === 'attendance' && (
          canManageAttendance ? (
            <AttendancePanel
              registrations={registrations}
              eventRegistrations={eventRegistrations}
              canApprove={canCreateEvents}
              onStatusChanged={(nextMessage) => reloadWithMessage(nextMessage)}
            />
          ) : (
            <AccessNotice label="Attendance" />
          )
        )}

        {view === 'members' && (
          canManageAttendance ? (
            <MemberParticipationPanel
              registrations={registrations}
              eventRegistrations={eventRegistrations}
              canApprove={canCreateEvents}
              canDelete={canCreateEvents}
              onChanged={(nextMessage) => reloadWithMessage(nextMessage)}
            />
          ) : (
            <AccessNotice label="Members" />
          )
        )}

        {view === 'users' && (
          canManageUsers ? (
            <UsersPanel
              users={users}
              currentUserId={currentUser?.id}
              onUsersChanged={(nextMessage) => reloadWithMessage(nextMessage)}
            />
          ) : (
            <AccessNotice label="Users" />
          )
        )}

        {view === 'settings' && (
          <SettingsPanel
            currentUser={currentUser}
            settings={userSettings}
            canManageDefaults={canCreateEvents}
            onProfileUpdated={(user, nextMessage) => {
              setCurrentUser(user);
              showToast(nextMessage);
            }}
            onSettingsUpdated={(settings, nextMessage) => {
              setUserSettings(settings);
              showToast(nextMessage);
            }}
            onMessage={showToast}
            onDeactivate={() => setDeactivateConfirmOpen(true)}
          />
        )}
        <ConfirmDeleteDialog
          open={deactivateConfirmOpen}
          title="Deactivate your account?"
          detail="This marks your account inactive and logs you out. Captains can still see the inactive record."
          reason="User requested account deactivation"
          confirmLabel="Deactivate"
          onClose={() => setDeactivateConfirmOpen(false)}
          onConfirm={deactivateAccount}
        />
      </section>
    </main>
  );
};

const Sidebar = ({
  role,
  canManageAttendance,
  canManageUsers,
}: {
  role: string;
  canManageAttendance: boolean;
  canManageUsers: boolean;
}) => (
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
      {canManageUsers && <SideNavLink to="/users">Users</SideNavLink>}
      <SideNavLink to="/settings">Settings</SideNavLink>
    </nav>
    <div className="mt-auto rounded-2xl border border-app-border bg-app-surface p-4">
      <span className="block text-[0.82rem] font-bold text-app-muted">Signed in as</span>
      <strong className="mt-1 block text-app-cyan">{role}</strong>
    </div>
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

const AccessNotice = ({ label }: { label: string }) => (
  <section className="panel alert-panel">
    <h2>{label}</h2>
    <p>This page is only available to users with the required committee permission.</p>
  </section>
);

const ToastStack = ({
  toasts,
  onClose,
}: {
  toasts: Array<{ id: number; message: string }>;
  onClose: (id: number) => void;
}) => (
  <div className="toast-stack" aria-live="polite">
    {toasts.map((toast) => (
      <Toast key={toast.id} message={toast.message} onClose={() => onClose(toast.id)} />
    ))}
  </div>
);

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="toast-message" role="status">
    <span>{message}</span>
    <button type="button" onClick={onClose} aria-label="Dismiss notification">x</button>
  </div>
);

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

const OverviewMetrics = ({
  competitionCount,
  totalRegistrations,
  pendingApprovals,
  eventCount,
  totalAttendance,
  attendanceRate,
}: {
  competitionCount: number;
  totalRegistrations: number;
  pendingApprovals: number;
  eventCount: number;
  totalAttendance: number;
  attendanceRate: number;
}) => (
  <section id="overview" className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Tournament metrics">
    <MetricCard label="Competitions" value={competitionCount} hint="Active records" />
    <MetricCard label="Events" value={eventCount} hint="CCA activities" />
    <MetricCard label="Registrations" value={totalRegistrations} hint={`${pendingApprovals} pending approval`} />
    <MetricCard label="Attendance" value={`${attendanceRate}%`} hint={`${totalAttendance} marked present`} />
  </section>
);

const MetricCard = ({ label, value, hint }: { label: string; value: number | string; hint: string }) => (
  <article className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel">
    <span className="block text-[0.82rem] font-extrabold text-app-muted">{label}</span>
    <strong className="mt-2 block font-mono text-3xl font-black text-app-cyan">{value}</strong>
    <small className="mt-1 block text-[0.82rem] font-bold text-app-muted">{hint}</small>
  </article>
);

const AnalyticsDashboard = ({ stats }: { stats: DashboardStats }) => {
  const topCompetition = stats.competition_capacity[0];
  const topCategory = stats.category_demand[0];
  const topVenue = stats.venue_utilization[0];
  const activityAttendance = [
    ...stats.competition_attendance.map((item) => ({ ...item, title: `C: ${item.title}` })),
    ...stats.attendance_by_event.map((item) => ({ ...item, title: `E: ${item.title}` })),
  ].sort((a, b) => b.attendance_rate - a.attendance_rate).slice(0, 8);
  const visibleFunnelStatuses = new Set(['Pending Approval', 'Registered', 'Rejected']);
  const funnelItems = stats.competition_registration_funnel
    .filter((item) => visibleFunnelStatuses.has(item.status || '') && item.total > 0)
    .map((item) => ({
      label: item.status === 'Registered' ? 'Approved' : item.status || 'Unknown',
      total: item.total,
    }));
  const funnelTotal = funnelItems.reduce((sum, item) => sum + item.total, 0);
  const approvedTotal = funnelItems.find((item) => item.label === 'Approved')?.total || 0;
  const pendingTotal = funnelItems.find((item) => item.label === 'Pending Approval')?.total || 0;
  const rejectedTotal = funnelItems.find((item) => item.label === 'Rejected')?.total || 0;
  const cumulativeTrend = stats.registrations_over_time.reduce<number[]>((runningTotals, item) => {
    const previousTotal = runningTotals[runningTotals.length - 1] || 0;
    runningTotals.push(previousTotal + item.total);
    return runningTotals;
  }, []);
  const totalActivityRegistrations = [
    ...stats.competition_attendance,
    ...stats.attendance_by_event,
  ].reduce((sum, item) => sum + item.registered, 0);
  const totalActivityAttended = [
    ...stats.competition_attendance,
    ...stats.attendance_by_event,
  ].reduce((sum, item) => sum + item.attended, 0);
  const attendanceLeak = Math.max(totalActivityRegistrations - totalActivityAttended, 0);
  const capacityRiskCount = stats.competition_capacity.filter((item) => item.fill_rate >= 80).length;
  const conversionRate = funnelTotal === 0 ? 0 : Math.round((approvedTotal / funnelTotal) * 100);
  const rejectionRate = funnelTotal === 0 ? 0 : Math.round((rejectedTotal / funnelTotal) * 100);

  const funnelData: ChartData<'bar'> = {
    labels: funnelItems.map((item) => item.label),
    datasets: [{
      label: 'Registrations',
      data: funnelItems.map((item) => item.total),
      backgroundColor: [chartPalette.amber, chartPalette.green, chartPalette.blue, chartPalette.red, chartPalette.purple],
      borderRadius: 8,
    }],
  };

  const trendData: ChartData<'line'> = {
    labels: stats.registrations_over_time.map((item) => formatShortDate(item.registration_date)),
    datasets: [
      {
        label: 'Daily signups',
        data: stats.registrations_over_time.map((item) => item.total),
        borderColor: chartPalette.green,
        backgroundColor: 'rgba(50, 215, 75, 0.16)',
        pointBackgroundColor: chartPalette.green,
        pointBorderColor: '#121212',
        pointRadius: 5,
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Cumulative signups',
        data: cumulativeTrend,
        borderColor: chartPalette.cyan,
        backgroundColor: 'rgba(0, 229, 255, 0.08)',
        pointBackgroundColor: chartPalette.cyan,
        pointBorderColor: '#121212',
        pointRadius: 4,
        tension: 0.24,
        fill: false,
      },
    ],
  };

  const capacityData: ChartData<'bar'> = {
    labels: stats.competition_capacity.slice(0, 8).map((item) => item.title),
    datasets: [
      {
        label: 'Capacity',
        data: stats.competition_capacity.slice(0, 8).map((item) => item.capacity),
        backgroundColor: 'rgba(0, 229, 255, 0.22)',
        borderColor: chartPalette.cyan,
        borderWidth: 1,
      },
      {
        label: 'Signup requests',
        data: stats.competition_capacity.slice(0, 8).map((item) => item.demand),
        backgroundColor: 'rgba(50, 215, 75, 0.78)',
        borderColor: chartPalette.green,
        borderWidth: 1,
      },
    ],
  };

  const categoryData: ChartData<'bar'> = {
    labels: stats.category_demand.slice(0, 8).map((item) => item.category_name),
    datasets: [
      {
        label: 'Confirmed',
        data: stats.category_demand.slice(0, 8).map((item) => item.confirmed),
        backgroundColor: chartPalette.green,
      },
      {
        label: 'Pending approval',
        data: stats.category_demand.slice(0, 8).map((item) => item.pending),
        backgroundColor: chartPalette.amber,
      },
    ],
  };

  const attendanceData: ChartData<'bar'> = {
    labels: activityAttendance.map((item) => item.title),
    datasets: [{
      label: 'Attendance rate',
      data: activityAttendance.map((item) => item.attendance_rate),
      backgroundColor: activityAttendance.map((item) => item.attendance_rate < 60 ? chartPalette.red : chartPalette.cyan),
      borderRadius: 8,
    }],
  };

  const venueData: ChartData<'bubble'> = {
    datasets: stats.venue_utilization.map((item) => ({
      label: item.venue_name,
      data: [{
        x: item.competition_count,
        y: item.total_demand,
        r: Math.max(8, Math.min(30, item.total_capacity || 8)),
      }],
      backgroundColor: 'rgba(0, 229, 255, 0.34)',
      borderColor: chartPalette.cyan,
      borderWidth: 2,
    })),
  };

  const eventPopularityData: ChartData<'bar'> = {
    labels: stats.event_popularity.slice(0, 8).map((item) => item.title),
    datasets: [
      {
        label: 'Approved',
        data: stats.event_popularity.slice(0, 8).map((item) => item.registered),
        backgroundColor: chartPalette.cyan,
      },
      {
        label: 'Pending approval',
        data: stats.event_popularity.slice(0, 8).map((item) => item.pending),
        backgroundColor: chartPalette.amber,
      },
      {
        label: 'Attended',
        data: stats.event_popularity.slice(0, 8).map((item) => item.attended),
        backgroundColor: chartPalette.green,
      },
    ],
  };

  return (
    <section className="grid gap-4" aria-label="Tournament analytics">
      <div className="grid items-start gap-5 rounded-2xl border border-app-border bg-[radial-gradient(circle_at_78%_18%,rgba(0,229,255,0.22),transparent_28%),linear-gradient(135deg,#1e1e1e,#121212)] p-6 shadow-panel xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-app-cyan">Deep analytics</p>
          <h2 className="m-0 text-3xl font-black tracking-normal text-white md:text-5xl">Competition Intelligence</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-app-muted">
            Signup requests, approval workload, attendance leakage and capacity pressure are aggregated directly from the event and competition tables.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Insight label="Demand Leader" value={topCompetition?.title || 'No data'} detail={`${topCompetition?.fill_rate || 0}% fill rate`} />
          <Insight label="Hot Category" value={topCategory?.category_name || 'No data'} detail={`${topCategory?.demand || 0} requests`} />
          <Insight label="Main Venue" value={topVenue?.venue_name || 'No data'} detail={`${topVenue?.total_demand || 0} total demand`} />
          <Insight label="Approval Rate" value={`${stats.competition_approval_rate || 0}%`} detail={`${stats.pending_competition_registrations || 0} pending requests`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SignalCard label="Signup Conversion" value={`${conversionRate}%`} detail={`${approvedTotal}/${funnelTotal} requests approved`} tone={conversionRate >= 70 ? 'good' : 'warn'} />
        <SignalCard label="Approval Workload" value={pendingTotal} detail="requests waiting for action" tone={pendingTotal > 0 ? 'warn' : 'good'} />
        <SignalCard label="Attendance Leakage" value={attendanceLeak} detail="approved signups not present" tone={attendanceLeak > 0 ? 'danger' : 'good'} />
        <SignalCard label="Capacity Risk" value={capacityRiskCount} detail="competitions above 80% fill" tone={capacityRiskCount > 0 ? 'warn' : 'good'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-12">
          <ChartHeader title="Registration Trend" subtitle="Daily signups plus cumulative growth. Use this to spot campaign spikes, deadline rushes, and quiet periods." />
          <div className="h-[360px]">
            <Line data={trendData} options={lineOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Registration Funnel" subtitle="Request outcome for visible workflows: pending approval, approved, and rejected." />
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_190px]">
            <div className="h-[300px]">
              <Bar data={funnelData} options={horizontalBarOptions} />
            </div>
            <div className="grid gap-3">
              <Insight label="Conversion" value={`${conversionRate}%`} detail="approved out of all requests" />
              <Insight label="Queue" value={String(pendingTotal)} detail="still awaiting review" />
              <Insight label="Rejected" value={`${rejectionRate}%`} detail="rejection rate" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-8">
          <ChartHeader title="Capacity Pressure" subtitle="Signup requests vs available seats. Requests include approved and pending competition registrations." />
          <div className="h-[420px]">
            <Bar data={capacityData} options={barOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-7">
          <ChartHeader title="Category Demand" subtitle="Approved and pending approval signups by division." />
          <div className="h-[360px]">
            <Bar data={categoryData} options={stackedBarOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-5">
          <ChartHeader title="Attendance Quality" subtitle="Low bars identify activities needing follow-up." />
          <div className="h-[360px]">
            <Bar data={attendanceData} options={percentBarOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-5">
          <ChartHeader title="Venue Pressure Map" subtitle="X: activity count, Y: demand, bubble: capacity." />
          <div className="h-[420px]">
            <Bubble data={venueData} options={bubbleOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-7">
          <ChartHeader title="Event Popularity" subtitle="Approved signups, pending approval requests, and actual turnout." />
          <div className="h-[420px]">
            <Bar data={eventPopularityData} options={barOptions} />
          </div>
        </div>
      </div>
    </section>
  );
};

const SignalCard = ({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone: 'good' | 'warn' | 'danger';
}) => (
  <article className={[
    'rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel',
    tone === 'good' ? 'border-l-4 border-l-app-green' : '',
    tone === 'warn' ? 'border-l-4 border-l-app-amber' : '',
    tone === 'danger' ? 'border-l-4 border-l-app-red' : '',
  ].join(' ')}>
    <span className="block text-[0.82rem] font-extrabold text-app-muted">{label}</span>
    <strong className="mt-2 block font-mono text-3xl font-black text-white">{value}</strong>
    <small className="mt-1 block text-[0.82rem] font-extrabold text-app-muted">{detail}</small>
  </article>
);

const Insight = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <article className="rounded-2xl border border-app-border bg-app-surfaceSoft p-4">
    <span className="block text-[0.78rem] font-extrabold uppercase tracking-wide text-app-muted">{label}</span>
    <strong className="mt-2 block truncate text-base font-black text-app-cyan" title={value}>{value}</strong>
    <small className="mt-1 block text-[0.78rem] font-bold text-app-muted">{detail}</small>
  </article>
);

const ChartHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
    <h3 className="m-0 text-base font-black text-app-cyan">{title}</h3>
    <span className="max-w-xl text-left text-[0.82rem] font-extrabold leading-5 text-app-muted md:text-right">{subtitle}</span>
  </div>
);

const chartTextPlugin = {
  legend: {
    labels: {
      color: chartPalette.muted,
      boxWidth: 10,
      usePointStyle: true,
    },
  },
  tooltip: {
    backgroundColor: '#1e1e1e',
    borderColor: chartPalette.grid,
    borderWidth: 1,
    titleColor: chartPalette.text,
    bodyColor: chartPalette.text,
  },
};

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: chartTextPlugin,
  scales: {
    x: { ticks: { color: chartPalette.muted }, grid: { color: chartPalette.grid } },
    y: { beginAtZero: true, ticks: { color: chartPalette.muted, precision: 0 }, grid: { color: chartPalette.grid } },
  },
};

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: chartTextPlugin,
  scales: {
    x: { ticks: { color: chartPalette.muted }, grid: { color: chartPalette.grid } },
    y: { beginAtZero: true, ticks: { color: chartPalette.muted, precision: 0 }, grid: { color: chartPalette.grid } },
  },
};

const stackedBarOptions: ChartOptions<'bar'> = {
  ...barOptions,
  scales: {
    x: { stacked: true, ticks: { color: chartPalette.muted }, grid: { color: chartPalette.grid } },
    y: { stacked: true, beginAtZero: true, ticks: { color: chartPalette.muted, precision: 0 }, grid: { color: chartPalette.grid } },
  },
};

const percentBarOptions: ChartOptions<'bar'> = {
  ...barOptions,
  scales: {
    x: { ticks: { color: chartPalette.muted }, grid: { color: chartPalette.grid } },
    y: { beginAtZero: true, max: 100, ticks: { color: chartPalette.muted, callback: (value) => `${value}%` }, grid: { color: chartPalette.grid } },
  },
};

const bubbleOptions: ChartOptions<'bubble'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: chartTextPlugin,
  scales: {
    x: { beginAtZero: true, title: { display: true, text: 'Activities', color: chartPalette.muted }, ticks: { color: chartPalette.muted, precision: 0 }, grid: { color: chartPalette.grid } },
    y: { beginAtZero: true, title: { display: true, text: 'Demand', color: chartPalette.muted }, ticks: { color: chartPalette.muted, precision: 0 }, grid: { color: chartPalette.grid } },
  },
};

const horizontalBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: chartTextPlugin,
  scales: {
    x: { beginAtZero: true, ticks: { color: chartPalette.muted, precision: 0 }, grid: { color: chartPalette.grid } },
    y: { ticks: { color: chartPalette.muted }, grid: { color: chartPalette.grid } },
  },
};

const EventsPanel = ({
  events,
  canCreateEvents,
  onChanged,
}: {
  events: EventItem[];
  canCreateEvents: boolean;
  onChanged: (message: string) => void;
}) => {
  const [editingEvent, setEditingEvent] = React.useState<EventItem | null>(null);

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
        {events.map((eventItem) => {
          const activeSignups = eventItem.active_signups ?? eventItem.registered + eventItem.pending_requests;
          const fillRate = eventItem.capacity === 0 ? 0 : Math.round((activeSignups / eventItem.capacity) * 100);
          const attendanceRate = eventItem.registered === 0 ? 0 : Math.round((eventItem.attended / eventItem.registered) * 100);
          const ownStatus = eventItem.current_user_registration_status;
          const canRegister = !ownStatus && eventItem.status === 'Open' && activeSignups < eventItem.capacity;
          return (
            <article className="event-card" key={eventItem.id}>
              <div>
                <span className="status-pill">{eventItem.status}</span>
                <h3>{eventItem.title}</h3>
                <p>{eventItem.description || 'No description added yet.'}</p>
              </div>
              <dl className="detail-grid compact-details">
                <div><dt>Date</dt><dd>{formatDate(eventItem.event_date)}</dd></div>
                <div><dt>Venue</dt><dd>{eventItem.venue}</dd></div>
                <div><dt>Signups</dt><dd>{activeSignups}/{eventItem.capacity} ({fillRate}%)</dd></div>
                <div><dt>Attendance</dt><dd>{eventItem.attended}/{eventItem.registered} ({attendanceRate}%)</dd></div>
              </dl>
              <div className="event-actions">
                <button type="button" className="secondary-action compact" disabled={!canRegister} onClick={() => registerForEvent(eventItem)}>
                  {ownStatus || (activeSignups >= eventItem.capacity ? 'Full' : 'Register')}
                </button>
                {canCreateEvents && (
                  <button type="button" className="secondary-action compact" onClick={() => setEditingEvent(eventItem)}>
                    Edit
                  </button>
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
        })}
        {events.length === 0 && <p className="empty-state">No events have been created yet.</p>}
      </div>
      {canCreateEvents && editingEvent && (
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

const MyEventsPanel = ({ activities }: { activities: MyActivity[] }) => (
  <section className="panel large-panel">
    <div className="panel-heading">
      <div>
        <p className="eyebrow">Registered activities</p>
        <h2>Upcoming Registered Events</h2>
      </div>
      <NavLink to="/events" className="secondary-action compact">Browse Events</NavLink>
    </div>
    <div className="event-grid">
      {activities.map((activity) => (
        <article className="event-card" key={`${activity.activity_type}-${activity.activity_id}-${activity.title}`}>
          <div>
            <span className="status-pill">{activity.status}</span>
            <h3>{activity.title}</h3>
            <p>{activity.description || 'No description added yet.'}</p>
          </div>
          <dl className="detail-grid compact-details">
            <div><dt>Type</dt><dd>{activity.activity_type}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(activity.activity_date)}</dd></div>
            <div><dt>Venue</dt><dd>{activity.venue || '-'}</dd></div>
            <div><dt>Attendance</dt><dd>{activity.attended ? 'Present' : 'Not marked'}</dd></div>
            {activity.category_name && <div><dt>Category</dt><dd>{activity.category_name}</dd></div>}
          </dl>
        </article>
      ))}
      {activities.length === 0 && (
        <p className="empty-state">You have no upcoming registered events or competitions.</p>
      )}
    </div>
  </section>
);

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

const ConfirmDeleteDialog = ({
  open,
  title,
  detail,
  reason,
  confirmLabel = 'Delete',
  requireReason = true,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  detail: string;
  reason: string;
  confirmLabel?: string;
  requireReason?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="confirm-dialog" role="dialog" aria-modal="true">
        <p className="eyebrow">Confirm delete</p>
        <h3>{title}</h3>
        <p>{detail}</p>
        <div className="delete-reason-preview">
          <span>{requireReason ? 'Reason' : 'Reason optional'}</span>
          <strong>{reason || (requireReason ? 'No reason written yet' : 'Draft has not been published yet')}</strong>
          {requireReason && !reason.trim() && (
            <small>Write a reason before deleting because members may be affected.</small>
          )}
        </div>
        <div className="row-actions">
          <button type="button" className="secondary-action compact" onClick={onClose}>Cancel</button>
          <button type="button" className="danger-action compact" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div className="edit-modal-backdrop" role="presentation">
    <div className="edit-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="edit-modal-head">
        <div>
          <p className="eyebrow">Manage activity</p>
          <h3>{title}</h3>
        </div>
        <button type="button" className="secondary-action compact" onClick={onClose}>Close</button>
      </div>
      {children}
    </div>
  </div>
);

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
    const response = await apiClient.put<{ message: string; notification?: NotificationResult }>(`/events/${eventItem.id}`, {
      title: form.title,
      description: form.description,
      eventDate: form.eventDate,
      venue: form.venue,
      capacity: Number(form.capacity),
      status: form.status,
      requiresApproval: form.requiresApproval,
      reason: form.reason,
    });
    await onChanged(`${response.data.message}. ${notificationText(response.data.notification)}`);
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
        <textarea value={form.reason} required onChange={(event) => setForm({ ...form, reason: event.target.value })} />
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
      venue: form.venue,
      capacity: Number(form.capacity),
      requiresApproval: form.requiresApproval,
      status: 'Draft',
    });
    setForm({ ...form, title: '', description: '' });
    await onCreated('Event saved as draft. Publish it when you are ready for members to register.');
  };

  return (
    <form className="event-create-form" onSubmit={submit}>
      <div className="form-grid">
        <FormInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
        <DatePickerField label="Date" value={form.eventDate} onChange={(eventDate) => setForm({ ...form, eventDate })} required />
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

const CompetitionsPanel = ({
  competitions,
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
  selectedId?: number;
  canCreateEvents: boolean;
  onSelect: (competitionId: number) => void;
  title?: string;
  eyebrow?: string;
  emptyMessage?: string;
  createLabel?: string;
  createTo?: string;
  showDraftLink?: boolean;
}) => (
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
      {competitions.map((competition) => {
        const fillRate = competition.total_capacity === 0 ? 0 : Math.round((competition.registration_count / competition.total_capacity) * 100);
        return (
          <article className={`event-card ${selectedId === competition.id ? 'selected-card' : ''}`} key={competition.id}>
            <div>
              <span className="status-pill">{competition.status}</span>
              <h3>{competition.title}</h3>
              <p>{competition.description || 'No description added yet.'}</p>
            </div>
            <dl className="detail-grid compact-details">
              <div><dt>Date</dt><dd>{formatDate(competition.start_date)}</dd></div>
              <div><dt>Venue</dt><dd>{competition.venue_name || 'Venue pending'}</dd></div>
              <div><dt>Signups</dt><dd>{competition.registration_count}/{competition.total_capacity || 0} ({fillRate}%)</dd></div>
              <div><dt>Pending</dt><dd>{competition.pending_count}</dd></div>
            </dl>
            <div className="event-actions">
              <button type="button" className="secondary-action compact" onClick={() => onSelect(competition.id)}>
                {selectedId === competition.id ? 'Selected' : 'View Details'}
              </button>
            </div>
          </article>
        );
      })}
      {competitions.length === 0 && <p className="empty-state">{emptyMessage}</p>}
    </div>
  </div>
);

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

  React.useEffect(() => {
    setShowManage(false);
  }, [competition?.id]);

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
          <p>{competition.description}</p>
          <dl className="detail-grid">
            <div><dt>Format</dt><dd>{competition.tournament_format || '-'}</dd></div>
            <div><dt>Scoring</dt><dd>{competition.scoring_system || '-'}</dd></div>
            <div><dt>Approval</dt><dd>{competition.requires_approval ? 'Required' : 'Automatic'}</dd></div>
            <div><dt>Signups</dt><dd>{competition.confirmed_signups || 0} confirmed / {competition.pending_signups || 0} pending</dd></div>
            <div><dt>Attendance</dt><dd>{competition.attended_count || 0} present</dd></div>
            <div><dt>Registration Deadline</dt><dd>{competition.registration_deadline ? formatDate(competition.registration_deadline) : '-'}</dd></div>
          </dl>
          {showManage && canCreateEvents && (
            <CompetitionManagementForm
              competition={competition}
              options={options}
              onChanged={onCompetitionChanged}
            />
          )}
          <div className="competition-detail-list">
            <DetailBlock title="Late Policy" text={competition.late_policy} />
            <DetailBlock title="Arbiter / Disputes" text={competition.arbiter_policy} />
            <DetailBlock title="Rules" text={competition.rules_text} />
          </div>
          {canCreateEvents && <CreateCategoryForm competitionId={competition.id} onCreated={onCategoryCreated} />}
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
        <textarea value={form.reason} required onChange={(event) => setForm({ ...form, reason: event.target.value })} />
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

const CreateCategoryForm = ({
  competitionId,
  onCreated,
}: {
  competitionId: number;
  onCreated: (message: string) => void;
}) => {
  const [name, setName] = React.useState('');
  const [capacity, setCapacity] = React.useState('16');
  const [registrationFee, setRegistrationFee] = React.useState('0');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiClient.post(`/competitions/${competitionId}/categories`, {
      name,
      capacity: Number(capacity),
      registrationFee: Number(registrationFee),
    });
    setName('');
    onCreated('Category added.');
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <h3>Add Category</h3>
      <div className="form-grid">
        <FormInput label="Name" value={name} onChange={setName} required />
        <FormInput label="Capacity" type="number" value={capacity} onChange={setCapacity} required />
        <FormInput label="Fee" type="number" value={registrationFee} onChange={setRegistrationFee} />
      </div>
      <button type="submit" className="primary-action compact">Add Category</button>
    </form>
  );
};

const CategoriesPanel = ({
  categories,
  onRegistered,
}: {
  categories: Category[];
  onRegistered: (message: string) => void;
}) => {
  const registerForCategory = async (category: Category) => {
    try {
      const response = await apiClient.post<{ message: string }>(`/competitions/categories/${category.id}/register`);
      onRegistered(response.data.message || `Registration submitted for ${category.name}.`);
    } catch (error) {
      onRegistered(getErrorMessage(error, 'Could not register for this competition.'));
    }
  };
  const existingCompetitionRegistration = categories.find((category) => category.current_user_registration_status);

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Member entry</p>
          <h2>Categories</h2>
        </div>
      </div>
      <div className="category-list">
        {categories.map((category) => (
          <article className="category-item" key={category.id}>
            <div>
              <strong>{category.name}</strong>
              <small>
                Capacity {category.capacity} - Fee ${Number(category.registration_fee).toFixed(2)}
                {category.current_user_registration_status ? ` - ${category.current_user_registration_status}` : ''}
              </small>
            </div>
            <button type="button" className="secondary-action compact" disabled={Boolean(existingCompetitionRegistration)} onClick={() => registerForCategory(category)}>
              {category.current_user_registration_status || (existingCompetitionRegistration ? 'Already Registered' : 'Register')}
            </button>
          </article>
        ))}
        {categories.length === 0 && <p className="empty-state">No categories added yet.</p>}
      </div>
    </div>
  );
};

const PaginationControls = ({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = paginationPages(page, totalPages);

  return (
    <nav className="pagination-row" aria-label="Section pages">
      <button type="button" className="secondary-action compact" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      {visiblePages.map((item, index) => (
        item === 'gap' ? (
          <span key={`gap-${index}`} className="pagination-gap">...</span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? 'secondary-action compact page-button active' : 'secondary-action compact page-button'}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        )
      ))}
      <button type="button" className="secondary-action compact" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </nav>
  );
};

const AttendancePanel = ({
  registrations,
  eventRegistrations,
  canApprove,
  onStatusChanged,
}: {
  registrations: Registration[];
  eventRegistrations: EventRegistration[];
  canApprove: boolean;
  onStatusChanged: (message: string) => void;
}) => {
  const [activityFilter, setActivityFilter] = React.useState('All');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = React.useState('All');
  const [queueFilter, setQueueFilter] = React.useState('All');
  const [queuePage, setQueuePage] = React.useState(1);
  const [attendancePage, setAttendancePage] = React.useState(1);
  const pendingCompetitionRegistrations = registrations.filter((registration) => registration.status === 'Pending Approval');
  const pendingEventRegistrations = eventRegistrations.filter((registration) => registration.status === 'Pending Approval');
  const approvedCompetitionRegistrations = registrations.filter((registration) => registration.status === 'Registered');
  const approvedEventRegistrations = eventRegistrations.filter((registration) => registration.status === 'Registered');
  const activityOptions = Array.from(new Set([
    ...approvedCompetitionRegistrations.map((registration) => `Competition: ${registration.competition_title}`),
    ...approvedEventRegistrations.map((registration) => `Event: ${registration.event_title}`),
  ])).sort();
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
    const matchesAttendance = attendanceStatusFilter === 'All'
      || (attendanceStatusFilter === 'Present' && registration.attended)
      || (attendanceStatusFilter === 'Absent' && !registration.attended);
    return matchesActivity && matchesAttendance;
  });
  const filteredEventAttendance = approvedEventRegistrations.filter((registration) => {
    const matchesActivity = activityFilter === 'All' || activityFilter === `Event: ${registration.event_title}`;
    const matchesAttendance = attendanceStatusFilter === 'All'
      || (attendanceStatusFilter === 'Present' && registration.attended)
      || (attendanceStatusFilter === 'Absent' && !registration.attended);
    return matchesActivity && matchesAttendance;
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
      attended: registration.attended,
    })),
    ...filteredEventAttendance.map((registration) => ({
      key: `attendance-event-${registration.id}`,
      type: 'Event' as const,
      id: registration.id,
      name: registration.member_name,
      detail: registration.event_title,
      attended: registration.attended,
    })),
  ];
  const queueSlice = paginate(queueRows, queuePage, 8);
  const attendanceSlice = paginate(attendanceRows, attendancePage, 10);

  React.useEffect(() => {
    setQueuePage(1);
  }, [queueFilter]);

  React.useEffect(() => {
    setAttendancePage(1);
  }, [activityFilter, attendanceStatusFilter]);

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

  return (
    <div id="registrations" className="panel large-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Pending approvals</p>
          <h2>Registration Queue</h2>
        </div>
        <NavLink to="/members" className="secondary-action compact">
          Manage Members
        </NavLink>
      </div>
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
            <h2>Approved Signups</h2>
          </div>
        </div>
        <div className="attendance-filter-row">
          <label className="form-field attendance-filter">
            <span>Activity Filter</span>
            <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
              <option value="All">All activities</option>
              {activityOptions.map((activity) => (
                <option key={activity} value={activity}>{activity}</option>
              ))}
            </select>
          </label>
          <label className="form-field attendance-filter">
            <span>Attendance Filter</span>
            <select value={attendanceStatusFilter} onChange={(event) => setAttendanceStatusFilter(event.target.value)}>
              <option value="All">All attendance</option>
              <option value="Present">Present only</option>
              <option value="Absent">Absent only</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Participant</th>
                <th>Activity</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {attendanceSlice.items.map((registration) => (
                <tr key={registration.key}>
                  <td>{registration.type}</td>
                  <td>{registration.name}</td>
                  <td>{registration.detail}</td>
                  <td>
                    <label className="check-row table-check">
                      <input
                        type="checkbox"
                        checked={registration.attended}
                        onChange={(event) => {
                          if (registration.type === 'Competition') {
                            updateCompetitionAttendance(registration.id, event.target.checked);
                          } else {
                            updateEventAttendance(registration.id, event.target.checked);
                          }
                        }}
                      />
                      Present
                    </label>
                  </td>
                </tr>
              ))}
              {attendanceRows.length === 0 && (
                <tr><td colSpan={4}>No approved signups match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls page={attendancePage} totalPages={attendanceSlice.totalPages} onPageChange={setAttendancePage} />
      </div>
    </div>
  );
};

const MemberParticipationPanel = ({
  registrations,
  eventRegistrations,
  canApprove,
  canDelete,
  onChanged,
}: {
  registrations: Registration[];
  eventRegistrations: EventRegistration[];
  canApprove: boolean;
  canDelete: boolean;
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
    const activities = memberRows.flatMap((member) => member.items.map((item) => `${item.type}: ${item.title}`));
    return Array.from(new Set(activities)).sort();
  }, [memberRows]);

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
            <option value="All">All events and competitions</option>
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
                      <label className="check-row table-check">
                        <input
                          type="checkbox"
                          checked={item.attended}
                          onChange={(event) => {
                            if (item.type === 'Competition') {
                              updateCompetitionAttendance(item.id, event.target.checked);
                            } else {
                              updateEventAttendance(item.id, event.target.checked);
                            }
                          }}
                        />
                        Present
                      </label>
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
        <PermissionCard role="Vice-Captain" permissions="Events, competitions, approvals, attendance" />
        <PermissionCard role="Secretary" permissions="Approvals and attendance" />
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

const SettingsPanel = ({
  currentUser,
  settings,
  canManageDefaults,
  onProfileUpdated,
  onSettingsUpdated,
  onMessage,
  onDeactivate,
}: {
  currentUser: CurrentUser | null;
  settings: UserSettings;
  canManageDefaults: boolean;
  onProfileUpdated: (user: CurrentUser, message: string) => void;
  onSettingsUpdated: (settings: UserSettings, message: string) => void;
  onMessage: (message: string) => void;
  onDeactivate: () => void;
}) => {
  const [profileForm, setProfileForm] = React.useState({
    name: currentUser?.name || '',
    username: currentUser?.username || '',
  });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [settingsForm, setSettingsForm] = React.useState<UserSettings>(settings);

  React.useEffect(() => {
    setProfileForm({
      name: currentUser?.name || '',
      username: currentUser?.username || '',
    });
  }, [currentUser?.name, currentUser?.username]);

  React.useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await apiClient.put<CurrentUser>('/users/me/profile', profileForm);
    onProfileUpdated(response.data, 'Profile updated.');
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      onMessage('New password and confirmation do not match.');
      return;
    }

    await apiClient.put('/users/me/password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    onMessage('Password updated.');
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await apiClient.put<UserSettings>('/users/me/settings', settingsForm);
    onSettingsUpdated(response.data, 'Settings saved.');
  };

  const resendVerification = async () => {
    const response = await apiClient.post<{ message: string; verificationLink?: string }>('/users/me/resend-verification');
    onMessage(response.data.verificationLink ? `${response.data.message}: ${response.data.verificationLink}` : response.data.message);
  };

  return (
    <section id="settings" className="settings-page">
      <div className="settings-grid">
        <form className="panel settings-panel" onSubmit={saveProfile}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Account Details</h2>
            </div>
          </div>
          <div className="form-grid">
            <FormInput label="Name" value={profileForm.name} onChange={(name) => setProfileForm({ ...profileForm, name })} required />
            <FormInput label="Username" value={profileForm.username} onChange={(username) => setProfileForm({ ...profileForm, username })} required />
          </div>
          <div className="settings-readonly-grid">
            <ReadonlySetting label="Email" value={currentUser?.email || '-'} />
            <ReadonlySetting label="Role" value={currentUser?.role || '-'} />
            <ReadonlySetting label="Status" value={currentUser?.status || 'Active'} />
            <ReadonlySetting label="Provider" value={currentUser?.authProvider || 'local'} />
          </div>
          <button type="submit" className="primary-action compact">Save Profile</button>
        </form>

        <form className="panel settings-panel" onSubmit={changePassword}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Security</p>
              <h2>Password & Verification</h2>
            </div>
          </div>
          <div className="settings-row">
            <span>
              <strong>Email verification</strong>
              <small>{currentUser?.emailVerified ? 'Your email is verified.' : 'Verify your email before relying on account recovery.'}</small>
            </span>
            <button type="button" className="secondary-action compact" onClick={resendVerification} disabled={currentUser?.emailVerified}>
              Resend Email
            </button>
          </div>
          <div className="form-grid">
            <FormInput label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(currentPassword) => setPasswordForm({ ...passwordForm, currentPassword })} required />
            <FormInput label="New Password" type="password" value={passwordForm.newPassword} onChange={(newPassword) => setPasswordForm({ ...passwordForm, newPassword })} required />
            <FormInput label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={(confirmPassword) => setPasswordForm({ ...passwordForm, confirmPassword })} required />
          </div>
          <button type="submit" className="primary-action compact">Change Password</button>
        </form>

        <form className="panel settings-panel" onSubmit={saveSettings}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Notifications</p>
              <h2>Preferences</h2>
            </div>
          </div>
          <div className="settings-toggle-list">
            <ToggleSetting label="Registration updates" detail="Email me when my registration is approved or rejected." checked={settingsForm.notifyRegistrationUpdate} onChange={(value) => setSettingsForm({ ...settingsForm, notifyRegistrationUpdate: value })} />
            <ToggleSetting label="Event reminders" detail="Email me before upcoming events or competitions." checked={settingsForm.notifyEventReminder} onChange={(value) => setSettingsForm({ ...settingsForm, notifyEventReminder: value })} />
            <ToggleSetting label="Attendance updates" detail="Email me when attendance is marked for my account." checked={settingsForm.notifyAttendanceMarked} onChange={(value) => setSettingsForm({ ...settingsForm, notifyAttendanceMarked: value })} />
          </div>

          <div className="settings-subsection">
            <p className="eyebrow">Defaults</p>
            <div className="form-grid">
              <FormInput label="Default Event Capacity" type="number" value={String(settingsForm.defaultEventCapacity)} onChange={(defaultEventCapacity) => setSettingsForm({ ...settingsForm, defaultEventCapacity: Number(defaultEventCapacity) || 1 })} required />
              <FormInput label="Default Competition Venue" value={settingsForm.defaultCompetitionVenue} onChange={(defaultCompetitionVenue) => setSettingsForm({ ...settingsForm, defaultCompetitionVenue })} />
            </div>
            <ToggleSetting label="Require approval by default" detail="Use this as your preferred default when creating activities." checked={settingsForm.defaultRequiresApproval} onChange={(value) => setSettingsForm({ ...settingsForm, defaultRequiresApproval: value })} disabled={!canManageDefaults} />
          </div>
          <button type="submit" className="primary-action compact">Save Preferences</button>
        </form>

        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">System</p>
              <h2>Role Permissions</h2>
            </div>
          </div>
          <div className="permission-grid settings-permission-grid">
            <PermissionCard role="Captain" permissions="Users, roles, events, competitions, approvals, attendance" />
            <PermissionCard role="Vice-Captain" permissions="Events, competitions, approvals, attendance" />
            <PermissionCard role="Secretary" permissions="Approvals and attendance" />
            <PermissionCard role="Member" permissions="View events, view competitions, register" />
          </div>
        </section>

        <section className="panel settings-panel danger-zone">
          <div className="settings-row">
            <span>
              <strong>Deactivate account</strong>
              <small>This marks your account inactive and logs you out. Captains can still see the inactive record.</small>
            </span>
            <button type="button" className="danger-action" onClick={onDeactivate}>Deactivate My Account</button>
          </div>
        </section>
      </div>
    </section>
  );
};

const ReadonlySetting = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const ToggleSetting = ({
  label,
  detail,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className={disabled ? 'settings-toggle disabled' : 'settings-toggle'}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    <span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </span>
  </label>
);

const FormInput = ({
  label,
  type = 'text',
  value,
  required = false,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) => (
  <label className="form-field">
    <span>{label}</span>
    <input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const DatePickerField = ({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) => {
  const [open, setOpen] = React.useState(false);
  const today = startOfDay(new Date());
  const selectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = React.useState(selectedDate || today);
  const monthDays = calendarDays(viewDate);
  const quickDates = [
    { label: 'Today', hint: formatWeekday(today), value: toDateValue(today), icon: '□' },
    { label: 'Tomorrow', hint: formatWeekday(addDays(today, 1)), value: toDateValue(addDays(today, 1)), icon: '☼' },
    { label: 'Next week', hint: formatShortDate(addDays(today, 7).toISOString()), value: toDateValue(addDays(today, 7)), icon: '↗' },
    { label: 'Next weekend', hint: formatShortDate(nextWeekend(today).toISOString()), value: toDateValue(nextWeekend(today)), icon: '↻' },
  ];

  const selectDate = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <label className="form-field date-picker-field">
      <span>{label}</span>
      <button type="button" className="date-trigger" onClick={() => setOpen(!open)}>
        {value ? formatDate(value) : 'Select date'}
      </button>
      <input className="sr-only" value={value} required={required} onChange={() => undefined} />
      {open && (
        <div className="date-popover">
          <div className="quick-date-list">
            {quickDates.map((item) => (
              <button key={item.label} type="button" onClick={() => selectDate(item.value)}>
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            ))}
            {!required && (
              <button type="button" onClick={() => selectDate('')}>
                <span>○</span>
                <strong>No Date</strong>
                <small>Clear</small>
              </button>
            )}
          </div>
          <div className="mini-calendar">
            <div className="calendar-head">
              <strong>{new Intl.DateTimeFormat('en-SG', { month: 'short', year: 'numeric' }).format(viewDate)}</strong>
              <span>
                <button type="button" onClick={() => setViewDate(addMonths(viewDate, -1))}>‹</button>
                <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))}>›</button>
              </span>
            </div>
            <div className="calendar-grid weekday-row">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="calendar-grid">
              {monthDays.map((day) => {
                const dayValue = toDateValue(day);
                const isPast = day < today;
                return (
                  <button
                    key={dayValue}
                    type="button"
                    disabled={isPast}
                    className={[
                      day.getMonth() !== viewDate.getMonth() ? 'muted-day' : '',
                      value === dayValue ? 'selected-day' : '',
                      isPast ? 'past-day' : '',
                    ].join(' ')}
                    onClick={() => selectDate(dayValue)}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </label>
  );
};

const FormSelect = ({
  label,
  value,
  options,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  required?: boolean;
  onChange: (value: string) => void;
}) => (
  <label className="form-field">
    <span>{label}</span>
    <select value={value} required={required} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>{option.name}</option>
      ))}
    </select>
  </label>
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

const formatShortDate = (dateValue: string) => {
  if (!dateValue) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateValue));
};

const formatDateTime = (dateValue: string) => {
  if (!dateValue) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
};

const toDateInput = (dateValue: string) => {
  if (!dateValue) {
    return '';
  }

  return new Date(dateValue).toISOString().slice(0, 10);
};

const startOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfDay(nextDate);
};

const addMonths = (date: Date, months: number) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return startOfDay(nextDate);
};

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatWeekday = (date: Date) => new Intl.DateTimeFormat('en-SG', { weekday: 'short' }).format(date);

const formatRank = (rankType?: string | null, rankValue?: number | null) => {
  if (!rankType) {
    return '-';
  }

  if (rankType === 'Unrated') {
    return 'Unrated';
  }

  return rankValue === null || rankValue === undefined ? rankType : `${rankValue} ${rankType}`;
};

const nextWeekend = (date: Date) => {
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  return addDays(date, daysUntilSaturday);
};

const calendarDays = (date: Date) => {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const startDate = addDays(firstOfMonth, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(startDate, index));
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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || fallback;
  }

  return fallback;
};

const paginate = <T,>(items: T[], page: number, pageSize: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
  };
};

const paginationPages = (page: number, totalPages: number): Array<number | 'gap'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1].filter((item) => item >= 1 && item <= totalPages));
  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const output: Array<number | 'gap'> = [];

  sortedPages.forEach((item, index) => {
    if (index > 0 && item - sortedPages[index - 1] > 1) {
      output.push('gap');
    }
    output.push(item);
  });

  return output;
};

const toNumberOrNull = (value: string) => (value ? Number(value) : null);

export default DashboardPage;
