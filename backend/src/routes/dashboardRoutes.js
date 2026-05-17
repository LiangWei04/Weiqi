const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/stats", jwtMiddleware.verifyToken, dashboardController.readStats);

module.exports = router;
