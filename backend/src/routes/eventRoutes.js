const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/", jwtMiddleware.verifyToken, eventController.readAll);
router.post("/", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, eventController.createEvent);
router.put("/:event_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, eventController.updateEventById);
router.delete("/:event_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, eventController.deleteEventById);
router.post("/:event_id/register", jwtMiddleware.verifyToken, eventController.registerForEvent);

module.exports = router;
