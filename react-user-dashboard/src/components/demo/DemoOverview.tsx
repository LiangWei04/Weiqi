import React from 'react';
import ClubAnalytics, { OperationalMetrics } from '../dashboard/ClubAnalytics';
import { Link } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import type { AttendanceChangeRequest, Competition, DashboardStats, EventItem, TournamentData } from '../../types/dashboard';
import { formatDate } from '../../utils/formatters';

export default function DemoOverview({ events, competitions, stats, requests }: {
  events: EventItem[]; competitions: Competition[]; stats: DashboardStats; requests: AttendanceChangeRequest[];
}) {
  const active = competitions.find(item => item.status === 'In Progress');
  const activeId = active?.id;
  const [tournament, setTournament] = React.useState<TournamentData | null>(null);
  const [error, setError] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setError(false);
    apiClient.get<TournamentData>(`/competitions/${activeId}/tournament`)
      .then(({ data }) => { if (!cancelled) setTournament(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [activeId, retry]);
  const category = tournament?.categories[0];
  const awaitingResults = category?.matches.filter(match => match.result === 'Scheduled').length;
  const upcoming = events.filter(item => !item.is_archived && item.status === 'Open').sort((a,b) => a.event_date.localeCompare(b.event_date));
  const history = events.filter(item => item.status === 'Completed').sort((a,b) => a.event_date.localeCompare(b.event_date)).slice(-6);
  const attended = history.reduce((sum,item) => sum + Number(item.attended),0);
  const registered = history.reduce((sum,item) => sum + Number(item.registered),0);
  const pending = requests.filter(item => item.status === 'Pending');
  const tournamentUrl = active ? `/competitions?demo=tournament&competition=${active.id}` : '/competitions';
  return <section className="club-overview" aria-label="Club snapshot">
    <div className="club-kpis">
      <div><span>Club community</span><strong>{stats.total_users}<small>members</small></strong><p>{stats.active_members} active, {stats.inactive_users} inactive</p></div>
      <div><span>Coming up</span><strong>{upcoming.length}<small>sessions</small></strong><p>Practice and learning together</p></div>
      <div><span>Recent turnout</span><strong>{registered ? Math.round(attended/registered*100) : 0}<small>%</small></strong><p>{attended} check-ins across {history.length} past sessions</p></div>
      <div><span>Needs a decision</span><strong>{pending.length}<small>attendance {pending.length === 1 ? 'request' : 'requests'}</small></strong><p>{pending.length ? 'A missed check-in is ready for review' : 'Attendance reviews are up to date'}</p></div>
    </div>
    <div className="club-main-grid">
      <article className="club-cup">
        <div className="club-cup-heading"><div><p className="club-kicker">ON THE BOARDS · {active?.status || 'TOURNAMENTS'}</p><h2>{active?.title || 'Club tournaments'}</h2><p>{category ? `${category.player_count} players · Round ${Math.max(0,...category.rounds.map(round => round.round_number))} · ${awaitingResults} matches awaiting results` : 'Loading tournament standings…'}</p></div><div className="club-stones" aria-hidden="true"><i/><i/></div></div>
        {error ? <p role="alert">Standings could not load. <button onClick={() => setRetry(value => value+1)}>Retry standings</button></p> : category && <>
          <div className="club-standing-title"><h3>Leading players</h3><span>Points / wins</span></div>
          <ol className="club-standings">{category.standings.slice(0,4).map(player => <li key={player.user_id}><span className="club-rank">{player.rank_position}</span><span className="club-avatar" aria-hidden="true">{player.name.split(' ').map(word => word[0]).slice(0,2).join('')}</span><span className="club-player">{player.name}<small>{player.rank_value} {player.rank_type}</small></span><strong>{Number(player.mms)}<small>{player.wins} W</small></strong></li>)}</ol>
        </>}
        <Link className="club-cta" to={tournamentUrl}>Open tournament &amp; record a result <span aria-hidden="true">↗</span></Link>
      </article>
      <article className="club-schedule"><p className="club-kicker">NEXT AT THE CLUB</p><h2>Make room for a game.</h2><div className="club-agenda">{upcoming.map(item => <Link to="/events?demo=signup" key={item.id}><time dateTime={item.event_date}><strong>{new Date(item.event_date).getDate()}</strong><span>{new Date(item.event_date).toLocaleDateString('en-SG',{month:'short'})}</span></time><div><h3>{item.title}</h3><p>{item.venue} · {item.registered}/{item.capacity} places filled</p><progress aria-label={`${item.title} places filled`} value={Number(item.registered)} max={Number(item.capacity)}/></div><span aria-hidden="true">↗</span></Link>)}</div><p className="club-footnote">Switch to Member to try a workshop signup.</p></article>
      <article className="club-review"><p className="club-kicker">COMMITTEE DESK</p><h2>{pending.length ? 'One check-in to put right.' : 'All caught up.'}</h2>{pending[0] ? <><span className="club-review-badge">Pending attendance review</span><h3>{pending[0].member_name}</h3><p>{pending[0].activity_title} · {formatDate(pending[0].activity_date)}</p><blockquote>{pending[0].reason}</blockquote><Link className="club-cta" to="/attendance?demo=attendance">Review the request <span aria-hidden="true">↗</span></Link></> : <p>No pending attendance corrections. Browse the decision history in Attendance.</p>}</article>
      <OperationalMetrics stats={stats} />
    </div>
    <ClubAnalytics stats={stats} events={events} competitions={competitions} />
  </section>;
}
