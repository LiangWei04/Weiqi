const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get(
  "/stats",
  jwtMiddleware.verifyToken,
  jwtMiddleware.requireAttendanceManager,
  dashboardController.readStats
);
router.get("/member-stats", jwtMiddleware.verifyToken, dashboardController.readMemberStats);

module.exports = router;
