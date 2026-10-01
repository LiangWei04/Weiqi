require('dotenv').config();
if (process.env.DEMO_MODE !== 'true') throw new Error('Set DEMO_MODE=true for explicit demo setup');
const db = require('../src/services/db');
require('../src/services/demoSessions').setup()
  .then(() => console.log('Dedicated demo database ready'))
  .catch(() => { console.error('Demo setup failed; verify the dedicated database and configuration.'); process.exitCode = 1; })
  .finally(() => db.end());
