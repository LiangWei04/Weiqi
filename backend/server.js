const app = require("./src/app");
const db = require("./src/services/db");

const PORT = process.env.PORT || 3000;

const prepare = async () => {
  if (process.env.DEMO_MODE === 'true') {
    const sessions = require('./src/services/demoSessions');
    await sessions.maintenance();
    setInterval(() => sessions.maintenance().catch(() => console.error('Demo cleanup failed')), 60000).unref();
  } else {
    // Schema setup is an explicit operator action, never a startup side effect.
    await db.query('SELECT 1');
  }
};

prepare()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`App listening to port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
