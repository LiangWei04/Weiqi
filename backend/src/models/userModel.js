const pool = require("../services/db");

module.exports.selectAll = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT id, name, username, email, role, active, status, email_verified, auth_provider, created_at,
      COUNT(*) OVER() AS total
    FROM users
    WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR username ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
      AND ($2 = 'All' OR role = $2)
      AND ($3 = 'All' OR status = $3)
    ORDER BY created_at DESC
    LIMIT $4 OFFSET $5;
  `;
  const VALUES = [data.search, data.role, data.status, data.limit, data.offset];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectById = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT id, name, username, email, role, active, status, email_verified, auth_provider, created_at
    FROM users
    WHERE id = $1;
  `;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};

module.exports.selectPrivateById = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT id, name, username, email, password_hash, role, active, status, email_verified, auth_provider, created_at
    FROM users
    WHERE id = $1;
  `;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};

module.exports.readUserByEmail = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT id, name, username, email, password_hash, role, active, status, email_verified, auth_provider
    FROM users
    WHERE email = $1;
  `;
  pool.query(SQLSTATEMENT, [data.email], callback);
};

module.exports.readUserByIdentifier = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT id, name, username, email, password_hash, role, active, status, email_verified, auth_provider
    FROM users
    WHERE LOWER(email) = LOWER($1)
       OR LOWER(username) = LOWER($1);
  `;
  pool.query(SQLSTATEMENT, [data.identifier], callback);
};

module.exports.readUserByUsername = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT id, username
    FROM users
    WHERE LOWER(username) = LOWER($1);
  `;
  pool.query(SQLSTATEMENT, [data.username], callback);
};

module.exports.register = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO users (
      name,
      username,
      email,
      password_hash,
      role,
      status,
      email_verified,
      email_verification_token,
      email_verification_expires,
      auth_provider
    )
    VALUES ($1, $2, $3, $4, 'Member', 'Pending Verification', FALSE, $5, NOW() + INTERVAL '24 hours', 'local')
    RETURNING id;
  `;
  const VALUES = [data.name, data.username, data.email, data.password, data.verificationToken];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.upsertOAuth = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO users (name, username, email, password_hash, role, status, email_verified, auth_provider, provider_id)
    VALUES ($1, $2, $3, NULL, 'Member', 'Active', TRUE, $4, $5)
    ON CONFLICT (email) DO UPDATE SET
      status = 'Active',
      email_verified = TRUE,
      auth_provider = EXCLUDED.auth_provider,
      provider_id = EXCLUDED.provider_id
    RETURNING id, role;
  `;
  const VALUES = [data.name, data.username, data.email, data.provider, data.providerId];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.updateById = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE users
    SET name = COALESCE($1, name),
        role = COALESCE($2, role),
        status = COALESCE($3, status),
        email_verified = COALESCE($4, email_verified),
        active = COALESCE($5, active)
    WHERE id = $6
    RETURNING id, name, username, email, role, active, status, email_verified, auth_provider, created_at;
  `;
  const VALUES = [data.name, data.role, data.status, data.emailVerified, data.active, data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.updateOwnProfile = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE users
    SET name = $1,
        username = $2
    WHERE id = $3
      AND NOT EXISTS (
        SELECT 1 FROM users
        WHERE LOWER(username) = LOWER($2)
          AND id <> $3
      )
    RETURNING id, name, username, email, role, active, status, email_verified, auth_provider, created_at;
  `;
  pool.query(SQLSTATEMENT, [data.name, data.username, data.user_id], callback);
};

module.exports.updatePasswordById = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE users
    SET password_hash = $1,
        auth_provider = CASE WHEN auth_provider = 'google' THEN auth_provider ELSE 'local' END
    WHERE id = $2
    RETURNING id, name, username, email, role, active, status, email_verified, auth_provider, created_at;
  `;
  pool.query(SQLSTATEMENT, [data.passwordHash, data.user_id], callback);
};

module.exports.upsertSettings = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO user_settings (
      user_id,
      notify_registration_update,
      notify_event_reminder,
      notify_attendance_marked,
      default_requires_approval,
      default_event_capacity,
      default_competition_venue
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id) DO UPDATE SET
      notify_registration_update = EXCLUDED.notify_registration_update,
      notify_event_reminder = EXCLUDED.notify_event_reminder,
      notify_attendance_marked = EXCLUDED.notify_attendance_marked,
      default_requires_approval = EXCLUDED.default_requires_approval,
      default_event_capacity = EXCLUDED.default_event_capacity,
      default_competition_venue = EXCLUDED.default_competition_venue,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const VALUES = [
    data.user_id,
    data.notifyRegistrationUpdate,
    data.notifyEventReminder,
    data.notifyAttendanceMarked,
    data.defaultRequiresApproval,
    data.defaultEventCapacity,
    data.defaultCompetitionVenue,
  ];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectSettingsByUserId = (data, callback) => {
  const SQLSTATEMENT = `
    WITH inserted AS (
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    )
    SELECT * FROM inserted
    UNION ALL
    SELECT * FROM user_settings WHERE user_id = $1
    LIMIT 1;
  `;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};

module.exports.setVerificationTokenById = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE users
    SET email_verification_token = $1,
        email_verification_expires = NOW() + INTERVAL '24 hours'
    WHERE id = $2
    RETURNING id, name, username, email, role, active, status, email_verified, auth_provider, created_at;
  `;
  pool.query(SQLSTATEMENT, [data.verificationToken, data.user_id], callback);
};

module.exports.updateRoleById = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE users
    SET role = $1
    WHERE id = $2
    RETURNING id, name, username, email, role, active, status, email_verified, auth_provider, created_at;
  `;
  pool.query(SQLSTATEMENT, [data.role, data.user_id], callback);
};

module.exports.markEmailVerifiedByToken = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE users
    SET email_verified = TRUE,
        status = 'Active',
        email_verification_token = NULL,
        email_verification_expires = NULL
    WHERE email_verification_token = $1
      AND email_verification_expires > NOW()
    RETURNING id, name, username, email, role, active, status, email_verified, auth_provider, created_at;
  `;
  pool.query(SQLSTATEMENT, [data.token], callback);
};

module.exports.deleteById = (data, callback) => {
  const SQLSTATEMENT = "DELETE FROM users WHERE id = $1;";
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};

module.exports.deactivateById = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE users
    SET active = FALSE,
        status = 'Inactive'
    WHERE id = $1
    RETURNING id, name, username, email, role, active, status, email_verified, auth_provider, created_at;
  `;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};
