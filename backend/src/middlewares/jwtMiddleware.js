require("dotenv").config();
const jwt = require("jsonwebtoken");
const db = require("../services/db");

const secretKey = require("../configs/signingKey");
const tokenDuration = process.env.JWT_EXPIRES_IN || "1d";
const tokenAlgorithm = process.env.JWT_ALGORITHM || "HS256";

module.exports.generateToken = (req, res, next) => {
  const payload = {
    userId: res.locals.userId,
    role: res.locals.role,
    timestamp: new Date(),
  };

  const options = {
    algorithm: tokenAlgorithm,
    expiresIn: tokenDuration,
  };

  jwt.sign(payload, secretKey, options, (err, token) => {
    if (err) {
      console.error("Error jwt:", err);
      return res.status(500).json(err);
    }

    res.locals.token = token;
    return next();
  });
};

module.exports.sendToken = (req, res) => {
  const payload = {
    message: res.locals.message,
    token: res.locals.token,
    userId: res.locals.userId,
    role: res.locals.role,
  };

  if (res.locals.verificationLink) {
    payload.verificationLink = res.locals.verificationLink;
  }

  res.status(200).json(payload);
};

module.exports.verifyToken = (req, res, next) => {
  if (process.env.DEMO_MODE === "true") {
    if (!res.locals.demoSession) return res.status(401).json({ message: "Start a demo session first." });
    return next();
  }
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.substring(7);

  jwt.verify(token, secretKey, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    try {
      const result = await db.query(
        "SELECT id, role, active FROM users WHERE id = $1",
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "User no longer exists" });
      }

      if (result.rows[0].active === false) {
        return res.status(403).json({ error: "Account is inactive" });
      }

      res.locals.userId = result.rows[0].id;
      res.locals.role = result.rows[0].role;
      res.locals.tokenTimestamp = decoded.timestamp;
      return next();
    } catch (error) {
      console.error("Error verifyToken role refresh:", error);
      return res.status(500).json(error);
    }
  });
};

module.exports.requireAdmin = (req, res, next) => {
  if (!["Captain", "Vice-Captain", "Secretary"].includes(res.locals.role)) {
    return res.status(403).json({ error: "Captain, Vice-Captain or Secretary role required" });
  }

  return next();
};

module.exports.requireCaptain = (req, res, next) => {
  if (res.locals.role !== "Captain") {
    return res.status(403).json({ error: "Captain role required" });
  }

  return next();
};

module.exports.requireEventManager = (req, res, next) => {
  if (!["Captain", "Vice-Captain"].includes(res.locals.role)) {
    return res.status(403).json({ error: "Captain or Vice-Captain role required" });
  }

  return next();
};

module.exports.requireMemberManager = (req, res, next) => {
  if (!["Captain", "Secretary"].includes(res.locals.role)) {
    return res.status(403).json({ error: "Captain or Secretary role required" });
  }

  return next();
};

module.exports.requireAttendanceManager = (req, res, next) => {
  if (!["Captain", "Vice-Captain", "Secretary"].includes(res.locals.role)) {
    return res.status(403).json({ error: "Captain, Vice-Captain or Secretary role required" });
  }

  return next();
};
