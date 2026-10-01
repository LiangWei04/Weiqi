import React from 'react';
import { authStorage, demoMode } from '../utils/demo';
import DemoGuide from './demo/DemoGuide';
import DemoOverview from './demo/DemoOverview';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import type {
  AppNotification,
  AttendanceChangeRequest,
  Competition,
  CompetitionDetail,
  CurrentUser,
  DashboardStats,
  DashboardView,
  EventItem,
  EventRegistration,
  ManagedUser,
  MemberStats,
  MyActivity,
  OptionsResponse,
  Registration,
  UserSettings,
} from '../types/dashboard';
import HeaderBar from './layout/HeaderBar';
import Sidebar from './layout/Sidebar';
import AccessNotice from './shared/AccessNotice';
import ConfirmDeleteDialog from './shared/ConfirmDeleteDialog';
import ToastStack from './shared/ToastStack';
import AttendancePanel from './attendance/AttendancePanel';
import MemberParticipationPanel from './attendance/MemberParticipationPanel';
import { CategoriesPanel, CompetitionsPanel, CompetitionDetailPanel, CreateCompetitionPage, DraftsPanel } from './competitions/CompetitionsPanel';
import { AnalyticsDashboard, MemberStatsDashboard, OverviewMetrics } from './dashboard/DashboardAnalytics';
import EventsPanel, { CreateEventPage } from './events/EventsPanel';
import MyEventsPanel from './events/MyEventsPanel';
import NotificationMenu from './notifications/NotificationMenu';
import SettingsPanel from './settings/SettingsPanel';
import UsersPanel from './users/UsersPanel';
import { getApiErrorMessage } from '../utils/apiErrors';

const eventManagerRoles = new Set(['Captain', 'Vice-Captain']);
const attendanceManagerRoles = new Set(['Captain', 'Vice-Captain', 'Secretary']);
const memberManagerRoles = new Set(['Captain', 'Secretary']);

const defaultUserSettings: UserSettings = {
  notifyRegistrationUpdate: true,
  notifyEventReminder: true,
  notifyAttendanceMarked: false,
  defaultRequiresApproval: false,
  defaultEventCapacity: 20,
  defaultCompetitionVenue: '',
};

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
  const [role, setRole] = React.useState(authStorage.getItem('role') || 'Member');
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
  const [attendanceRequests, setAttendanceRequests] = React.useState<AttendanceChangeRequest[]>([]);
  const [myActivities, setMyActivities] = React.useState<MyActivity[]>([]);
  const [options, setOptions] = React.useState<OptionsResponse>({ venues: [], tournament_formats: [], scoring_systems: [] });
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [memberStats, setMemberStats] = React.useState<MemberStats | null>(null);
  const [dashboardTab, setDashboardTab] = React.useState<'club' | 'personal'>('club');
  const [analyticsExpanded, setAnalyticsExpanded] = React.useState(false);
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

  const canCreateEvents = !demoMode && eventManagerRoles.has(role);
  const canManageAttendance = attendanceManagerRoles.has(role);
  const canManageMembers = memberManagerRoles.has(role);
  const canManageUsers = !demoMode && role === 'Captain';
  const publishedEvents = events
    .filter((eventItem) => eventItem.status !== 'Draft' && !eventItem.is_archived)
    .sort(comparePinnedEvents);
  const archivedEvents = events
    .filter((eventItem) => eventItem.status !== 'Draft' && eventItem.is_archived)
    .sort(comparePinnedEvents);
  const draftEvents = events.filter((eventItem) => eventItem.status === 'Draft');
  const publishedCompetitions = competitions.filter((competition) => competition.status !== 'Draft' && !competition.is_archived);
  const archivedCompetitions = competitions.filter((competition) => competition.status !== 'Draft' && competition.is_archived);
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
      const dashboardStatsPromise = canLoadManagementData
        ? Promise.all([
          apiClient.get<DashboardStats>('/dashboard/stats'),
          apiClient.get<MemberStats>('/dashboard/member-stats'),
        ])
        : apiClient.get<MemberStats>('/dashboard/member-stats');
      const settingsResponse = await apiClient.get<UserSettings>('/users/me/settings');
      const [notificationResponse, myActivityResponse] = await Promise.all([
        apiClient.get<AppNotification[]>('/notifications'),
        apiClient.get<MyActivity[]>('/notifications/my-activities'),
      ]);
      const dashboardStatsResponse = await dashboardStatsPromise;

      const nextCompetitions = competitionResponse.data;
      const nextVisibleCompetitions = nextCompetitions.filter((competition) => competition.status !== 'Draft');
      const nextDraftCompetitions = nextCompetitions.filter((competition) => competition.status === 'Draft');

      setCompetitions(nextCompetitions);
      setEvents(eventResponse.data);
      setOptions(optionsResponse.data);
      if (canLoadManagementData) {
        const [clubStatsResponse, personalStatsResponse] = dashboardStatsResponse as [
          { data: DashboardStats },
          { data: MemberStats },
        ];
        setStats(clubStatsResponse.data);
        setMemberStats(personalStatsResponse.data);
      } else {
        setStats(null);
        setMemberStats((dashboardStatsResponse as { data: MemberStats }).data);
      }
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

      if (!demoMode && activeRole === 'Captain') {
        try {
          const userResponse = await apiClient.get<{ users: ManagedUser[] }>('/users?limit=100');
          setUsers(userResponse.data.users);
        } catch (error) {
          console.error('Failed to load users:', error);
          setUsers([]);
        }

      } else {
        setUsers([]);
      }

      if (['Captain', 'Vice-Captain', 'Secretary'].includes(activeRole)) {
        try {
          const attendanceRequestResponse = await apiClient.get<AttendanceChangeRequest[]>('/attendance-requests');
          setAttendanceRequests(attendanceRequestResponse.data);
        } catch (error) {
          console.error('Failed to load attendance requests:', error);
          setAttendanceRequests([]);
        }
      } else {
        setAttendanceRequests([]);
      }

      const selectedCompetitionId = selectedCompetition?.id;
      const selectedStillExists = selectedCompetitionId !== undefined
        && selectedCompetition?.status !== 'Draft'
        && nextVisibleCompetitions.some((competition) => competition.id === selectedCompetitionId);
      if (selectedCompetitionId && selectedStillExists) {
        const detailResponse = await apiClient.get<CompetitionDetail>(`/competitions/${selectedCompetitionId}`);
        setSelectedCompetition(detailResponse.data);
      } else {
        const demoCompetitionId = demoMode ? Number(new URLSearchParams(window.location.search).get('competition')) : 0;
        if (demoCompetitionId && nextVisibleCompetitions.some((item) => item.id === demoCompetitionId)) {
          setSelectedCompetition((await apiClient.get<CompetitionDetail>(`/competitions/${demoCompetitionId}`)).data);
        } else setSelectedCompetition(null);
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
    const token = authStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    apiClient.get<CurrentUser>('/auth/me')
      .then((response) => {
        setCurrentUser(response.data);
        setRole(response.data.role);
        authStorage.setItem('role', response.data.role);
        authStorage.setItem('userId', String(response.data.id));
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
      showToast(getApiErrorMessage(error, 'Could not update notification.'));
    }
  };

  const logout = () => {
    authStorage.removeItem('authToken');
    authStorage.removeItem('userId');
    authStorage.removeItem('role');
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
      <Sidebar canManageAttendance={canManageAttendance} canManageMembers={canManageMembers} canManageUsers={canManageUsers} />
      <section className="min-w-0 p-5 text-white md:p-7">
        {demoMode && <DemoGuide />}
        <HeaderBar
          eyebrow={pageTitles[view].eyebrow}
          title={pageTitles[view].title}
          role={role}
          currentUser={currentUser}
          actions={(
            <>
            <NotificationMenu
              notifications={notifications}
              canAnnounce={!demoMode && canManageAttendance}
              events={events}
              competitions={competitions}
              onRead={markNotificationRead}
              onMessage={reloadWithMessage}
            />
            <button type="button" className="secondary-action compact" onClick={logout}>Logout</button>
            </>
          )}
        />

        <ToastStack toasts={toasts} onClose={dismissToast} />

        {view === 'analytics' && (
          canManageAttendance ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={dashboardTab === 'club' ? 'primary-action compact' : 'secondary-action compact'}
                  onClick={() => setDashboardTab('club')}
                >
                  Club Analytics
                </button>
                <button
                  type="button"
                  className={dashboardTab === 'personal' ? 'primary-action compact' : 'secondary-action compact'}
                  onClick={() => setDashboardTab('personal')}
                >
                  My Activity
                </button>
              </div>
              {dashboardTab === 'club' ? (
                <>
                  {demoMode && !stats && <p role="status">Loading your club records...</p>}
                  {demoMode && stats && <DemoOverview events={events} competitions={competitions} stats={stats} requests={attendanceRequests} />}
                  {!demoMode && <OverviewMetrics
                    competitionCount={competitions.length}
                    totalRegistrations={totalRegistrations}
                    pendingApprovals={pendingApprovals}
                    eventCount={events.length}
                    totalAttendance={totalAttendance}
                    attendanceRate={attendanceRate}
                    stats={stats}
                  />}
                  {stats && (demoMode ? <details className="club-more" onToggle={event => setAnalyticsExpanded(event.currentTarget.open)}><summary>Explore detailed club analytics</summary>{analyticsExpanded && <AnalyticsDashboard stats={stats} />}</details> : <AnalyticsDashboard stats={stats} />)}
                </>
              ) : (
                <MemberStatsDashboard stats={memberStats} currentUser={currentUser} />
              )}
            </>
          ) : (
            <MemberStatsDashboard stats={memberStats} currentUser={currentUser} />
          )
        )}

        {view === 'events' && (
          <EventsPanel
            events={publishedEvents}
            archivedEvents={archivedEvents}
            canCreateEvents={canCreateEvents}
            canModerateComments={canCreateEvents}
            currentUser={currentUser}
            options={options}
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
              options={options}
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
                archivedCompetitions={archivedCompetitions}
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
              attendanceRequests={attendanceRequests}
              canApprove={canManageMembers}
              currentRole={role}
              onStatusChanged={(nextMessage) => reloadWithMessage(nextMessage)}
            />
          ) : (
            <AccessNotice label="Attendance" />
          )
        )}

        {view === 'members' && (
          canManageMembers ? (
            <MemberParticipationPanel
              registrations={registrations}
              eventRegistrations={eventRegistrations}
              canApprove={canManageMembers}
              canDelete={!demoMode && canManageMembers}
              currentRole={role}
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

        {view === 'settings' && demoMode && <AccessNotice label="Account settings are unavailable in the demo" />}
        {view === 'settings' && !demoMode && (
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

const comparePinnedEvents = (left: EventItem, right: EventItem) => {
  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1;
  }

  const leftDate = new Date(left.event_date).getTime();
  const rightDate = new Date(right.event_date).getTime();
  if (leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  return new Date(right.created_at || '').getTime() - new Date(left.created_at || '').getTime();
};

export default DashboardPage;
