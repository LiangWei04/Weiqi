const app = require("./src/app");
const db = require("./src/services/db");
const initTables = require("./src/configs/initTables");

const PORT = process.env.PORT || 3000;

db.ensureDatabase()
  .then(initTables)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`App listening to port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
