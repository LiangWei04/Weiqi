const express = require("express");
const router = express.Router();
const competitionController = require("../controllers/competitionController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/options", jwtMiddleware.verifyToken, competitionController.readOptions);
router.get("/", jwtMiddleware.verifyToken, competitionController.readAll);
router.post("/", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.createCompetition);
router.get("/registrations", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, competitionController.readRegistrations);
router.put("/registrations/:registration_id/status", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.updateRegistrationStatus);
router.put("/registrations/:registration_id/attendance", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, competitionController.updateRegistrationAttendance);
router.delete("/registrations/:registration_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.deleteRegistration);
router.get("/:competition_id", jwtMiddleware.verifyToken, competitionController.readById);
router.put("/:competition_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.updateCompetitionById);
router.delete("/:competition_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.deleteCompetitionById);
router.post("/:competition_id/categories", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.createCategory);
router.post("/categories/:category_id/register", jwtMiddleware.verifyToken, competitionController.registerForCategory);

module.exports = router;
