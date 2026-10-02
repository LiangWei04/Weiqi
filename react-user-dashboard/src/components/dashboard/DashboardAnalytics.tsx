import {
  ArcElement,
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
import { Bar, Bubble, Doughnut, Line } from 'react-chartjs-2';
import type { CurrentUser, DashboardStats, MemberStats, NamedTotal } from '../../types/dashboard';
import { Link } from 'react-router-dom';
import { formatDateTime, formatMonth, formatShortDate } from '../../utils/formatters';

const chartPalette = {
  cyan: '#A84466',
  green: '#4C7666',
  red: '#B63E57',
  amber: '#80555D',
  blue: '#4f8cff',
  purple: '#bf5af2',
  grid: '#EADDDD',
  text: '#342D32',
  muted: '#76686F',
};

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const OverviewMetrics = ({
  competitionCount,
  totalRegistrations,
  pendingApprovals,
  eventCount,
  totalAttendance,
  attendanceRate,
  stats,
}: {
  competitionCount: number;
  totalRegistrations: number;
  pendingApprovals: number;
  eventCount: number;
  totalAttendance: number;
  attendanceRate: number;
  stats?: DashboardStats | null;
}) => {
  const totalPending = (stats?.pending_registrations || 0) + (stats?.pending_competition_registrations || 0);
  const totalCapacity = (stats?.open_event_capacity || 0) + (stats?.total_competition_capacity || 0);
  const totalApproved = (stats?.approved_registrations || 0) + (stats?.approved_competition_registrations || 0);
  const capacityUsage = totalCapacity === 0 ? 0 : Math.round((totalApproved / totalCapacity) * 100);

  return (
  <section id="overview" className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8" aria-label="Tournament metrics">
    <MetricCard label="Competitions" value={competitionCount} hint={`${stats?.open_competitions || 0} open, ${stats?.draft_competitions || 0} draft`} />
    <MetricCard label="Events" value={eventCount} hint={`${stats?.open_events || 0} open, ${stats?.upcoming_events || 0} upcoming`} />
    <MetricCard label="Registrations" value={totalRegistrations} hint={`${pendingApprovals} pending approval`} />
    <MetricCard label="Attendance" value={`${attendanceRate}%`} hint={`${totalAttendance} marked present`} />
    <MetricCard label="Members" value={stats?.total_users ?? '-'} hint={`${stats?.active_members || 0} active, ${stats?.inactive_users || 0} inactive`} />
    <MetricCard label="Pending Queue" value={totalPending} hint="event and competition requests" />
    <MetricCard label="Seat Usage" value={`${capacityUsage}%`} hint={`${totalApproved}/${totalCapacity} approved seats`} />
    <MetricCard label="Engagement" value={(stats?.event_comment_count || 0) + (stats?.event_reaction_count || 0)} hint={`${stats?.unread_notification_count || 0} unread notices`} />
  </section>
  );
};

const MemberStatsDashboard = ({
  stats,
  currentUser,
}: {
  stats: MemberStats | null;
  currentUser: CurrentUser | null;
}) => {
  if (!stats) {
    return <section className="activity-panel" role="status">Loading your activity…</section>;
  }

  const isExco = ['Captain', 'Vice-Captain', 'Secretary'].includes(currentUser?.role || '');
  const notMarked = Math.max(stats.approved_registrations - stats.attended_count, 0);
  const trendMax = Math.max(1, ...stats.monthly_activity.map((item) => item.total));

  return (
    <section className="personal-activity" aria-label="My Activity">
      <div className={`activity-summary ${isExco ? '' : 'activity-summary-member'}`}>
        <article className="activity-metric">
          <span>Match win rate</span>
          <strong>{stats.competition_matches_played ? `${stats.competition_win_rate}%` : '—'}</strong>
          <small>{stats.competition_match_wins} wins from {stats.competition_matches_played} decided games</small>
        </article>
        <article className="activity-metric activity-highlight">
          <span>Achievements</span><strong>{stats.top10_count}</strong>
          <small>Top-10 standings · {stats.first_place_count} in first place</small>
        </article>
        {isExco && <article className="activity-metric">
          <span>Managed activities</span><strong>{stats.events_created + stats.competitions_organized}</strong>
          <small>{stats.events_created} events · {stats.competitions_organized} competitions</small>
        </article>}
      </div>

      <div className="activity-grid">
        <section className="activity-panel">
          <header><h2>Recent match history</h2><p>Your latest decided games.</p></header>
          {stats.recent_matches.length ? <div className="activity-table-wrap" tabIndex={0} role="region" aria-label="Recent match results">
            <table className="activity-table">
              <thead><tr><th scope="col">Date</th><th scope="col">Competition</th><th scope="col">Opponent</th><th scope="col">Result</th></tr></thead>
              <tbody>{stats.recent_matches.map((match, index) => <tr key={`${match.competition_title}-${match.round_number}-${match.table_number}-${index}`}>
                <td>{match.completed_at ? formatShortDate(match.completed_at) : '—'}</td>
                <td>{match.competition_title}<small>{match.category_name} · Round {match.round_number}</small></td>
                <td>{match.opponent_name || 'Bye'}</td>
                <td><span className={`activity-badge ${match.outcome === 'Win' ? 'activity-highlight' : ''}`}>{match.outcome}</span></td>
              </tr>)}</tbody>
            </table>
          </div> : <p className="activity-empty">Your first result starts the story. No match results yet.</p>}
        </section>

        <section className="activity-panel">
          <header><h2>Achievement records</h2><p>Latest saved standing in each competition category.</p></header>
          <div className="activity-achievements">{stats.competition_achievements.map((achievement) => <article key={`${achievement.competition_title}-${achievement.category_name}`}>
            <span className={`activity-badge ${achievement.rank_position === 1 ? 'activity-highlight' : ''}`}>#{achievement.rank_position}</span>
            <div><h3>{achievement.competition_title}</h3><p>{achievement.category_name} · Round {achievement.round_number}</p></div>
          </article>)}</div>
          {!stats.competition_achievements.length && <p className="activity-empty">No standings recorded yet. Play a tournament to get started.</p>}
        </section>

        <section className="activity-panel">
          <header><h2>Participation trend</h2><p>Monthly registrations · Events and competitions combined</p></header>
          {stats.monthly_activity.length ? <div className="activity-trend" role="list" aria-label="Monthly registration counts">
            {stats.monthly_activity.map((item) => <div className="activity-trend-column" role="listitem" key={item.month} aria-label={`${formatMonth(item.month)}: ${item.total} registrations`}>
              <div className="activity-trend-track"><div className="activity-trend-bar" style={{height: `${item.total / trendMax * 85}%`}}><span>{item.total}</span></div></div>
              <small>{formatMonth(item.month)}</small>
            </div>)}
          </div> : <p className="activity-empty">Your registration trend will appear after you join an activity.</p>}
        </section>

        <section className="activity-panel activity-attendance">
          <header><h2>Attendance</h2><p>Recorded check-ins across your approved activities.</p></header>
          <div className="activity-attendance-value"><strong>{stats.approved_registrations ? `${stats.attendance_rate}%` : '—'}</strong><span><b>{stats.attended_count} of {stats.approved_registrations}</b><small>marked present</small></span></div>
          <progress aria-label="Attendance rate" max={100} value={stats.attendance_rate} />
          <div className="activity-attendance-key"><span>{stats.attended_count} present</span><span>{notMarked} not marked</span></div>
          <p className="activity-note">Not marked may include upcoming activities.</p>
          <Link to="/my-events" className="activity-link">Review attendance →</Link>
        </section>
      </div>

      <section className="activity-panel">
        <header><h2>Upcoming for me</h2><p>Your next chances to play. Check each registration’s status below.</p></header>
        <div className="activity-upcoming">{stats.upcoming_activities.map((activity, index) => {
          const date = new Date(activity.activity_date);
          return <article key={`${activity.activity_type}-${activity.title}-${index}`}>
            <time dateTime={activity.activity_date} className="activity-date activity-highlight"><strong>{date.toLocaleDateString('en-SG', { day: '2-digit' })}</strong><span>{date.toLocaleDateString('en-SG', { month: 'short' })}</span></time>
            <div><h3>{activity.title}</h3><p>{formatDateTime(activity.activity_date)} · {activity.venue || 'Venue to be confirmed'}</p><p>{activity.activity_type}{activity.detail ? ` · ${activity.detail}` : ''} · {activity.status}</p><Link className="activity-link" to="/my-events">View my activities →</Link></div>
          </article>;
        })}</div>
        {!stats.upcoming_activities.length && <p className="activity-empty">Nothing coming up yet. <Link className="activity-link" to="/events">Explore club events →</Link></p>}
      </section>
    </section>
  );
};


const MetricCard = ({ label, value, hint }: { label: string; value: number | string; hint: string }) => (
  <article className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel">
    <span className="block text-[0.82rem] font-semibold text-app-muted">{label}</span>
    <strong className="mt-2 block font-mono text-3xl font-bold text-app-cyan">{value}</strong>
    <small className="mt-1 block text-[0.82rem] font-bold text-app-muted">{hint}</small>
  </article>
);
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
    <span className="block text-[0.82rem] font-semibold text-app-muted">{label}</span>
    <strong className="mt-2 block font-mono text-3xl font-bold text-app-text">{value}</strong>
    <small className="mt-1 block text-[0.82rem] font-semibold text-app-muted">{detail}</small>
  </article>
);

const Insight = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <article className="rounded-2xl border border-app-border bg-app-surfaceSoft p-4">
    <span className="block text-[0.78rem] font-semibold uppercase tracking-wide text-app-muted">{label}</span>
    <strong className="mt-2 block truncate text-base font-bold text-app-cyan" title={value}>{value}</strong>
    <small className="mt-1 block text-[0.78rem] font-bold text-app-muted">{detail}</small>
  </article>
);

const ChartHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
    <h3 className="m-0 text-base font-bold text-app-cyan">{title}</h3>
    <span className="max-w-xl text-left text-[0.82rem] font-semibold leading-5 text-app-muted md:text-right">{subtitle}</span>
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
    backgroundColor: '#342D32',
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

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: chartTextPlugin,
};

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
  const totalActivityCount = stats.total_events + stats.total_competitions;
  const openActivityCount = stats.open_events + stats.open_competitions + stats.in_progress_competitions;
  const draftActivityCount = stats.draft_events + stats.draft_competitions;
  const archivedActivityCount = stats.archived_events + stats.archived_competitions;
  const totalPendingQueue = stats.pending_registrations + stats.pending_competition_registrations;
  const totalRejectedQueue = stats.rejected_registrations + stats.rejected_competition_registrations;
  const totalApprovedQueue = stats.approved_registrations + stats.approved_competition_registrations;
  const totalSeatCapacity = stats.open_event_capacity + stats.total_competition_capacity;
  const overallSeatUsage = totalSeatCapacity === 0 ? 0 : Math.round((totalApprovedQueue / totalSeatCapacity) * 100);
  const matchCompletionRate = stats.total_competition_matches === 0
    ? 0
    : Math.round((stats.completed_competition_matches / stats.total_competition_matches) * 100);
  const engagementCount = stats.event_comment_count + stats.event_reaction_count;
  const engagementPerOpenEvent = stats.open_events === 0 ? 0 : Math.round(engagementCount / stats.open_events);
  const approvalLoadRate = (stats.pending_registrations + stats.pending_competition_registrations) === 0
    ? 0
    : Math.round((stats.pending_competition_registrations / totalPendingQueue) * 100);

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
        pointBorderColor: '#FCF8F8',
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
        pointBorderColor: '#FCF8F8',
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
  const roleItems = stats.role_breakdown.length > 0
    ? stats.role_breakdown
    : [{ role: 'No members', total: 0 } as NamedTotal];
  const roleData: ChartData<'doughnut'> = {
    labels: roleItems.map((item) => item.role || item.name || 'Unknown'),
    datasets: [{
      data: roleItems.map((item) => item.total),
      backgroundColor: [chartPalette.cyan, chartPalette.green, chartPalette.amber, chartPalette.blue, chartPalette.purple, chartPalette.red],
      borderColor: '#342D32',
      borderWidth: 2,
    }],
  };
  const workflowData: ChartData<'bar'> = {
    labels: ['Open', 'Draft', 'Archived', 'Cancelled'],
    datasets: [
      {
        label: 'Events',
        data: [stats.open_events, stats.draft_events, stats.archived_events, stats.cancelled_events],
        backgroundColor: chartPalette.cyan,
        borderRadius: 8,
      },
      {
        label: 'Competitions',
        data: [stats.open_competitions + stats.in_progress_competitions, stats.draft_competitions, stats.archived_competitions, stats.cancelled_competitions],
        backgroundColor: chartPalette.green,
        borderRadius: 8,
      },
    ],
  };

  return (
    <section className="grid gap-4" aria-label="Tournament analytics">
      <div className="grid items-start gap-5 rounded-2xl border border-app-border bg-[radial-gradient(circle_at_78%_18%,rgba(0,229,255,0.22),transparent_28%),linear-gradient(135deg,#342D32,#FCF8F8)] p-6 shadow-panel xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-app-cyan">Deep analytics</p>
          <h2 className="m-0 text-3xl font-bold tracking-normal text-app-text md:text-5xl">Competition Intelligence</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-app-muted">
            Signup requests, approval workload, attendance leakage and capacity pressure are aggregated directly from the event and competition tables.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Insight label="Demand Leader" value={topCompetition?.title || 'No data'} detail={`${topCompetition?.fill_rate || 0}% fill rate`} />
          <Insight label="Hot Category" value={topCategory?.category_name || 'No data'} detail={`${topCategory?.demand || 0} requests`} />
          <Insight label="Main Venue" value={topVenue?.venue_name || 'No data'} detail={`${topVenue?.total_demand || 0} total demand`} />
          <Insight label="Approval Rate" value={`${stats.competition_approval_rate || 0}%`} detail={`${stats.pending_competition_registrations || 0} pending requests`} />
          <Insight label="Verification" value={`${stats.verification_rate || 0}%`} detail={`${stats.unverified_users || 0} unverified account(s)`} />
          <Insight label="Most Popular" value={stats.most_popular_event || 'No event yet'} detail="event by signup count" />
          <Insight label="Matches Done" value={`${matchCompletionRate}%`} detail={`${stats.scheduled_competition_matches} still scheduled`} />
          <Insight label="Ranking Snapshots" value={String(stats.ranking_snapshot_count || 0)} detail="saved standings records" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SignalCard label="Signup Conversion" value={`${conversionRate}%`} detail={`${approvedTotal}/${funnelTotal} requests approved`} tone={conversionRate >= 70 ? 'good' : 'warn'} />
        <SignalCard label="Approval Workload" value={pendingTotal} detail="requests waiting for action" tone={pendingTotal > 0 ? 'warn' : 'good'} />
        <SignalCard label="Attendance Leakage" value={attendanceLeak} detail="approved signups not present" tone={attendanceLeak > 0 ? 'danger' : 'good'} />
        <SignalCard label="Capacity Risk" value={capacityRiskCount} detail="competitions above 80% fill" tone={capacityRiskCount > 0 ? 'warn' : 'good'} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <SignalCard label="Active Members" value={stats.active_members} detail={`${stats.inactive_users} inactive account(s)`} tone={stats.active_members > 0 ? 'good' : 'warn'} />
        <SignalCard label="Open Activities" value={openActivityCount} detail={`${totalActivityCount} total records`} tone={openActivityCount > 0 ? 'good' : 'warn'} />
        <SignalCard label="Drafts" value={draftActivityCount} detail="not visible to members yet" tone={draftActivityCount > 0 ? 'warn' : 'good'} />
        <SignalCard label="Archived" value={archivedActivityCount} detail="past events and competitions" tone="good" />
        <SignalCard label="Total Pending" value={totalPendingQueue} detail={`${approvalLoadRate}% from competitions`} tone={totalPendingQueue > 0 ? 'warn' : 'good'} />
        <SignalCard label="Rejected" value={totalRejectedQueue} detail="closed or declined requests" tone={totalRejectedQueue > 0 ? 'warn' : 'good'} />
        <SignalCard label="Seat Usage" value={`${overallSeatUsage}%`} detail={`${totalApprovedQueue}/${totalSeatCapacity} approved seats`} tone={overallSeatUsage >= 90 ? 'danger' : overallSeatUsage >= 70 ? 'warn' : 'good'} />
        <SignalCard label="Engagement" value={engagementCount} detail={`${engagementPerOpenEvent} per open event`} tone={engagementCount > 0 ? 'good' : 'warn'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Member Role Mix" subtitle="Role distribution helps show whether the system has enough exco coverage." />
          <div className="h-[300px]">
            <Doughnut data={roleData} options={doughnutOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-8">
          <ChartHeader title="Activity Workflow Inventory" subtitle="Current lifecycle state for events and competitions: open, draft, archived and cancelled." />
          <div className="h-[300px]">
            <Bar data={workflowData} options={barOptions} />
          </div>
        </div>

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


export { AnalyticsDashboard, MemberStatsDashboard, OverviewMetrics };
