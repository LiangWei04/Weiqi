const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/", jwtMiddleware.verifyToken, eventController.readAll);
router.post("/", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, eventController.createEvent);
router.get("/:event_id/comments", jwtMiddleware.verifyToken, eventController.readComments);
router.post("/:event_id/comments", jwtMiddleware.verifyToken, eventController.createComment);
router.put("/comments/:comment_id", jwtMiddleware.verifyToken, eventController.updateComment);
router.delete("/comments/:comment_id", jwtMiddleware.verifyToken, eventController.deleteComment);
router.put("/:event_id/reaction", jwtMiddleware.verifyToken, eventController.updateReaction);
router.delete("/:event_id/reaction", jwtMiddleware.verifyToken, eventController.deleteReaction);
router.put("/:event_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, eventController.updateEventById);
router.delete("/:event_id", jwtMiddleware.verifyToken, jwtMiddleware.requireEventManager, eventController.deleteEventById);
router.post("/:event_id/register", jwtMiddleware.verifyToken, eventController.registerForEvent);

module.exports = router;
