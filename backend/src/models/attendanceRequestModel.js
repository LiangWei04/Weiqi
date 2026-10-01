const pool = require("../services/db");

const pendingSelect = `
  SELECT *
  FROM (
    SELECT
      acr.id,
      'Event' AS activity_type,
      acr.event_registration_id AS registration_id,
      acr.requested_attended,
      acr.reason,
      acr.status,
      acr.created_at,
      requester.name AS requester_name,
      requester.email AS requester_email,
      member.name AS member_name,
      member.email AS member_email,
      e.title AS activity_title,
      e.event_date AS activity_date,
      NULL::varchar AS category_name,
      er.attended AS current_attended
    FROM attendance_change_requests acr
    JOIN event_registrations er ON er.id = acr.event_registration_id
    JOIN events e ON e.id = er.event_id
    JOIN users member ON member.id = er.user_id
    JOIN users requester ON requester.id = acr.requested_by
    WHERE acr.status = 'Pending'

    UNION ALL

    SELECT
      acr.id,
      'Competition' AS activity_type,
      acr.competition_registration_id AS registration_id,
      acr.requested_attended,
      acr.reason,
      acr.status,
      acr.created_at,
      requester.name AS requester_name,
      requester.email AS requester_email,
      member.name AS member_name,
      member.email AS member_email,
      c.title AS activity_title,
      c.start_date AS activity_date,
      cc.name AS category_name,
      cr.attended AS current_attended
    FROM attendance_change_requests acr
    JOIN competition_registrations cr ON cr.id = acr.competition_registration_id
    JOIN competition_categories cc ON cc.id = cr.category_id
    JOIN competitions c ON c.id = cc.competition_id
    JOIN users member ON member.id = cr.user_id
    JOIN users requester ON requester.id = acr.requested_by
    WHERE acr.status = 'Pending'
  ) requests
  ORDER BY created_at ASC;
`;

module.exports.selectPending = (callback) => {
  pool.query(pendingSelect, callback);
};

module.exports.insertEventRequest = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO attendance_change_requests (
      event_registration_id,
      requested_attended,
      reason,
      requested_by
    )
    SELECT er.id, $2, $3, $4
    FROM event_registrations er
    JOIN events e ON e.id = er.event_id
    WHERE er.id = $1
      AND er.status = 'Registered'
      AND (e.event_date AT TIME ZONE 'Asia/Singapore')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.registration_id, data.requested_attended, data.reason, data.requested_by], callback);
};

module.exports.insertCompetitionRequest = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO attendance_change_requests (
      competition_registration_id,
      requested_attended,
      reason,
      requested_by
    )
    SELECT cr.id, $2, $3, $4
    FROM competition_registrations cr
    JOIN competition_categories cc ON cc.id = cr.category_id
    JOIN competitions c ON c.id = cc.competition_id
    WHERE cr.id = $1
      AND cr.status = 'Registered'
      AND (c.start_date AT TIME ZONE 'Asia/Singapore')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.registration_id, data.requested_attended, data.reason, data.requested_by], callback);
};

module.exports.replace = async (data) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Approval, rejection and replacement all compete for this same pending row.
    const previous = await client.query(`
      UPDATE attendance_change_requests
      SET status = 'Superseded', superseded_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'Pending'
      RETURNING *;
    `, [data.request_id]);
    if (previous.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const original = previous.rows[0];
    const replacement = await client.query(`
      INSERT INTO attendance_change_requests (
        event_registration_id, competition_registration_id,
        requested_attended, reason, requested_by, replaces_request_id
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
    `, [original.event_registration_id, original.competition_registration_id,
      data.requested_attended, data.reason, data.requested_by, original.id]);
    await client.query("COMMIT");
    return replacement.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports.approve = async (data) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const requestResult = await client.query(
      `
        UPDATE attendance_change_requests
        SET status = 'Approved',
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'Pending'
        RETURNING *;
      `,
      [data.request_id, data.reviewed_by]
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const request = requestResult.rows[0];
    if (request.event_registration_id) {
      await client.query(
        "UPDATE event_registrations SET attended = $1 WHERE id = $2;",
        [request.requested_attended, request.event_registration_id]
      );
    } else {
      await client.query(
        "UPDATE competition_registrations SET attended = $1 WHERE id = $2;",
        [request.requested_attended, request.competition_registration_id]
      );
    }

    await client.query("COMMIT");
    return request;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports.reject = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE attendance_change_requests
    SET status = 'Rejected',
        reviewed_by = $2,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = 'Pending'
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.request_id, data.reviewed_by], callback);
};
