const express = require("express");
const router = express.Router();
const competitionController = require("../controllers/competitionController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/options", jwtMiddleware.verifyToken, competitionController.readOptions);
router.get("/", jwtMiddleware.verifyToken, competitionController.readAll);
router.post("/", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.createCompetition);
router.get("/registrations", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, competitionController.readRegistrations);
router.put("/registrations/:registration_id/status", jwtMiddleware.verifyToken, jwtMiddleware.requireMemberManager, competitionController.updateRegistrationStatus);
router.put("/registrations/:registration_id/attendance", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, competitionController.updateRegistrationAttendance);
router.delete("/registrations/:registration_id", jwtMiddleware.verifyToken, jwtMiddleware.requireMemberManager, competitionController.deleteRegistration);
router.put("/matches/:match_id/result", jwtMiddleware.verifyToken, jwtMiddleware.requireAttendanceManager, competitionController.updateMatchResult);
router.get("/:competition_id/tournament", jwtMiddleware.verifyToken, competitionController.readTournament);
router.post("/:competition_id/categories/:category_id/rounds/generate", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.generateRound);
router.get("/:competition_id", jwtMiddleware.verifyToken, competitionController.readById);
router.put("/:competition_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.updateCompetitionById);
router.delete("/:competition_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.deleteCompetitionById);
router.post("/:competition_id/categories", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.createCategory);
router.put("/categories/:category_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, competitionController.updateCategory);
router.post("/categories/:category_id/register", jwtMiddleware.verifyToken, competitionController.registerForCategory);

module.exports = router;
