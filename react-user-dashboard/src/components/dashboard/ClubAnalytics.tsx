import type { Competition, DashboardStats, EventItem } from '../../types/dashboard';

export function OperationalMetrics({ stats }: { stats: DashboardStats }) {
  const leakage = Math.max(0, Number(stats.approved_registrations) + Number(stats.approved_competition_registrations)
    - Number(stats.total_attended) - Number(stats.attended_competition_registrations));
  const pending = Number(stats.pending_registrations) + Number(stats.pending_competition_registrations);
  return <div className="club-operational">
    <article><h3>Attendance leakage</h3><strong>{leakage}</strong><p>Approved signups without attendance recorded</p><small>Includes upcoming events; not a confirmed no-show count.</small></article>
    <article><h3>Pending signups</h3><strong>{pending}</strong><p>Event and competition registrations awaiting approval</p><small>Attendance corrections are handled separately.</small></article>
  </div>;
}

export default function ClubAnalytics({ stats, events, competitions }: { stats: DashboardStats; events: EventItem[]; competitions: Competition[] }) {
  const completedTitles = new Set([...events, ...competitions].filter(item => item.status === 'Completed').map(item => item.title));
  const quality = [...stats.attendance_by_event, ...stats.competition_attendance].filter(item => completedTitles.has(item.title));
  const popularity = stats.event_popularity;
  const max = Math.max(1, ...popularity.map(item => Number(item.registered)));
  return <section className="club-analytics" aria-label="Club analytics">
    <h2>Club analytics</h2><p className="muted-line">Attendance and participation at a glance</p>
    <div className="club-chart-grid">
      <article className="club-chart"><h3>Attendance quality</h3><p>Recorded attendance / approved signups</p>
        {quality.map((item, index) => <div className="club-chart-row" key={`${item.title}-${index}`}>
          <div className="club-chart-label"><span>{item.title}</span><strong>{item.attendance_rate}%</strong></div>
          <div className="club-chart-track" role="img" aria-label={`${item.title}: ${item.attended} of ${item.registered} present`}><span style={{ width: `${Math.max(0, Math.min(100, Number(item.attendance_rate)))}%` }} /></div>
        </div>)}
        {!quality.length && <p>No completed activities yet.</p>}
        <p>Completed sessions and competitions only.</p>
      </article>
      <article className="club-chart"><h3>Event popularity</h3><p>Approved signups · <span style={{ color: '#80555d' }}>Marked present</span></p>
        {popularity.map(item => <div className="club-chart-row" key={item.id}>
          <div className="club-chart-label"><span>{item.title}</span><strong>{item.registered} / {item.attended}</strong></div>
          <div className="club-chart-track"><span style={{ width: `${Number(item.registered) / max * 100}%` }} /></div>
          <div className="club-chart-track secondary"><span style={{ width: `${Number(item.attended) / max * 100}%` }} /></div>
        </div>)}
        {!popularity.length && <p>No event registrations yet.</p>}
        <p>Upcoming events may not have attendance recorded yet.</p>
      </article>
    </div>
  </section>;
}
