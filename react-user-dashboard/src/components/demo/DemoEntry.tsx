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
  return <main className="auth-page demo-entry"><section className="auth-panel" aria-labelledby="demo-title">
    <div className="auth-brand">
      <span className="demo-entry-logo">TourneyHub</span>
      <div className="demo-entry-story">
        <p className="eyebrow">Your club. Your next move.</p>
        <strong>A little strategy.<br />A lot of <em>possibility.</em></strong>
        <p>Bring people together, on and off the board.</p>
      </div>
      <p className="demo-entry-caption">A fictional Weiqi club. Real working features.</p>
    </div>
    <div className="auth-card">
      <header>
      <p className="eyebrow">Interactive coursework demo</p>
      <h1 id="demo-title">Make your <em>next move.</em></h1>
      <p className="demo-entry-intro">Take the organiser’s seat. See your club in action.</p>
      </header>
      <ul className="demo-entry-features">
        <li><span aria-hidden="true">01</span><div><strong>Run the tournament.</strong><p>Record a result. Watch the standings change.</p></div></li>
        <li><span aria-hidden="true">02</span><div><strong>Fill the next session.</strong><p>Switch to Member and claim a spot.</p></div></li>
        <li><span aria-hidden="true">03</span><div><strong>Set the record straight.</strong><p>Review a missed check-in in a few clicks.</p></div></li>
      </ul>
      <div className="demo-entry-start">
      <p className="demo-entry-reassurance"><strong>No account needed.</strong> Fictional data · Private session · Expires in 1 hour</p>
      {new URLSearchParams(location.search).has('expired') && <p className="demo-entry-expired" role="status">Session ended. Start fresh and explore again.</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="primary-action" disabled={busy} onClick={start}>{busy ? 'Preparing your demo…' : 'Try interactive demo'}</button>
      <p className="demo-entry-wait" role="status">{busy ? 'Setting up your club. Keep this page open.' : 'Free hosting may take about a minute to wake up.'}</p>
      <a href={portfolioUrl}>View project walkthrough <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </section></main>;
}
