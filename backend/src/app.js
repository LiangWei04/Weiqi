const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const mainRoutes = require("./routes/mainRoutes");

const app = express();
const reactDistPath = path.join(__dirname, "../../react-user-dashboard/dist");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", mainRoutes);

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
