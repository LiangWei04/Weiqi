const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const mainRoutes = require("./routes/mainRoutes");

const app = express();
const reactDistPath = path.join(__dirname, "../../react-user-dashboard/dist");

if (process.env.DEMO_MODE !== "true") app.use(cors());
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.DEMO_MODE === "true") app.use("/api", require('./middlewares/demoMiddleware'));
app.use("/api", mainRoutes);
app.use("/api", (error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('API request failed:', error.status || error.code || error.name);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to complete this request.' });
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

app.use(express.static(reactDistPath, {
  index: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
  },
}));

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  const reactIndexPath = path.join(reactDistPath, "index.html");

  res.sendFile(reactIndexPath, (error) => {
    if (error) {
      res.status(503).json({
        message: "React build not found. Run npm run build in react-user-dashboard first.",
      });
    }
  });
});

module.exports = app;
