const model = require("../models/userModel");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const emailService = require("../services/emailService");

const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  username: row.username,
  email: row.email,
  role: row.role,
  active: row.active,
  status: row.status,
  emailVerified: row.email_verified,
  authProvider: row.auth_provider,
  createdAt: row.created_at,
});

const getFrontendBaseUrl = (req) => {
  return (process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
};

const publicSettings = (row) => ({
  notifyRegistrationUpdate: row.notify_registration_update,
  notifyEventReminder: row.notify_event_reminder,
  notifyAttendanceMarked: row.notify_attendance_marked,
  defaultRequiresApproval: row.default_requires_approval,
  defaultEventCapacity: row.default_event_capacity,
  defaultCompetitionVenue: row.default_competition_venue || "",
});

module.exports.login = (req, res, next) => {
  const identifier = req.body.identifier || req.body.email || req.body.username;

  if (!identifier || identifier.trim() === "") {
    return res.status(400).json({ message: "username or email is undefined or empty" });
  }

  if (!req.body.password || req.body.password === "") {
    return res.status(400).json({ message: "password is undefined or empty" });
  }

  const data = { identifier: identifier.trim() };

  model.readUserByIdentifier(data, (error, results) => {
    if (error) {
      console.error("Error login callback:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0 || !results.rows[0].password_hash) {
      return res.status(404).json({ message: "User not found" });
    }

    if (results.rows[0].active === false) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    if (results.rows[0].email_verified === false) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    res.locals.userId = results.rows[0].id;
    res.locals.role = results.rows[0].role;
    res.locals.hash = results.rows[0].password_hash;
    res.locals.message = "Login successful";
    return next();
  });
};

module.exports.checkEmailExist = (req, res, next) => {
  if (!req.body.email || req.body.email.trim() === "") {
    return res.status(400).json({ message: "email is undefined or empty" });
  }

  if (!req.body.password || req.body.password === "") {
    return res.status(400).json({ message: "password is undefined or empty" });
  }

  const username = (req.body.username || req.body.email.split("@")[0]).trim().toLowerCase();
  if (!/^[a-z0-9_]{3,80}$/.test(username)) {
    return res.status(400).json({ message: "username must be 3-80 characters and use only letters, numbers or underscore" });
  }

  const data = {
    email: req.body.email.trim().toLowerCase(),
    username,
  };

  model.readUserByEmail(data, (error, results) => {
    if (error) {
      console.error("Error readUserByEmail callback:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length !== 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    model.readUserByUsername(data, (usernameError, usernameResults) => {
      if (usernameError) {
        console.error("Error readUserByUsername callback:", usernameError);
        return res.status(500).json(usernameError);
      }

      if (usernameResults.rows.length !== 0) {
        return res.status(409).json({ message: "Username already exists" });
      }

      res.locals.username = username;
      return next();
    });
  });
};

module.exports.register = (req, res) => {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const data = {
    name: req.body.name || "CCA Member",
    username: res.locals.username,
    email: req.body.email.trim().toLowerCase(),
    password: res.locals.hash,
    verificationToken,
  };

  model.register(data, async (error, results) => {
    if (error) {
      console.error("Error register callback:", error);
      return res.status(500).json(error);
    }

    const appBaseUrl = getFrontendBaseUrl(req);
    const verificationLink = `${appBaseUrl}/verify-email?token=${verificationToken}`;

    try {
      const emailResult = await emailService.sendVerificationEmail({
        to: data.email,
        name: data.name,
        verificationLink,
      });

      return res.status(201).json({
        message: emailResult.sent
          ? "Account created. Please check your email to verify your account. Please check your spam if it's not in inbox."
          : "Account created. Email sending is not configured yet.",
        emailSent: emailResult.sent,
        verificationLink: emailResult.sent ? undefined : verificationLink,
      });
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      return res.status(201).json({
        message: "Account created, but the verification email could not be sent.",
        emailSent: false,
        emailError: "Check SMTP settings in .env and try registering again.",
        verificationLink,
      });
    }
  });
};

module.exports.forgotPassword = async (req, res) => {
  const identifier = req.body.identifier || req.body.email || req.body.username;
  if (!identifier || identifier.trim() === "") {
    return res.status(400).json({ message: "username or email is undefined or empty" });
  }

  const email = identifier.trim().toLowerCase();
  const resetCode = String(crypto.randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(resetCode, 10);

  model.setPasswordResetCodeByEmail({ email, codeHash }, async (error, results) => {
    if (error) {
      console.error("Error setPasswordResetCodeByEmail:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(200).json({
        message: "If this email is registered, a password reset code will be sent.",
      });
    }

    const user = results.rows[0];
    try {
      const emailResult = await emailService.sendPasswordResetCodeEmail({
        to: user.email,
        name: user.name,
        resetCode,
      });

      return res.status(200).json({
        message: emailResult.sent
          ? "Password reset code sent. Please check your email."
          : "Email sending is not configured yet.",
        emailSent: emailResult.sent,
        resetCode: emailResult.sent ? undefined : resetCode,
      });
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      return res.status(200).json({
        message: "Could not send the reset email. Check SMTP settings and try again.",
        emailSent: false,
      });
    }
  });
};

module.exports.resetPassword = (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const resetCode = (req.body.code || req.body.resetCode || "").trim();
  const newPassword = req.body.password || req.body.newPassword || "";

  if (!email) {
    return res.status(400).json({ message: "email is undefined or empty" });
  }

  if (!/^\d{6}$/.test(resetCode)) {
    return res.status(400).json({ message: "Reset code must be 6 digits" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "new password must be at least 8 characters" });
  }

  model.readPasswordResetByEmail({ email }, async (error, results) => {
    if (error) {
      console.error("Error readPasswordResetByEmail:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(400).json({ message: "Reset code is invalid or expired" });
    }

    const user = results.rows[0];
    if (!user.active) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    if (!user.password_reset_code_hash || !user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ message: "Reset code is invalid or expired" });
    }

    const isCodeValid = await bcrypt.compare(resetCode, user.password_reset_code_hash);
    if (!isCodeValid) {
      return res.status(400).json({ message: "Reset code is invalid or expired" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    model.updatePasswordById({ user_id: user.id, passwordHash }, (updateError) => {
      if (updateError) {
        console.error("Error resetPassword updatePasswordById:", updateError);
        return res.status(500).json(updateError);
      }

      return res.status(200).json({ message: "Password reset successfully. You can now login." });
    });
  });
};

module.exports.verifyEmail = (req, res) => {
  const token = req.body.token || req.query.token;

  if (!token || token.trim() === "") {
    return res.status(400).json({ message: "verification token is missing" });
  }

  model.markEmailVerifiedByToken({ token: token.trim() }, (error, results) => {
    if (error) {
      console.error("Error verifyEmail:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(400).json({ message: "Verification link is invalid or expired" });
    }

    return res.status(200).json({
      message: "Email verified successfully",
      user: publicUser(results.rows[0]),
    });
  });
};

module.exports.getMe = (req, res) => {
  model.selectById({ user_id: res.locals.userId }, (error, results) => {
    if (error) {
      console.error("Error getMe:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(publicUser(results.rows[0]));
  });
};

module.exports.updateOwnProfile = (req, res) => {
  const name = (req.body.name || "").trim();
  const username = (req.body.username || "").trim().toLowerCase();

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  if (!/^[a-z0-9_]{3,80}$/.test(username)) {
    return res.status(400).json({ message: "username must be 3-80 characters and use only letters, numbers or underscore" });
  }

  model.updateOwnProfile({ user_id: res.locals.userId, name, username }, (error, results) => {
    if (error) {
      console.error("Error updateOwnProfile:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(409).json({ message: "Username already exists" });
    }

    return res.status(200).json(publicUser(results.rows[0]));
  });
};

module.exports.changeOwnPassword = (req, res) => {
  const currentPassword = req.body.currentPassword || "";
  const newPassword = req.body.newPassword || "";

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "new password must be at least 8 characters" });
  }

  model.selectPrivateById({ user_id: res.locals.userId }, async (error, results) => {
    if (error) {
      console.error("Error changeOwnPassword:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!results.rows[0].password_hash) {
      return res.status(400).json({ message: "This account does not have a local password" });
    }

    const isMatch = await bcrypt.compare(currentPassword, results.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    model.updatePasswordById({ user_id: res.locals.userId, passwordHash }, (updateError, updateResults) => {
      if (updateError) {
        console.error("Error updatePasswordById:", updateError);
        return res.status(500).json(updateError);
      }

      return res.status(200).json({
        message: "Password updated",
        user: publicUser(updateResults.rows[0]),
      });
    });
  });
};

module.exports.readOwnSettings = (req, res) => {
  model.selectSettingsByUserId({ user_id: res.locals.userId }, (error, results) => {
    if (error) {
      console.error("Error readOwnSettings:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(publicSettings(results.rows[0]));
  });
};

module.exports.updateOwnSettings = (req, res) => {
  const defaultEventCapacity = Number(req.body.defaultEventCapacity || 20);

  if (!Number.isInteger(defaultEventCapacity) || defaultEventCapacity <= 0) {
    return res.status(400).json({ message: "default event capacity must be a positive number" });
  }

  const data = {
    user_id: res.locals.userId,
    notifyRegistrationUpdate: Boolean(req.body.notifyRegistrationUpdate),
    notifyEventReminder: Boolean(req.body.notifyEventReminder),
    notifyAttendanceMarked: Boolean(req.body.notifyAttendanceMarked),
    defaultRequiresApproval: Boolean(req.body.defaultRequiresApproval),
    defaultEventCapacity,
    defaultCompetitionVenue: (req.body.defaultCompetitionVenue || "").trim() || null,
  };

  model.upsertSettings(data, (error, results) => {
    if (error) {
      console.error("Error updateOwnSettings:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(publicSettings(results.rows[0]));
  });
};

module.exports.resendVerificationEmail = (req, res) => {
  model.selectById({ user_id: res.locals.userId }, (error, results) => {
    if (error) {
      console.error("Error resendVerificationEmail select:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (results.rows[0].email_verified) {
      return res.status(200).json({ message: "Email is already verified", emailSent: false });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    model.setVerificationTokenById({ user_id: res.locals.userId, verificationToken }, async (tokenError, tokenResults) => {
      if (tokenError) {
        console.error("Error setVerificationTokenById:", tokenError);
        return res.status(500).json(tokenError);
      }

      const user = tokenResults.rows[0];
      const verificationLink = `${getFrontendBaseUrl(req)}/verify-email?token=${verificationToken}`;
      const emailResult = await emailService.sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationLink,
      });

      return res.status(200).json({
        message: emailResult.sent ? "Verification email sent" : "Email sending is not configured yet",
        emailSent: emailResult.sent,
        verificationLink: emailResult.sent ? undefined : verificationLink,
      });
    });
  });
};

module.exports.oauthDemo = (req, res, next) => {
  const data = {
    name: req.body.name || "OAuth Member",
    email: (req.body.email || "oauth.member@example.com").trim().toLowerCase(),
    provider: req.body.provider || "demo-oauth",
    providerId: req.body.providerId || "demo-provider-id",
  };
  data.username = (req.body.username || data.email.split("@")[0]).trim().toLowerCase();

  model.upsertOAuth(data, (error, results) => {
    if (error) {
      console.error("Error oauthDemo callback:", error);
      return res.status(500).json(error);
    }

    res.locals.userId = results.rows[0].id;
    res.locals.role = results.rows[0].role;
    res.locals.message = "OAuth authentication successful";
    return next();
  });
};

module.exports.startGoogleOAuth = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ message: "Google OAuth is not configured" });
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

module.exports.handleGoogleOAuthCallback = async (req, res, next) => {
  const code = req.query.code;
  const appBaseUrl = getFrontendBaseUrl(req);

  if (!code) {
    return res.redirect(`${appBaseUrl}/?oauth_error=Google authorization code is missing`);
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return res.redirect(`${appBaseUrl}/?oauth_error=Google OAuth is not configured`);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("Google token exchange failed:", tokenData);
      return res.redirect(`${appBaseUrl}/?oauth_error=Google token exchange failed`);
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();

    if (!profileResponse.ok || !profile.email) {
      console.error("Google profile fetch failed:", profile);
      return res.redirect(`${appBaseUrl}/?oauth_error=Google profile fetch failed`);
    }

    const baseUsername = profile.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "googleuser";
    const providerIdSuffix = String(profile.id || "").slice(-6);
    const data = {
      name: profile.name || profile.email,
      email: profile.email.trim().toLowerCase(),
      username: `${baseUsername}_${providerIdSuffix || "google"}`,
      provider: "google",
      providerId: profile.id,
    };

    model.upsertOAuth(data, (error, results) => {
      if (error) {
        console.error("Error Google OAuth upsert:", error);
        return res.redirect(`${appBaseUrl}/?oauth_error=Could not save Google account`);
      }

      res.locals.userId = results.rows[0].id;
      res.locals.role = results.rows[0].role;
      res.locals.message = "Google authentication successful";
      return next();
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return res.redirect(`${appBaseUrl}/?oauth_error=Google OAuth failed`);
  }
};

module.exports.redirectOAuthSuccess = (req, res) => {
  const appBaseUrl = getFrontendBaseUrl(req);
  const params = new URLSearchParams({
    token: res.locals.token,
    userId: String(res.locals.userId),
    role: res.locals.role,
  });

  return res.redirect(`${appBaseUrl}/oauth-callback?${params.toString()}`);
};

module.exports.readAll = (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const data = {
    search: req.query.search || "",
    role: req.query.role || "All",
    status: req.query.status || "All",
    limit,
    offset: (page - 1) * limit,
  };

  model.selectAll(data, (error, results) => {
    if (error) {
      console.error("Error readAll:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json({
      users: results.rows.map(publicUser),
      total: Number(results.rows[0]?.total || 0),
    });
  });
};

module.exports.readUserById = (req, res) => {
  model.selectById({ user_id: req.params.user_id }, (error, results) => {
    if (error) {
      console.error("Error readUserById:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(publicUser(results.rows[0]));
  });
};

module.exports.updateUserById = (req, res) => {
  const data = {
    user_id: req.params.user_id,
    name: req.body.name,
    role: req.body.role,
    status: req.body.status,
    emailVerified: req.body.emailVerified,
    active: req.body.active,
  };

  model.updateById(data, (error, results) => {
    if (error) {
      console.error("Error updateUserById:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(publicUser(results.rows[0]));
  });
};

module.exports.assignRoleById = (req, res) => {
  const allowedRoles = ["Captain", "Vice-Captain", "Secretary", "Member"];
  const role = req.body.role;

  if (Number(req.params.user_id) === Number(res.locals.userId)) {
    return res.status(400).json({ message: "You cannot change your own role" });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const data = {
    user_id: req.params.user_id,
    role,
  };

  model.updateRoleById(data, (error, results) => {
    if (error) {
      console.error("Error assignRoleById:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(publicUser(results.rows[0]));
  });
};

module.exports.deactivateOwnAccount = (req, res) => {
  model.deactivateById({ user_id: res.locals.userId }, (error, results) => {
    if (error) {
      console.error("Error deactivateOwnAccount:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Account deactivated",
      user: publicUser(results.rows[0]),
    });
  });
};

module.exports.deleteUserById = (req, res) => {
  if (Number(req.params.user_id) === Number(res.locals.userId)) {
    return res.status(400).json({ message: "Use deactivate account for your own account" });
  }

  model.deleteById({ user_id: req.params.user_id }, (error, results) => {
    if (error) {
      console.error("Error deleteUserById:", error);
      return res.status(500).json(error);
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(204).send();
  });
};
