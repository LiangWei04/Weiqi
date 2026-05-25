const pool = require("../services/db");

module.exports.selectAll = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT e.id, e.title, e.description, e.event_date, e.registration_deadline, e.venue, e.capacity, e.status, e.requires_approval, e.created_at,
      COUNT(r.id) FILTER (WHERE r.status = 'Registered')::int AS registered,
      COUNT(r.id) FILTER (WHERE r.status = 'Pending Approval')::int AS pending_requests,
      COUNT(r.id) FILTER (WHERE r.status IN ('Registered', 'Pending Approval'))::int AS active_signups,
      COALESCE(SUM(CASE WHEN r.attended THEN 1 ELSE 0 END), 0)::int AS attended,
      MAX(r.status) FILTER (WHERE r.user_id = $1) AS current_user_registration_status
    FROM events e
    LEFT JOIN event_registrations r ON r.event_id = e.id
    GROUP BY e.id
    ORDER BY e.event_date ASC;
  `;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};

module.exports.insertSingle = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO events (title, description, event_date, registration_deadline, venue, capacity, status, requires_approval, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  const VALUES = [data.title, data.description, data.eventDate, data.registrationDeadline, data.venue, data.capacity, data.status, data.requiresApproval, data.createdBy];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectById = (data, callback) => {
  pool.query("SELECT * FROM events WHERE id = $1;", [data.event_id], callback);
};

module.exports.updateById = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE events
    SET title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_date = COALESCE($3, event_date),
        registration_deadline = COALESCE($4, registration_deadline),
        venue = COALESCE($5, venue),
        capacity = COALESCE($6, capacity),
        status = COALESCE($7, status),
        requires_approval = COALESCE($8, requires_approval)
    WHERE id = $9
    RETURNING *;
  `;
  const VALUES = [data.title, data.description, data.eventDate, data.registrationDeadline, data.venue, data.capacity, data.status, data.requiresApproval, data.event_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectNotificationRecipients = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT DISTINCT
      e.title AS activity_title,
      e.id AS activity_id,
      u.id AS user_id,
      u.name,
      u.email
    FROM events e
    JOIN event_registrations r ON r.event_id = e.id
    JOIN users u ON u.id = r.user_id
    WHERE e.id = $1
      AND r.status IN ('Registered', 'Pending Approval')
      AND u.active = TRUE;
  `;
  pool.query(SQLSTATEMENT, [data.event_id], callback);
};

module.exports.deleteById = (data, callback) => {
  pool.query("DELETE FROM events WHERE id = $1;", [data.event_id], callback);
};

module.exports.selectRegistrationAvailability = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT e.id, e.capacity, e.status, e.requires_approval, e.registration_deadline,
      COUNT(r.id) FILTER (WHERE r.status IN ('Registered', 'Pending Approval'))::int AS active_signups,
      MAX(r.status) FILTER (WHERE r.user_id = $2) AS current_user_registration_status
    FROM events e
    LEFT JOIN event_registrations r ON r.event_id = e.id
    WHERE e.id = $1
    GROUP BY e.id;
  `;
  pool.query(SQLSTATEMENT, [data.event_id, data.user_id], callback);
};

module.exports.registerUser = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO event_registrations (user_id, event_id, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, event_id) DO UPDATE SET status = EXCLUDED.status
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.user_id, data.event_id, data.registrationStatus], callback);
};
