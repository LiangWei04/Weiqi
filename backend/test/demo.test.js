const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const port = Number(process.env.DEMO_TEST_PORT);
assert.ok(port >= 1024 && port <= 65535 && port !== 5432,'Use a dedicated disposable PostgreSQL port, not 5432');
const dotenvPath = require.resolve('dotenv');
require.cache[dotenvPath] = { id:dotenvPath, filename:dotenvPath, loaded:true, exports:{config(){}} };
Object.assign(process.env, { DEMO_MODE:'true', DATABASE_URL:`postgresql://attendance_test@127.0.0.1:${port}/tourney_demo_test`, DATABASE_SSL:'false', DEMO_DATABASE_NAME:'tourney_demo_test', DB_CONNECTION_LIMIT:'2', JWT_SECRET_KEY:randomUUID()+randomUUID() });
const db = require('../src/services/db');
const context = require('../src/services/demoContext');
const sessions = require('../src/services/demoSessions');
let server, base, a, b, ownsFixtures = false;
async function api(path, token, method='GET', body) {
  const response = await fetch(base+path,{ method, headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {}) });
  return { status:response.status, data:await response.json() };
}
before(async () => {
  await sessions.setup();
  assert.equal((await db.control.query('SELECT count(*)::integer AS n FROM demo_control.sessions')).rows[0].n,0,'Test database must be fresh');
  ownsFixtures = true;
  await db.control.query('DELETE FROM demo_control.attempts');
  server = require('../src/app').listen(0,'127.0.0.1');
  await new Promise((resolve) => server.once('listening',resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  a = (await api('/demo/session',null,'POST',{})).data;
  b = (await api('/demo/session',null,'POST',{})).data;
  assert.ok(a.token); assert.ok(b.token);
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (ownsFixtures) {
    await db.control.query('UPDATE demo_control.sessions SET expires_at=now()-interval \'1 second\'');
    await sessions.maintenance();
  }
  await db.end();
});

test('real seeded dashboard and read surfaces load',async () => {
  for (const path of ['/auth/me','/users/me/settings','/events','/competitions','/competitions/options','/competitions/registrations','/registrations','/dashboard/stats','/dashboard/member-stats','/notifications','/notifications/my-activities','/attendance-requests','/demo/session']) {
    const response = await api(path,a.token);
    assert.equal(response.status,200,`${path}: ${JSON.stringify(response.data)}`);
  }
  const events = (await api('/events',a.token)).data;
  assert.equal(events.filter(event => event.status === 'Completed').length,6);
  const stats = (await api('/dashboard/stats',a.token)).data;
  assert.equal(stats.total_events,8);
  assert.ok(stats.registrations_over_time.length > 1,'Historical registrations must span multiple dates');
});
test('member signup, organiser approval and isolated data',async () => {
  const member = (await api('/demo/persona',a.token,'POST',{persona:'member'})).data;
  assert.equal((await api(`/events/${a.records.workshop}/register`,member.token,'POST',{})).status,201);
  const progress = (await api('/demo/session',member.token)).data.progress;
  assert.equal(progress.signup,'Pending Approval');
  assert.equal((await api(`/registrations/${progress.signupRegistration}/approve`,member.token,'PUT',{})).status,403);
  assert.equal((await api(`/registrations/${progress.signupRegistration}/approve`,a.token,'PUT',{})).status,200);
  assert.equal((await api('/demo/session',member.token)).data.progress.signup,'Registered');
  assert.equal((await api('/demo/session',b.token)).data.progress.signup,'Not registered');
  assert.equal((await api(`/registrations/${progress.signupRegistration}/approve`,b.token,'PUT',{})).status,403);
});

test('personal dashboard returns only retained cards and keeps persona data scoped',async () => {
  const organiser = (await api('/dashboard/member-stats',a.token)).data;
  assert.deepEqual(Object.keys(organiser).sort(), [
    'approved_registrations', 'attended_count', 'attendance_rate', 'monthly_activity',
    'competition_matches_played', 'competition_match_wins', 'competition_win_rate',
    'first_place_count', 'top10_count', 'events_created', 'competitions_organized',
    'recent_matches', 'competition_achievements', 'upcoming_activities',
  ].sort());
  assert.ok(organiser.events_created > 0);
  assert.ok(organiser.competition_matches_played >= 9);
  assert.ok(organiser.competition_win_rate > 0 && organiser.competition_win_rate < 100);
  assert.equal(organiser.competition_achievements.length,3);
  assert.ok(organiser.monthly_activity.length >= 6);
  assert.ok(organiser.attended_count > 0 && organiser.attended_count < organiser.approved_registrations);
  assert.equal(organiser.upcoming_activities.length,2);
  const member = (await api('/demo/persona',a.token,'POST',{persona:'member'})).data;
  const response = await api('/dashboard/member-stats',member.token);
  assert.equal(response.status,200);
  assert.equal(response.data.events_created,0);
  assert.ok(response.data.competition_matches_played > 0);
  assert.ok(response.data.recent_matches.length > 0);
  assert.ok(response.data.monthly_activity.length > 0);
  assert.equal(response.data.competition_win_rate,Math.round(response.data.competition_match_wins / response.data.competition_matches_played * 100));
  assert.equal(response.data.competition_achievements.length,4);
  assert.ok(response.data.competition_win_rate < 100);
  const competitions = (await api('/competitions',a.token)).data;
  for (const competition of competitions.filter(item => item.status === 'Completed')) {
    const tournament = (await api(`/competitions/${competition.id}/tournament`,a.token)).data;
    const category = tournament.categories[0];
    const standing = category.standings.find(item => item.user_id === a.userId);
    const saved = organiser.competition_achievements.find(item => item.competition_title === competition.title);
    assert.equal(saved.rank_position,standing.rank_position,'Seeded achievement must match calculated standings');
  }
});
test('attendance decision updates underlying registration and preserves history',async () => {
  assert.equal((await api(`/attendance-requests/${a.records.attendanceRequest}/approve`,a.token,'PUT',{})).status,200);
  const status = (await api('/demo/session',a.token)).data;
  assert.equal(status.progress.attendance,'Approved'); assert.ok(status.progress.reviewedAt);
  const registrations = (await api('/registrations',a.token)).data;
  assert.ok(registrations.some((row) => row.member_email === 'member0@example.com' && row.attended));
  assert.equal((await api('/demo/session',b.token)).data.progress.attendance,'Pending');
  assert.equal((await api(`/attendance-requests/${a.records.attendanceRequest}/reject`,a.token,'PUT',{})).status,409);
});
test('tournament result changes standings and next round persists',async () => {
  const path = `/competitions/${a.records.activeCompetition}/tournament`;
  const before = (await api(path,a.token)).data.categories[0];
  const match = before.matches.find((row) => row.result === 'Scheduled');
  const generate = `/competitions/${a.records.activeCompetition}/categories/${a.records.activeCategory}/rounds/generate`;
  assert.equal((await api(generate,a.token,'POST',{})).status,400);
  assert.equal((await api(`/competitions/matches/${match.id}/result`,a.token,'PUT',{result:'White Win'})).status,200);
  const updated = (await api(path,a.token)).data.categories[0];
  assert.notDeepEqual(updated.standings,before.standings);
  assert.equal((await api('/demo/session',a.token)).data.progress.tournament,true);
  assert.equal((await api(generate,a.token,'POST',{})).status,201);
  assert.equal((await api(path,a.token)).data.categories[0].rounds.length,3);
  assert.equal((await api(path,b.token)).data.categories[0].rounds.length,2);
  assert.equal((await api('/competitions/matches/999999/result',a.token,'PUT',{result:'Black Win'})).status,403);
});
test('auth and administrative routes deny direct calls and forged claims',async () => {
  for (const path of ['/auth/login','/auth/register','/auth/oauth-demo','/auth/google','/auth/reset-password','/users/me/password','/events','/competitions','/notifications/announcements']) {
    assert.equal((await api(path,a.token,'POST',{})).status,403,path);
  }
  assert.equal((await api('/demo/persona',a.token,'POST',{persona:'organiser',userId:1})).status,400);
  const forged = jwt.sign({sid:randomUUID(),persona:'Captain'},process.env.JWT_SECRET_KEY,{audience:'tourney-demo'});
  assert.equal((await api('/events',forged)).status,401);
  const invalid = jwt.sign({sid:randomUUID(),persona:'organiser'},'wrong-key',{audience:'tourney-demo'});
  assert.equal((await api('/events',invalid)).status,401);
  const response = await fetch(base+'/demo/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://outside.example'},body:'{}'});
  assert.equal(response.status,403);
});
test('query errors and transaction rollback do not leak a pooled schema',async () => {
  const aa = (await sessions.authenticate(a.token)).row;
  const bb = (await sessions.authenticate(b.token)).row;
  await context.run({id:aa.id},async () => {
    await assert.rejects(db.query('SELECT * FROM absent_table'));
    const client = await db.connect();
    await client.query('BEGIN');
    await client.query("UPDATE users SET name='ROLLED BACK' WHERE id=$1",[a.records.member]);
    await client.query('ROLLBACK');
    await client.release();
  });
  const checks = await Promise.all(Array.from({length:20},(_,i) => context.run({id:i%2 ? aa.id : bb.id},async () => {
    const row = (await db.query('SELECT current_schema() AS schema, name FROM users WHERE id=$1',[a.records.member])).rows[0];
    assert.equal(row.schema,i%2 ? aa.schema_name : bb.schema_name);
    assert.equal(row.name,'Demo Member');
  })));
  assert.equal(checks.length,20);
  await assert.rejects(db.query('SELECT 1'),/requires a session/);
});
test('reset revokes old token, leaves other session intact and enforces rate limit',async () => {
  const reset = await api('/demo/reset',a.token,'POST',{});
  assert.equal(reset.status,200); assert.ok(reset.data.token);
  assert.equal((await api('/events',a.token)).status,401);
  assert.equal((await api('/events',b.token)).status,200);
  assert.equal((await api('/demo/session',reset.data.token)).data.progress.signup,'Not registered');
  await api('/demo/session',null,'POST',{});
  await api('/demo/session',null,'POST',{});
  assert.equal((await api('/demo/session',null,'POST',{})).status,429);
});
test('capacity, expiry, restart maintenance and locked cleanup are bounded',async () => {
  while ((await db.control.query('SELECT count(*)::integer AS n FROM demo_control.sessions')).rows[0].n < 10) await sessions.create(randomUUID());
  await assert.rejects(sessions.create(randomUUID()),{status:503});
  const row = (await sessions.authenticate(b.token)).row;
  const client = await context.run({id:row.id},() => db.connect());
  await db.control.query('UPDATE demo_control.sessions SET expires_at=now()-interval \'1 second\' WHERE id=$1',[row.id]);
  await sessions.maintenance();
  assert.equal((await db.control.query('SELECT 1 FROM demo_control.sessions WHERE id=$1',[row.id])).rowCount,1);
  await client.release();
  await sessions.maintenance();
  assert.equal((await db.control.query('SELECT 1 FROM demo_control.sessions WHERE id=$1',[row.id])).rowCount,0);
  assert.equal((await api('/events',b.token)).status,401);
  assert.equal((await db.control.query('SELECT count(*)::integer AS n FROM demo_control.sessions')).rows[0].n,9);
  const name = process.env.DEMO_DATABASE_NAME;
  process.env.DEMO_DATABASE_NAME = 'another_database';
  await assert.rejects(sessions.maintenance(),/dedicated/);
  process.env.DEMO_DATABASE_NAME = name;
});
