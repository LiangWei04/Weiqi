const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/me/settings", jwtMiddleware.verifyToken, userController.readOwnSettings);
router.put("/me/settings", jwtMiddleware.verifyToken, userController.updateOwnSettings);
router.put("/me/profile", jwtMiddleware.verifyToken, userController.updateOwnProfile);
router.put("/me/password", jwtMiddleware.verifyToken, userController.changeOwnPassword);
router.post("/me/resend-verification", jwtMiddleware.verifyToken, userController.resendVerificationEmail);
router.put("/me/deactivate", jwtMiddleware.verifyToken, userController.deactivateOwnAccount);
router.get("/", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, userController.readAll);
router.put("/:user_id/role", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, userController.assignRoleById);
router.get("/:user_id", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, userController.readUserById);
router.put("/:user_id", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, userController.updateUserById);
router.delete("/:user_id", jwtMiddleware.verifyToken, jwtMiddleware.requireCaptain, userController.deleteUserById);

module.exports = router;
