const pool = require("../services/db");

module.exports.selectAll = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT e.id, e.title, e.description, e.event_date, e.registration_deadline, e.venue, e.capacity, e.status, e.requires_approval, e.pinned, e.created_at,
      ((e.event_date AT TIME ZONE 'Asia/Singapore')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date) AS is_archived,
      COUNT(r.id) FILTER (WHERE r.status = 'Registered')::int AS registered,
      COUNT(r.id) FILTER (WHERE r.status = 'Pending Approval')::int AS pending_requests,
      COUNT(r.id) FILTER (WHERE r.status IN ('Registered', 'Pending Approval'))::int AS active_signups,
      COALESCE(SUM(CASE WHEN r.attended THEN 1 ELSE 0 END), 0)::int AS attended,
      MAX(r.status) FILTER (WHERE r.user_id = $1) AS current_user_registration_status,
      COALESCE((
        SELECT json_object_agg(reaction_type, total)
        FROM (
          SELECT reaction_type, COUNT(*)::int AS total
          FROM event_reactions
          WHERE event_id = e.id
          GROUP BY reaction_type
        ) reaction_summary
      ), '{}'::json) AS reaction_counts,
      (
        SELECT reaction_type
        FROM event_reactions
        WHERE event_id = e.id
          AND user_id = $1
        LIMIT 1
      ) AS current_user_reaction,
      (
        SELECT COUNT(*)::int
        FROM event_comments
        WHERE event_id = e.id
          AND deleted_at IS NULL
      ) AS comment_count
    FROM events e
    LEFT JOIN event_registrations r ON r.event_id = e.id
    GROUP BY e.id
    ORDER BY e.pinned DESC, e.event_date DESC, e.created_at DESC, e.id DESC;
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
        requires_approval = COALESCE($8, requires_approval),
        pinned = COALESCE($9, pinned)
    WHERE id = $10
    RETURNING *;
  `;
  const VALUES = [data.title, data.description, data.eventDate, data.registrationDeadline, data.venue, data.capacity, data.status, data.requiresApproval, data.pinned, data.event_id];
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

module.exports.selectComments = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT
      c.id,
      c.event_id,
      c.user_id,
      u.name AS user_name,
      u.role AS user_role,
      c.comment_text,
      c.edited_at,
      c.deleted_at,
      c.created_at,
      (c.user_id = $2) AS is_owner,
      (c.created_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes') AS can_edit,
      (c.user_id = $2 AND c.created_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes') AS can_delete_own
    FROM event_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.event_id = $1
      AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC, c.id ASC;
  `;
  pool.query(SQLSTATEMENT, [data.event_id, data.user_id], callback);
};

module.exports.insertComment = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO event_comments (event_id, user_id, comment_text)
    SELECT e.id, $2, $3
    FROM events e
    WHERE e.id = $1
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.event_id, data.user_id, data.comment_text], callback);
};

module.exports.updateComment = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE event_comments
    SET comment_text = $1,
        edited_at = CURRENT_TIMESTAMP
    WHERE id = $2
      AND user_id = $3
      AND deleted_at IS NULL
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.comment_text, data.comment_id, data.user_id], callback);
};

module.exports.softDeleteComment = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE event_comments
    SET deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $2
    WHERE id = $1
      AND deleted_at IS NULL
      AND (
        $3::boolean = TRUE
        OR (
          user_id = $2
          AND created_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
        )
      )
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.comment_id, data.deleted_by, data.can_moderate], callback);
};

module.exports.upsertReaction = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO event_reactions (event_id, user_id, reaction_type)
    SELECT e.id, $2, $3
    FROM events e
    WHERE e.id = $1
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET reaction_type = EXCLUDED.reaction_type,
                  created_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.event_id, data.user_id, data.reaction_type], callback);
};

module.exports.deleteReaction = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM event_reactions
    WHERE event_id = $1
      AND user_id = $2
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.event_id, data.user_id], callback);
};
