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
import type { CurrentUser, DashboardStats, MemberStats } from '../../types/dashboard';
import { formatDate, formatMonth, formatShortDate } from '../../utils/formatters';

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

const MemberStatsDashboard = ({
  stats,
  currentUser,
}: {
  stats: MemberStats | null;
  currentUser: CurrentUser | null;
}) => {
  if (!stats) {
    return (
      <section className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-panel">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-app-cyan">Personal dashboard</p>
        <h2 className="m-0 text-2xl font-black text-white">Loading your activity stats</h2>
      </section>
    );
  }

  const statusItems = stats.status_breakdown.length > 0
    ? stats.status_breakdown
    : [{ status: 'No registrations yet', total: 0 }];
  const typeItems = stats.type_breakdown.length > 0
    ? stats.type_breakdown
    : [{ name: 'No activity yet', total: 0 }];
  const missedApproved = Math.max(stats.approved_registrations - stats.attended_count, 0);
  const trendItems = stats.monthly_activity.length > 0
    ? stats.monthly_activity
    : [{ month: new Date().toISOString(), total: 0 }];
  const statusData: ChartData<'doughnut'> = {
    labels: statusItems.map((item) => item.status || 'Unknown'),
    datasets: [{
      data: statusItems.map((item) => item.total),
      backgroundColor: [chartPalette.green, chartPalette.amber, chartPalette.red, chartPalette.blue, chartPalette.purple],
      borderColor: '#1e1e1e',
      borderWidth: 2,
    }],
  };
  const typeData: ChartData<'bar'> = {
    labels: typeItems.map((item) => item.name || 'Unknown'),
    datasets: [{
      label: 'Registrations',
      data: typeItems.map((item) => item.total),
      backgroundColor: [chartPalette.cyan, chartPalette.green],
      borderRadius: 8,
    }],
  };
  const attendanceData: ChartData<'doughnut'> = {
    labels: ['Present', 'Not marked'],
    datasets: [{
      data: [stats.attended_count, missedApproved],
      backgroundColor: [chartPalette.green, 'rgba(255,255,255,0.12)'],
      borderColor: '#1e1e1e',
      borderWidth: 2,
    }],
  };
  const attendanceByTypeData: ChartData<'bar'> = {
    labels: ['Events', 'Competitions'],
    datasets: [
      {
        label: 'Approved signups',
        data: [stats.approved_event_registrations, stats.approved_competition_registrations],
        backgroundColor: 'rgba(0, 229, 255, 0.28)',
        borderColor: chartPalette.cyan,
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        label: 'Marked present',
        data: [stats.attended_event_count, stats.attended_competition_count],
        backgroundColor: chartPalette.green,
        borderRadius: 8,
      },
    ],
  };
  const trendData: ChartData<'line'> = {
    labels: trendItems.map((item) => formatMonth(item.month)),
    datasets: [{
      label: 'Signups',
      data: trendItems.map((item) => item.total),
      borderColor: chartPalette.cyan,
      backgroundColor: 'rgba(0, 229, 255, 0.14)',
      pointBackgroundColor: chartPalette.cyan,
      pointBorderColor: '#121212',
      pointRadius: 5,
      tension: 0.35,
      fill: true,
    }],
  };
  const resultItems = stats.competition_result_breakdown.filter((item) => item.total > 0);
  const competitionResultData: ChartData<'doughnut'> = {
    labels: resultItems.length > 0 ? resultItems.map((item) => item.status || 'Unknown') : ['No results'],
    datasets: [{
      data: resultItems.length > 0 ? resultItems.map((item) => item.total) : [1],
      backgroundColor: resultItems.length > 0 ? [chartPalette.green, chartPalette.red, chartPalette.blue] : ['rgba(255,255,255,0.12)'],
      borderColor: '#1e1e1e',
      borderWidth: 2,
    }],
  };
  const opponentData: ChartData<'bar'> = {
    labels: stats.opponent_records.slice(0, 6).map((item) => item.opponent_name),
    datasets: [
      {
        label: 'Wins',
        data: stats.opponent_records.slice(0, 6).map((item) => item.wins),
        backgroundColor: chartPalette.green,
        borderRadius: 8,
      },
      {
        label: 'Losses',
        data: stats.opponent_records.slice(0, 6).map((item) => item.losses),
        backgroundColor: chartPalette.red,
        borderRadius: 8,
      },
    ],
  };
  const achievementData: ChartData<'bar'> = {
    labels: ['1st', '2nd', '3rd', 'Top 5', 'Top 10'],
    datasets: [{
      label: 'Finishes',
      data: [
        stats.first_place_count,
        stats.second_place_count,
        stats.third_place_count,
        stats.top5_count,
        stats.top10_count,
      ],
      backgroundColor: [chartPalette.amber, chartPalette.cyan, chartPalette.green, chartPalette.blue, chartPalette.purple],
      borderRadius: 8,
    }],
  };

  return (
    <section className="grid gap-4" aria-label="Member dashboard">
      <div className="grid items-start gap-5 rounded-2xl border border-app-border bg-[radial-gradient(circle_at_78%_18%,rgba(0,229,255,0.18),transparent_28%),linear-gradient(135deg,#1e1e1e,#121212)] p-6 shadow-panel lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-app-cyan">Personal dashboard</p>
          <h2 className="m-0 text-3xl font-black text-white md:text-5xl">My CCA Activity</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-app-muted">
            {currentUser?.name || 'Member'}, this view only shows your own event and competition registrations, approval status and attendance.
          </p>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-surfaceSoft p-5">
          <span className="block text-[0.78rem] font-extrabold uppercase tracking-wide text-app-muted">Attendance rate</span>
          <strong className="mt-2 block font-mono text-5xl font-black text-app-cyan">{stats.attendance_rate}%</strong>
          <small className="mt-1 block text-sm font-bold text-app-muted">
            {stats.attended_count} marked present from {stats.approved_registrations} approved signup(s)
          </small>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="My Signups" value={stats.total_registrations} hint={`${stats.upcoming_count} upcoming`} />
        <MetricCard label="Events" value={stats.event_registrations} hint="event registrations" />
        <MetricCard label="Competitions" value={stats.competition_registrations} hint="competition entries" />
        <MetricCard label="Pending" value={stats.pending_registrations} hint="waiting for approval" />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Match Win Rate" value={`${stats.competition_win_rate}%`} hint={`${stats.competition_match_wins}/${stats.competition_matches_played} decided games won`} />
        <MetricCard label="Match Record" value={`${stats.competition_match_wins}-${stats.competition_match_losses}`} hint={`${stats.competition_byes} bye win(s)`} />
        <MetricCard label="Best Finish" value={stats.best_finish ? `#${stats.best_finish}` : '-'} hint="best latest standing" />
        <MetricCard label="Achievements" value={stats.top10_count} hint={`${stats.first_place_count} first, ${stats.top5_count} top 5`} />
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Competition Results" subtitle="Win, loss and bye outcomes from recorded pairings." />
          <div className="h-[280px]">
            <Doughnut data={competitionResultData} options={doughnutOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Opponent Record" subtitle="Who you have beaten or lost to most often." />
          <div className="h-[280px]">
            <Bar data={opponentData} options={barOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Finishes" subtitle="Placements from saved ranking records." />
          <div className="h-[280px]">
            <Bar data={achievementData} options={barOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-6">
          <ChartHeader title="Recent Match History" subtitle="Your latest pairings and results across competitions." />
          <div className="grid gap-3">
            {stats.recent_matches.map((match) => (
              <article key={`${match.competition_title}-${match.round_number}-${match.table_number}-${match.opponent_name}`} className="rounded-xl border border-app-border bg-app-surfaceSoft p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <strong className="block text-white">{match.competition_title}</strong>
                    <small className="text-app-muted">{match.category_name} - Round {match.round_number}, Table {match.table_number}</small>
                  </div>
                  <span className={match.outcome === 'Win' ? 'status-pill' : match.outcome === 'Loss' ? 'status-pill danger' : 'status-pill warning'}>{match.outcome}</span>
                </div>
                <small className="text-app-muted">Opponent: {match.opponent_name || 'Bye'}</small>
              </article>
            ))}
            {stats.recent_matches.length === 0 && <p className="empty-state">No competition results have been recorded yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-6">
          <ChartHeader title="Achievement Records" subtitle="Your latest recorded standing for each competition category." />
          <div className="grid gap-3">
            {stats.competition_achievements.map((achievement) => (
              <article key={`${achievement.competition_title}-${achievement.category_name}`} className="rounded-xl border border-app-border bg-app-surfaceSoft p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <strong className="block text-white">{achievement.competition_title}</strong>
                    <small className="text-app-muted">{achievement.category_name} - Round {achievement.round_number}</small>
                  </div>
                  <span className="status-pill">#{achievement.rank_position}</span>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="font-extrabold text-app-muted">MMS</dt><dd className="m-0 font-black text-white">{achievement.mms}</dd></div>
                  <div><dt className="font-extrabold text-app-muted">SOS</dt><dd className="m-0 font-black text-white">{achievement.sos}</dd></div>
                  <div><dt className="font-extrabold text-app-muted">Record</dt><dd className="m-0 font-black text-white">{achievement.wins}-{achievement.losses}</dd></div>
                </dl>
              </article>
            ))}
            {stats.competition_achievements.length === 0 && <p className="empty-state">No ranking records have been saved yet. Results will create standings snapshots.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-7">
          <ChartHeader title="My Participation Trend" subtitle="Monthly signups from your own event and competition registrations." />
          <div className="h-[330px]">
            <Line data={trendData} options={lineOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-5">
          <ChartHeader title="My Attendance" subtitle="Present count against your approved registrations." />
          <div className="grid items-center gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="h-[220px]">
              <Doughnut data={attendanceData} options={doughnutOptions} />
            </div>
            <div className="grid gap-3">
              <Insight label="Present" value={String(stats.attended_count)} detail="marked by exco" />
              <Insight label="Not Marked" value={String(missedApproved)} detail="approved but not present yet" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Registration Status" subtitle="Your approval state across activities." />
          <div className="h-[280px]">
            <Doughnut data={statusData} options={doughnutOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Activity Mix" subtitle="How your participation splits between CCA events and competitions." />
          <div className="h-[280px]">
            <Bar data={typeData} options={barOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Attendance By Type" subtitle="Competition attendance is separated from normal event turnout." />
          <div className="h-[280px]">
            <Bar data={attendanceByTypeData} options={barOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel xl:col-span-4">
          <ChartHeader title="Upcoming For Me" subtitle="Only your active registrations are listed here." />
          <div className="grid gap-3">
            {stats.upcoming_activities.map((activity) => (
              <article key={`${activity.activity_type}-${activity.title}-${activity.activity_date}`} className="rounded-xl border border-app-border bg-app-surfaceSoft p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wide text-app-cyan">{activity.activity_type}</span>
                    <h3 className="m-0 mt-1 text-base font-black text-white">{activity.title}</h3>
                  </div>
                  <span className="status-pill">{activity.status}</span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="font-extrabold text-app-muted">Date</dt>
                    <dd className="m-0 font-black text-white">{formatDate(activity.activity_date)}</dd>
                  </div>
                  <div>
                    <dt className="font-extrabold text-app-muted">Venue</dt>
                    <dd className="m-0 font-black text-white">{activity.venue || '-'}</dd>
                  </div>
                  {activity.detail && (
                    <div className="col-span-2">
                      <dt className="font-extrabold text-app-muted">Category</dt>
                      <dd className="m-0 font-black text-white">{activity.detail}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
            {stats.upcoming_activities.length === 0 && (
              <p className="empty-state">You have no upcoming event or competition registrations.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
};


const MetricCard = ({ label, value, hint }: { label: string; value: number | string; hint: string }) => (
  <article className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-panel">
    <span className="block text-[0.82rem] font-extrabold text-app-muted">{label}</span>
    <strong className="mt-2 block font-mono text-3xl font-black text-app-cyan">{value}</strong>
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


export { AnalyticsDashboard, MemberStatsDashboard, OverviewMetrics };
