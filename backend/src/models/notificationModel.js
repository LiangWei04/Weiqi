const pool = require("../services/db");

module.exports.insertMany = async ({ userIds, title, message, type = "Activity", activityType = null, activityId = null }) => {
  if (!userIds.length) {
    return { rowCount: 0 };
  }

  const SQLSTATEMENT = `
    INSERT INTO notifications (user_id, title, message, type, activity_type, activity_id)
    SELECT UNNEST($1::int[]), $2, $3, $4, $5, $6
    RETURNING *;
  `;
  return pool.query(SQLSTATEMENT, [userIds, title, message, type, activityType, activityId]);
};

module.exports.selectForUser = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT id, title, message, type, activity_type, activity_id, read_at, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 30;
  `;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};

module.exports.markRead = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE notifications
    SET read_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.notification_id, data.user_id], callback);
};

module.exports.selectActiveUserIds = (callback) => {
  pool.query("SELECT id FROM users WHERE active = TRUE;", callback);
};

module.exports.selectCaptainUserIds = (callback) => {
  pool.query("SELECT id FROM users WHERE active = TRUE AND role = 'Captain';", callback);
};

module.exports.selectEventUserIds = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT DISTINCT r.user_id AS id, e.title AS activity_title
    FROM event_registrations r
    JOIN events e ON e.id = r.event_id
    JOIN users u ON u.id = r.user_id
    WHERE r.event_id = $1
      AND r.status IN ('Registered', 'Pending Approval')
      AND u.active = TRUE;
  `;
  pool.query(SQLSTATEMENT, [data.event_id], callback);
};

module.exports.selectCompetitionUserIds = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT DISTINCT cr.user_id AS id, c.title AS activity_title
    FROM competition_registrations cr
    JOIN competition_categories cc ON cc.id = cr.category_id
    JOIN competitions c ON c.id = cc.competition_id
    JOIN users u ON u.id = cr.user_id
    WHERE cc.competition_id = $1
      AND cr.status IN ('Registered', 'Pending Approval', 'Waitlisted')
      AND u.active = TRUE;
  `;
  pool.query(SQLSTATEMENT, [data.competition_id], callback);
};

module.exports.selectMyUpcomingActivities = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT *
    FROM (
      SELECT
        'Event' AS activity_type,
        e.id AS activity_id,
        e.title,
        e.description,
        e.event_date AS activity_date,
        e.venue,
        r.status,
        r.attended,
        NULL::varchar AS category_name
      FROM event_registrations r
      JOIN events e ON e.id = r.event_id
      WHERE r.user_id = $1
        AND r.status IN ('Registered', 'Pending Approval')
        AND e.event_date >= CURRENT_DATE
      UNION ALL
      SELECT
        'Competition' AS activity_type,
        c.id AS activity_id,
        c.title,
        c.description,
        c.start_date AS activity_date,
        v.name AS venue,
        cr.status,
        cr.attended,
        cc.name AS category_name
      FROM competition_registrations cr
      JOIN competition_categories cc ON cc.id = cr.category_id
      JOIN competitions c ON c.id = cc.competition_id
      LEFT JOIN venues v ON v.id = c.venue_id
      WHERE cr.user_id = $1
        AND cr.status IN ('Registered', 'Pending Approval', 'Waitlisted')
        AND c.start_date >= CURRENT_DATE
    ) activities
    ORDER BY activity_date ASC, title ASC;
  `;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};
