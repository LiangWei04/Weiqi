const express = require("express");
const sessions = require("../services/demoSessions");
const context = require("../services/demoContext");
const db = require("../services/db");
const router = express.Router();

router.use((req,res,next) => {
  res.setHeader('Cache-Control','no-store');
  const json = res.json.bind(res);
  res.json = (body) => json(res.statusCode >= 500 && res.statusCode !== 503 ? { message:'The demo could not complete this request. Please try again.' } : body);
  if (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ message:'Use the demo from this website.' });
  next();
});

router.post('/demo/session', async (req,res) => {
  if (Object.keys(req.body || {}).length) return res.status(400).json({ message:'Session creation does not accept identity details.' });
  const session = await sessions.create(req.ip);
  res.status(201).json(sessions.response(session,'organiser'));
});

router.use(async (req,res,next) => {
  if (req.path.startsWith('/auth/') && req.path !== '/auth/me') return res.status(403).json({ message:'Account access is disabled in this fictional demo.' });
  const { row, persona } = await sessions.authenticate(req.headers.authorization?.replace(/^Bearer /,''));
  res.locals.demoSession = row;
  res.locals.demoPersona = persona;
  res.locals.userId = row.records[persona];
  res.locals.role = persona === 'organiser' ? 'Captain' : 'Member';
  context.run({ id:row.id }, next);
});

router.get('/demo/session', async (req,res) => {
  const session = res.locals.demoSession;
  const r = session.records;
  const signup = (await db.query('SELECT id,status FROM event_registrations WHERE event_id=$1 AND user_id=$2',[r.workshop,r.member])).rows[0];
  const attendance = (await db.query('SELECT id,status,reviewed_at,reviewed_by FROM attendance_change_requests WHERE id=$1',[r.attendanceRequest])).rows[0];
  const tournament = (await db.query("SELECT count(*) FILTER (WHERE result='Scheduled')::integer AS remaining FROM competition_matches WHERE competition_id=$1 AND round_id=(SELECT id FROM competition_rounds WHERE competition_id=$1 AND round_number=2)",[r.activeCompetition])).rows[0];
  const payload = sessions.response(session,res.locals.demoPersona);
  delete payload.token;
  res.json({ ...payload, progress:{ signup:signup?.status || 'Not registered', signupRegistration:signup?.id, attendance:attendance?.status, reviewedAt:attendance?.reviewed_at, tournament:tournament.remaining === 0 } });
});

router.post('/demo/persona', (req,res) => {
  if (!['organiser','member'].includes(req.body?.persona) || Object.keys(req.body).some((key) => key !== 'persona')) return res.status(400).json({ message:'Choose Organiser or Member.' });
  res.json(sessions.response(res.locals.demoSession,req.body.persona));
});
router.post('/demo/reset', async (req,res) => {
  if (Object.keys(req.body || {}).length) return res.status(400).json({ message:'Reset does not accept identity details.' });
  res.json(sessions.response(await sessions.create(req.ip,res.locals.demoSession.id),'organiser'));
});

// Deny by default: hiding controls is not an authorization boundary.
router.use(async (req,res,next) => {
  const path = req.path.replace(/\/$/,'');
  const r = res.locals.demoSession.records;
  if (req.method === 'GET' && /^(\/auth\/me|\/users(?:\/me\/settings)?|\/events|\/events\/\d+\/comments|\/competitions(?:\/options|\/registrations|\/\d+(?:\/tournament)?)?|\/registrations|\/dashboard\/(?:stats|member-stats)|\/notifications(?:\/my-activities)?|\/attendance-requests)$/.test(path)) return next();
  if (req.method === 'PUT' && /^\/notifications\/\d+\/read$/.test(path)) return next();
  if (req.method === 'POST' && path === `/events/${r.workshop}/register` && res.locals.demoPersona === 'member') return next();
  if (res.locals.demoPersona === 'organiser') {
    if (req.method === 'PUT' && new RegExp(`^/attendance-requests/${r.attendanceRequest}/(approve|reject)$`).test(path)) return next();
    const approval = path.match(/^\/registrations\/(\d+)\/(approve|reject)$/);
    if (req.method === 'PUT' && approval) {
      const result = await db.query('SELECT 1 FROM event_registrations WHERE id=$1 AND event_id=$2 AND user_id=$3',[approval[1],r.workshop,r.member]);
      if (result.rowCount) return next();
    }
    const match = path.match(/^\/competitions\/matches\/(\d+)\/result$/);
    if (req.method === 'PUT' && match) {
      const result = await db.query('SELECT 1 FROM competition_matches WHERE id=$1 AND competition_id=$2 AND category_id=$3',[match[1],r.activeCompetition,r.activeCategory]);
      if (result.rowCount) return next();
    }
    if (req.method === 'POST' && path === `/competitions/${r.activeCompetition}/categories/${r.activeCategory}/rounds/generate`) {
      const rounds = await db.query('SELECT count(*)::integer AS count FROM competition_rounds WHERE competition_id=$1',[r.activeCompetition]);
      if (rounds.rows[0].count >= 3) return res.status(409).json({ message:'The three-round demo is complete. Reset to try again.' });
      return next();
    }
  }
  return res.status(403).json({ message:'This action is outside the interactive demo. Try one of the three guided scenarios.' });
});

module.exports = router;
