const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registrationController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, registrationController.readAll);
router.put("/:registration_id/attendance", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, registrationController.updateAttendance);
router.put("/:registration_id/approve", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, registrationController.approveRegistration);
router.put("/:registration_id/reject", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, registrationController.rejectRegistration);
router.delete("/:registration_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, registrationController.deleteRegistration);

module.exports = router;
