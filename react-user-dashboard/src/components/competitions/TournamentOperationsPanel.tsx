import { demoMode } from '../../utils/demo';
import React from 'react';
import apiClient from '../../utils/apiClient';
import type { TournamentData } from '../../types/dashboard';
import { getApiErrorMessage } from '../../utils/apiErrors';

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
  <article className={`rounded-2xl border border-app-border bg-app-surfaceSoft p-4 ${label === 'Completion' ? 'completion-card' : ''}`}>
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

const formatRank = (rankType?: string | null, rankValue?: number | null) => {
  if (!rankType) {
    return '-';
  }

  if (rankType === 'Unrated') {
    return 'Unrated';
  }

  return rankValue === null || rankValue === undefined ? rankType : `${rankValue} ${rankType}`;
};

const TournamentOperationsPanel = ({
  competitionId,
  competitionTitle,
  tournament,
  loading,
  canManage,
  onClose,
  onChanged,
  onResultChanged,
}: {
  competitionId: number;
  competitionTitle: string;
  tournament: TournamentData | null;
  loading: boolean;
  canManage: boolean;
  onClose: () => void;
  onChanged: (message: string) => void | Promise<void>;
  onResultChanged: (message: string) => void | Promise<void>;
}) => {
  const dialogRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<number | null>(null);
  const [workspaceTab, setWorkspaceTab] = React.useState<'pairings' | 'standings' | 'insights'>('pairings');
  const [resultUpdating, setResultUpdating] = React.useState(false);
  const [roundGenerating, setRoundGenerating] = React.useState(false);
  const categories = tournament?.categories || [];
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) || categories[0] || null;
  const roundKeys = selectedCategory
    ? Array.from(new Set(selectedCategory.standings.flatMap((standing) => Object.keys(standing.rounds)))).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
    : [];
  const latestRoundNumber = selectedCategory?.matches.reduce((maxRound, match) => Math.max(maxRound, Number(match.round_number || 0)), 0) || 0;
  const latestRoundMatches = selectedCategory
    ? selectedCategory.matches
      .filter((match) => Number(match.round_number) === latestRoundNumber)
      .sort((a, b) => a.table_number - b.table_number)
    : [];
  const unresolvedLatestRoundMatches = latestRoundMatches.filter((match) => match.result === 'Scheduled');
  const playerBlockMessage = selectedCategory && selectedCategory.player_count === 0
    ? 'This category has no approved players yet. Approve registrations before generating pairings.'
    : '';
  const roundBlockMessage = latestRoundNumber > 0 && unresolvedLatestRoundMatches.length > 0
    ? `Round ${latestRoundNumber} still has ${unresolvedLatestRoundMatches.length} scheduled match${unresolvedLatestRoundMatches.length === 1 ? '' : 'es'}. Enter all results before generating Round ${latestRoundNumber + 1}.`
    : '';
  const actionBlockMessage = (demoMode && latestRoundNumber >= 3 ? 'The three-round demo is complete. Reset to try again.' : '') || playerBlockMessage || roundBlockMessage;
  const canGenerateNextRound = Boolean(selectedCategory) && !actionBlockMessage && !roundGenerating && !resultUpdating;

  React.useEffect(() => {
    if (!selectedCategoryId && categories[0]) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const generateRound = async () => {
    if (!selectedCategory) {
      return;
    }

    if (actionBlockMessage) {
      await onChanged(actionBlockMessage);
      return;
    }

    setRoundGenerating(true);
    const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 1200));

    try {
      const response = await apiClient.post<{ message: string }>(`/competitions/${competitionId}/categories/${selectedCategory.id}/rounds/generate`);
      await onChanged(response.data.message);
    } catch (error) {
      await onChanged(getApiErrorMessage(error, 'Could not generate the next round. Complete the current round and try again.'));
    } finally {
      await minimumDelay;
      setRoundGenerating(false);
    }
  };

  const updateResult = async (matchId: number, result: string) => {
    setResultUpdating(true);
    const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 1200));

    try {
      const response = await apiClient.put<{ message: string }>(`/competitions/matches/${matchId}/result`, { result });
      await onResultChanged(response.data.message);
    } catch (error) {
      await onChanged(getApiErrorMessage(error, 'Could not save this result. Please retry.'));
    } finally {
      await minimumDelay;
      setResultUpdating(false);
    }
  };

  return (
    <div className="edit-modal-backdrop tournament-workspace-backdrop" role="presentation">
      <section ref={dialogRef} tabIndex={-1} onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),[href]')).filter((item) => item.offsetParent !== null);
          const first = items[0], last = items[items.length-1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }} className="tournament-workspace" role="dialog" aria-modal="true" aria-label={`${competitionTitle} tournament engine`}>
        {(resultUpdating || roundGenerating) && (
          <div className="tournament-loading-veil" role="status" aria-live="polite">
            <div>
              <span className="loading-ring" aria-hidden="true" />
              <strong>{roundGenerating ? 'Generating next round...' : 'Updating standings...'}</strong>
              <small>{roundGenerating ? 'Creating pairings and refreshing the tournament table.' : 'Saving the match result and recalculating the table.'}</small>
            </div>
          </div>
        )}
        <div className="tournament-workspace-head">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-app-cyan">Tournament engine</p>
            <h3 className="m-0 text-2xl font-bold text-app-text">{competitionTitle}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="min-w-[190px] rounded-md border border-app-border bg-[#FCF8F8] px-3 py-2 font-bold text-app-text"
              aria-label="Tournament category" value={selectedCategory?.id || ''}
              onChange={(event) => setSelectedCategoryId(Number(event.target.value))}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <button type="button" className="secondary-action compact" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="tournament-tabs">
          <button type="button" className={workspaceTab === 'pairings' ? 'active' : ''} onClick={() => setWorkspaceTab('pairings')}>Pairings</button>
          <button type="button" className={workspaceTab === 'standings' ? 'active' : ''} onClick={() => setWorkspaceTab('standings')}>Standings</button>
          <button type="button" className={workspaceTab === 'insights' ? 'active' : ''} onClick={() => setWorkspaceTab('insights')}>Insights</button>
        </div>

        {loading && <p className="empty-state">Loading tournament data...</p>}
        {!loading && !selectedCategory && <p className="empty-state">Add a category and approve players before generating pairings.</p>}

        {selectedCategory && (
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Insight label="Players" value={String(selectedCategory.player_count)} detail="approved registrations" />
              <Insight label="Rounds" value={String(selectedCategory.rounds.length)} detail="generated so far" />
              <Insight label="Completion" value={`${selectedCategory.insights.completion_rate}%`} detail={`${selectedCategory.insights.completed_matches}/${selectedCategory.insights.scheduled_matches} matches`} />
              <Insight label="Tied Leaders" value={String(selectedCategory.insights.tied_leaders)} detail="same top MMS" />
            </div>

            {workspaceTab === 'pairings' && (
              <section className="rounded-xl border border-app-border bg-app-surfaceSoft p-4">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <ChartHeader
                    title={latestRoundNumber > 0 ? `Round ${latestRoundNumber} Pairings` : 'Current Pairings'}
                    subtitle="Only the latest round is shown here. Standings remain cumulative across all rounds."
                  />
                  {canManage && (
                    <button
                      type="button"
                      className={`primary-action compact ${!canGenerateNextRound ? 'is-disabled' : ''}`}
                      disabled={!canGenerateNextRound} aria-disabled={!canGenerateNextRound}
                      onClick={generateRound}
                      title={actionBlockMessage || undefined}
                    >
                      Generate Next Round
                    </button>
                  )}
                </div>
                {actionBlockMessage && (
                  <div className="mb-4 rounded-xl border border-app-amber/60 bg-app-amber/10 px-4 py-3 text-sm font-bold text-app-amber" role="status">
                    {actionBlockMessage}
                  </div>
                )}
                <div className="grid gap-3">
                  {latestRoundMatches.map((match) => (
                    <article key={match.id} className={`grid gap-3 rounded-lg border border-app-border p-3 md:grid-cols-[150px_minmax(0,1fr)_220px] md:items-center ${match.result === 'Scheduled' ? 'pairing-attention' : 'bg-app-surface'}`}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <strong className="text-app-text">R{match.round_number} - Table {match.table_number}</strong>
                        <span className="status-pill">{match.result}</span>
                      </div>
                      <div className="grid gap-2 text-sm text-app-muted md:grid-cols-2">
                        <span><strong className="text-app-text">Black:</strong> {match.black_name || 'Bye'}</span>
                        <span><strong className="text-app-text">White:</strong> {match.white_name || 'Bye'}</span>
                      </div>
                      {canManage && match.white_user_id && (
                        <label className="form-field mt-3">
                          <span>Result</span>
                          <select value={match.result} disabled={resultUpdating || roundGenerating} onChange={(event) => updateResult(match.id, event.target.value)}>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Black Win">Black Win</option>
                            <option value="White Win">White Win</option>
                            <option value="Forfeit Black">Black Forfeit</option>
                            <option value="Forfeit White">White Forfeit</option>
                          </select>
                        </label>
                      )}
                    </article>
                  ))}
                  {latestRoundMatches.length === 0 && <p className="empty-state">No pairings yet. Generate the first round after registrations are approved.</p>}
                </div>
              </section>
            )}

            {workspaceTab === 'standings' && (
              <section className="rounded-xl border border-app-border bg-app-surfaceSoft p-4">
                <ChartHeader title="OpenGotha-style Standings" subtitle="Sorted by MMS, then SOS, SOSOS, wins and player number." />
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[760px]">
                    <thead>
                      <tr>
                        <th>Num</th>
                        <th>Pl</th>
                        <th>Name</th>
                        <th>Rk</th>
                        <th>Co</th>
                        <th>NbW</th>
                        {roundKeys.map((roundKey) => <th key={roundKey}>{roundKey}</th>)}
                        <th>MMS</th>
                        <th>SOS</th>
                        <th>SOSOS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCategory.standings.map((standing) => (
                        <tr key={standing.user_id}>
                          <td>{standing.rank_position}</td>
                          <td>{standing.player_number}</td>
                          <td>{standing.name}</td>
                          <td>{formatRank(standing.rank_type, standing.rank_value)}</td>
                          <td>{standing.school || '-'}</td>
                          <td>{standing.wins}</td>
                          {roundKeys.map((roundKey) => <td key={roundKey}>{standing.rounds[roundKey] || '-'}</td>)}
                          <td>{standing.mms}</td>
                          <td>{standing.sos}</td>
                          <td>{standing.sosos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedCategory.standings.length === 0 && <p className="empty-state">No approved players in this category yet.</p>}
              </section>
            )}

            {workspaceTab === 'insights' && (
              <section className="rounded-xl border border-app-border bg-app-surfaceSoft p-4">
                <ChartHeader title="Tournament Insights" subtitle="Operational signals from this category's pairings and standings." />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SignalCard label="Open Results" value={selectedCategory.insights.no_result_matches} detail="matches still scheduled" tone={selectedCategory.insights.no_result_matches > 0 ? 'warn' : 'good'} />
                  <SignalCard label="Completed" value={selectedCategory.insights.completed_matches} detail="matches with recorded result" tone="good" />
                  <SignalCard label="Current Round" value={latestRoundNumber || '-'} detail="latest generated round" tone="good" />
                  <SignalCard label="Tie Pressure" value={selectedCategory.insights.tied_leaders} detail="leaders on same MMS" tone={selectedCategory.insights.tied_leaders > 1 ? 'warn' : 'good'} />
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default TournamentOperationsPanel;
