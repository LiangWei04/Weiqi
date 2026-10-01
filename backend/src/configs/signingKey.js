require("dotenv").config();
const key = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
if ((process.env.DEMO_MODE === "true" || process.env.NODE_ENV === "production") && (!key || key.length < 32 || key === "dev-secret-change-me")) {
  throw new Error("Hosted operation requires a signing secret of at least 32 characters.");
}
module.exports = key || "dev-secret-change-me";
