const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/", jwtMiddleware.verifyToken, notificationController.readMine);
router.put("/:notification_id/read", jwtMiddleware.verifyToken, notificationController.markRead);
router.post("/announcements", jwtMiddleware.verifyToken, jwtMiddleware.requireAdmin, notificationController.createAnnouncement);
router.get("/my-activities", jwtMiddleware.verifyToken, notificationController.readMyUpcomingActivities);

module.exports = router;
