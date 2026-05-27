const express = require("express");
const router = express.Router();
const attendanceRequestController = require("../controllers/attendanceRequestController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, attendanceRequestController.readPending);
router.post("/events/:registration_id", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, attendanceRequestController.createEventRequest);
router.post("/competitions/:registration_id", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, attendanceRequestController.createCompetitionRequest);
router.put("/:request_id/approve", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, attendanceRequestController.approve);
router.put("/:request_id/reject", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, attendanceRequestController.reject);

module.exports = router;
