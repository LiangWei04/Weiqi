import React from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioUrl, startDemo } from '../../utils/demo';
import { getApiErrorMessage } from '../../utils/apiErrors';

export default function DemoEntry() {
  const navigate = useNavigate();
  const [busy,setBusy] = React.useState(false);
  const [error,setError] = React.useState('');
  const start = async () => {
    setBusy(true); setError('');
    try { await startDemo(); navigate('/dashboard'); }
    catch (error) { setError(getApiErrorMessage(error,'Unable to start the demo. Please retry or view the walkthrough.')); }
    finally { setBusy(false); }
  };
  return <main className="auth-page"><section className="auth-panel" aria-labelledby="demo-title">
    <div className="auth-brand"><span>TourneysHub</span><strong>Club operations, from signup to standings</strong></div>
    <div className="auth-card">
      <p className="eyebrow">Interactive coursework demo</p>
      <h1 id="demo-title">A club ready to explore.</h1>
      <p>Run a tournament, manage a signup, and resolve a missed check-in. Start as the organiser, then switch to a member to see the other side.</p>
      <p>Fictional data. Your private changes expire after one hour. No account needed.</p>
      {new URLSearchParams(location.search).has('expired') && <p role="status">Your previous demo expired or was reset. Start again with fresh data.</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="primary-action" disabled={busy} onClick={start}>{busy ? 'Preparing your demo…' : 'Try interactive demo'}</button>
      <p role="status">{busy ? 'Creating your fictional club. Please keep this page open.' : 'The free demo may take about a minute to start.'}</p>
      <a href={portfolioUrl}>View project walkthrough</a>
    </div>
  </section></main>;
}
