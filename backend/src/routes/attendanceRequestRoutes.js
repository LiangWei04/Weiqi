const express = require("express");
const router = express.Router();
const attendanceRequestController = require("../controllers/attendanceRequestController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

const validateId = (req, res, next, value) => {
  if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    return res.status(400).json({ code: "INVALID_ID", message: "A positive integer ID is required." });
  }
  return next();
};
router.param("request_id", validateId);
router.param("registration_id", validateId);

router.get("/", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, attendanceRequestController.readPending);
router.post("/events/:registration_id", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, attendanceRequestController.createEventRequest);
router.post("/competitions/:registration_id", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, attendanceRequestController.createCompetitionRequest);
router.post("/:request_id/replacements", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, attendanceRequestController.replace);
router.put("/:request_id/approve", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, attendanceRequestController.approve);
router.put("/:request_id/reject", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, attendanceRequestController.reject);

module.exports = router;
