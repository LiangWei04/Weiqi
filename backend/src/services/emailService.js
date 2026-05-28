const nodemailer = require("nodemailer");

const hasEmailConfig = () => Boolean(
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
);

const createTransporter = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 7000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports.sendVerificationEmail = async ({ to, name, verificationLink }) => {
  if (!hasEmailConfig()) {
    return {
      sent: false,
      reason: "Email SMTP settings are not configured.",
    };
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your Weiqi CCA account",
    text: [
      `Hi ${name || "there"},`,
      "",
      "Please verify your Weiqi CCA account by opening this link:",
      verificationLink,
      "",
      "This link will expire in 24 hours.",
    ].join("\n"),
    html: `
      <p>Hi ${name || "there"},</p>
      <p>Please verify your Weiqi CCA account by clicking the link below:</p>
      <p><a href="${verificationLink}">Verify my email</a></p>
      <p>This link will expire in 24 hours.</p>
    `,
  });

  return { sent: true };
};

module.exports.sendPasswordResetCodeEmail = async ({ to, name, resetCode }) => {
  if (!hasEmailConfig()) {
    return {
      sent: false,
      reason: "Email SMTP settings are not configured.",
    };
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Your TourneysHub password reset code",
    text: [
      `Hi ${name || "there"},`,
      "",
      "Use this verification code to reset your TourneysHub password:",
      resetCode,
      "",
      "This code will expire in 15 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>Hi ${name || "there"},</p>
      <p>Use this verification code to reset your TourneysHub password:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${resetCode}</p>
      <p>This code will expire in 15 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });

  return { sent: true };
};

module.exports.sendActivityChangeEmail = async ({ to, name, activityType, activityTitle, action, reason }) => {
  if (!hasEmailConfig()) {
    return {
      sent: false,
      reason: "Email SMTP settings are not configured.",
    };
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const subject = `${activityType} ${action}: ${activityTitle}`;
  const isRegistrationRejection = action === "Registration Rejected";
  const activitySentence = isRegistrationRejection
    ? `Your registration request for the ${activityType.toLowerCase()} "${activityTitle}" has been rejected.`
    : `The ${activityType.toLowerCase()} "${activityTitle}" has been ${action.toLowerCase()}.`;
  const activityHtml = isRegistrationRejection
    ? `Your registration request for the ${activityType.toLowerCase()} <strong>${activityTitle}</strong> has been rejected.`
    : `The ${activityType.toLowerCase()} <strong>${activityTitle}</strong> has been ${action.toLowerCase()}.`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text: [
      `Hi ${name || "there"},`,
      "",
      activitySentence,
      "",
      "Reason:",
      reason,
      "",
      "Please check TourneysHub for the latest details.",
    ].join("\n"),
    html: `
      <p>Hi ${name || "there"},</p>
      <p>${activityHtml}</p>
      <p><strong>Reason:</strong></p>
      <p>${reason}</p>
      <p>Please check TourneysHub for the latest details.</p>
    `,
  });

  return { sent: true };
};
