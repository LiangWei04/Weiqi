import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import { portfolioUrl, saveDemo, type DemoSession } from '../../utils/demo';
import { getApiErrorMessage } from '../../utils/apiErrors';

export default function DemoGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session,setSession] = React.useState<DemoSession | null>(null);
  const [busy,setBusy] = React.useState(false);
  const [error,setError] = React.useState('');
  const [confirmReset,setConfirmReset] = React.useState(false);
  React.useEffect(() => {
    const refresh = () => apiClient.get<DemoSession>('/demo/session').then(({data}) => setSession(data)).catch((error) => setError(getApiErrorMessage(error,'Could not refresh demo progress.')));
    void refresh();
    window.addEventListener('demo-updated',refresh);
    return () => window.removeEventListener('demo-updated',refresh);
  }, [location.pathname]);
  React.useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(() => window.location.assign('/login?expired=1'),Math.max(0,new Date(session.expiresAt).getTime()-Date.now()));
    return () => window.clearTimeout(timeout);
  },[session]);
  const change = async (reset: boolean, persona?: string) => {
    setBusy(true); setError('');
    try {
      const { data } = await apiClient.post<DemoSession>(reset ? '/demo/reset' : '/demo/persona',reset ? {} : { persona });
      saveDemo(data);
      window.location.assign(reset ? '/dashboard' : location.pathname + location.search);
    } catch (error) { setError(getApiErrorMessage(error,'Unable to change the demo. Please retry.')); setBusy(false); }
  };
  const p = session?.progress;
  return <section className="demo-guide" aria-label="Interactive demo guide">
    <div className="demo-toolbar">
      <label>Viewing as: <select aria-label="Demo persona" disabled={busy || !session} value={session?.persona || 'organiser'} onChange={(event) => void change(false,event.target.value)}><option value="organiser">Organiser</option><option value="member">Member</option></select></label>
      <span>Fictional data · Changes expire after one hour</span>
      <button className="secondary-action compact" disabled={busy} onClick={() => setConfirmReset(true)}>Reset demo</button>
      <a href={portfolioUrl}>Back to portfolio</a>
    </div>
    {confirmReset && <div role="group" aria-label="Confirm reset" className="demo-reset"><p>Discard your changes and start with a fresh club?</p><button className="primary-action compact" disabled={busy} onClick={() => void change(true)}>Yes, reset demo</button><button className="secondary-action compact" disabled={busy} onClick={() => setConfirmReset(false)}>Keep exploring</button></div>}
    {error && <p role="alert">{error}</p>}
    <h2>Explore a fictional Weiqi club</h2>
    <p>Manage registrations, resolve attendance requests, and update tournament results. Your changes stay in your demo session.</p>
    <div className="demo-scenarios">
      <button onClick={() => window.location.assign(`/competitions?demo=tournament&competition=${session?.records.activeCompetition || ''}`)} disabled={!session}><strong>01 · Run a tournament</strong><span>Open the Demo Club Cup engine. Record the final result in round 2, inspect standings, then generate round 3.</span><small>{p?.tournament ? 'Round 2 results complete' : 'One match awaits a result'} · Organiser</small></button>
      <button onClick={() => navigate('/events?demo=signup')}><strong>02 · Manage a signup</strong><span>Switch to Member and join the Beginner Workshop. Switch back to Organiser, then open Members to approve it.</span><small>Member signup: {p?.signup || 'Loading…'}</small></button>
      <button onClick={() => navigate('/attendance?demo=attendance')}><strong>03 · Resolve an attendance request</strong><span>As Organiser, review Demo Member’s missed check-in. Approve or reject the pending request.</span><small>Decision: {p?.attendance || 'Loading…'}{p?.reviewedAt ? ` · ${new Date(p.reviewedAt).toLocaleString()}` : ''}</small></button>
    </div>
    {session?.persona === 'member' && location.pathname === '/attendance' && <p>Switch to Organiser above to review attendance. Members cannot approve requests.</p>}
  </section>;
}
