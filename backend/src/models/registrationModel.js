const pool = require("../services/db");

module.exports.selectAll = (callback) => {
  const SQLSTATEMENT = `
    SELECT r.id, r.status, r.attended, r.created_at,
      r.event_id,
      u.name AS member_name,
      u.email AS member_email,
      u.username AS member_username,
      u.role AS member_role,
      p.school,
      p.rank_type,
      p.rank_value,
      e.title AS event_title,
      e.requires_approval
    FROM event_registrations r
    JOIN users u ON u.id = r.user_id
    JOIN events e ON e.id = r.event_id
    LEFT JOIN player_profiles p ON p.user_id = u.id
    ORDER BY r.created_at DESC;
  `;
  pool.query(SQLSTATEMENT, callback);
};

module.exports.updateAttendance = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE event_registrations
    SET attended = $1
    WHERE id = $2
      AND status = 'Registered'
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.attended, data.registration_id], callback);
};

module.exports.approveRegistration = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE event_registrations
    SET status = 'Registered'
    WHERE id = $1
      AND status = 'Pending Approval'
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.registration_id], callback);
};

module.exports.rejectRegistration = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE event_registrations
    SET status = 'Rejected',
        attended = FALSE
    WHERE id = $1
      AND status = 'Pending Approval'
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.registration_id], callback);
};

module.exports.deleteRegistration = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM event_registrations
    WHERE id = $1
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.registration_id], callback);
};
