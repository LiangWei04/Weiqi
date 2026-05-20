const express = require("express");
const router = express.Router();
const bcryptMiddleware = require("../middlewares/bcryptMiddleware");
const jwtMiddleware = require("../middlewares/jwtMiddleware");
const userController = require("../controllers/userController");
const userRoutes = require("./userRoutes");
const eventRoutes = require("./eventRoutes");
const registrationRoutes = require("./registrationRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const competitionRoutes = require("./competitionRoutes");
const notificationRoutes = require("./notificationRoutes");

router.post(
  "/auth/login",
  userController.login,
  bcryptMiddleware.comparePassword,
  jwtMiddleware.generateToken,
  jwtMiddleware.sendToken
);

router.post(
  "/auth/register",
  userController.checkEmailExist,
  bcryptMiddleware.hashPassword,
  userController.register
);

router.post(
  "/auth/oauth-demo",
  userController.oauthDemo,
  jwtMiddleware.generateToken,
  jwtMiddleware.sendToken
);

router.get("/auth/google", userController.startGoogleOAuth);
router.get(
  "/auth/google/callback",
  userController.handleGoogleOAuthCallback,
  jwtMiddleware.generateToken,
  userController.redirectOAuthSuccess
);

router.post("/auth/forgot-password", userController.forgotPassword);
router.post("/auth/verify-email", userController.verifyEmail);
router.get("/auth/me", jwtMiddleware.verifyToken, userController.getMe);

router.use("/users", userRoutes);
router.use("/events", eventRoutes);
router.use("/competitions", competitionRoutes);
router.use("/registrations", registrationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
