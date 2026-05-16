const pool = require("../services/db");

module.exports.selectOptions = (callback) => {
  const SQLSTATEMENT = `
    SELECT
      (SELECT COALESCE(json_agg(v ORDER BY v.name), '[]'::json) FROM venues v) AS venues,
      (SELECT COALESCE(json_agg(f ORDER BY f.name), '[]'::json) FROM tournament_formats f) AS tournament_formats,
      (SELECT COALESCE(json_agg(s ORDER BY s.name), '[]'::json) FROM scoring_systems s) AS scoring_systems;
  `;
  pool.query(SQLSTATEMENT, callback);
};

module.exports.selectAll = (callback) => {
  const SQLSTATEMENT = `
    SELECT
      c.id,
      c.title,
      c.description,
      c.start_date,
      c.end_date,
      c.status,
      c.schedule_text,
      c.awards_text,
      c.eligibility_text,
      c.registration_method,
      c.registration_deadline,
      c.time_control,
      c.late_policy,
      c.arbiter_policy,
      c.rules_text,
      c.created_at,
      v.name AS venue_name,
      u.name AS organizer_name,
      tf.name AS tournament_format,
      ss.name AS scoring_system,
      cs.requires_approval,
      cs.allow_waitlist,
      cs.round_count,
      COUNT(DISTINCT cc.id)::int AS category_count,
      COUNT(cr.id)::int AS registration_count,
      COUNT(cr.id) FILTER (WHERE cr.status = 'Pending Approval')::int AS pending_count,
      COALESCE(SUM(cc.capacity), 0)::int AS total_capacity,
      COUNT(cr.id) FILTER (WHERE cr.status = 'Registered')::int AS confirmed_signups,
      COUNT(cr.id) FILTER (WHERE cr.status = 'Pending Approval')::int AS pending_signups,
      COUNT(cr.id) FILTER (WHERE cr.attended = TRUE)::int AS attended_count
    FROM competitions c
    LEFT JOIN venues v ON v.id = c.venue_id
    LEFT JOIN users u ON u.id = c.organizer_id
    LEFT JOIN competition_settings cs ON cs.competition_id = c.id
    LEFT JOIN tournament_formats tf ON tf.id = cs.tournament_format_id
    LEFT JOIN scoring_systems ss ON ss.id = cs.scoring_system_id
    LEFT JOIN competition_categories cc ON cc.competition_id = c.id
    LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
    GROUP BY c.id, v.name, u.name, cs.competition_id, tf.name, ss.name
    ORDER BY c.start_date DESC, c.id DESC;
  `;
  pool.query(SQLSTATEMENT, callback);
};

module.exports.selectById = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT
      c.*,
      v.name AS venue_name,
      tf.name AS tournament_format,
      ss.name AS scoring_system,
      cs.registration_opens_at,
      cs.registration_closes_at,
      cs.requires_approval,
      cs.allow_waitlist,
      cs.round_count,
      COUNT(cr.id) FILTER (WHERE cr.status = 'Registered')::int AS confirmed_signups,
      COUNT(cr.id) FILTER (WHERE cr.status = 'Pending Approval')::int AS pending_signups,
      COUNT(cr.id) FILTER (WHERE cr.attended = TRUE)::int AS attended_count,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', cc.id,
            'name', cc.name,
            'capacity', cc.capacity,
            'registration_fee', cc.registration_fee,
            'min_age', cc.min_age,
            'max_age', cc.max_age,
            'current_user_registration_status', (
              SELECT cr2.status
              FROM competition_registrations cr2
              WHERE cr2.category_id = cc.id
                AND cr2.user_id = $2
              LIMIT 1
            )
          )
        ) FILTER (WHERE cc.id IS NOT NULL),
        '[]'::json
      ) AS categories
    FROM competitions c
    LEFT JOIN venues v ON v.id = c.venue_id
    LEFT JOIN competition_settings cs ON cs.competition_id = c.id
    LEFT JOIN tournament_formats tf ON tf.id = cs.tournament_format_id
    LEFT JOIN scoring_systems ss ON ss.id = cs.scoring_system_id
    LEFT JOIN competition_categories cc ON cc.competition_id = c.id
    LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
    WHERE c.id = $1
    GROUP BY c.id, v.name, tf.name, ss.name, cs.competition_id;
  `;
  pool.query(SQLSTATEMENT, [data.competition_id, data.user_id || null], callback);
};

module.exports.insertCompetition = (data, callback) => {
  const SQLSTATEMENT = `
    WITH inserted AS (
      INSERT INTO competitions (
        title,
        description,
        organizer_id,
        venue_id,
        start_date,
        end_date,
        status,
        schedule_text,
        awards_text,
        eligibility_text,
        registration_method,
        registration_deadline,
        time_control,
        late_policy,
        arbiter_policy,
        rules_text
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    )
    INSERT INTO competition_settings (
      competition_id,
      tournament_format_id,
      scoring_system_id,
      registration_opens_at,
      registration_closes_at,
      requires_approval,
      allow_waitlist,
      round_count
    )
    SELECT id, $8, $9, $10, $11, $12, $13, $14
    FROM inserted
    RETURNING competition_id;
  `;
  const VALUES = [
    data.title,
    data.description,
    data.organizer_id,
    data.venue_id,
    data.start_date,
    data.end_date,
    data.status,
    data.tournament_format_id,
    data.scoring_system_id,
    data.registration_opens_at,
    data.registration_closes_at,
    data.requires_approval,
    data.allow_waitlist,
    data.round_count,
    data.schedule_text,
    data.awards_text,
    data.eligibility_text,
    data.registration_method,
    data.registration_deadline,
    data.time_control,
    data.late_policy,
    data.arbiter_policy,
    data.rules_text,
  ];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.updateCompetition = (data, callback) => {
  const SQLSTATEMENT = `
    WITH updated_competition AS (
      UPDATE competitions
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          venue_id = COALESCE($3, venue_id),
          start_date = COALESCE($4, start_date),
          end_date = COALESCE($5, end_date),
          status = COALESCE($6, status),
          registration_deadline = COALESCE($7, registration_deadline)
      WHERE id = $8
      RETURNING *
    ),
    updated_settings AS (
      UPDATE competition_settings
      SET requires_approval = COALESCE($9, requires_approval),
          allow_waitlist = COALESCE($10, allow_waitlist)
      WHERE competition_id = $8
      RETURNING *
    )
    SELECT updated_competition.*, updated_settings.requires_approval, updated_settings.allow_waitlist
    FROM updated_competition
    LEFT JOIN updated_settings ON updated_settings.competition_id = updated_competition.id;
  `;
  const VALUES = [
    data.title,
    data.description,
    data.venue_id,
    data.start_date,
    data.end_date,
    data.status,
    data.registration_deadline,
    data.competition_id,
    data.requires_approval,
    data.allow_waitlist,
  ];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.deleteCompetition = (data, callback) => {
  pool.query("DELETE FROM competitions WHERE id = $1;", [data.competition_id], callback);
};

module.exports.selectNotificationRecipients = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT DISTINCT
      c.title AS activity_title,
      c.id AS activity_id,
      u.id AS user_id,
      u.name,
      u.email
    FROM competitions c
    JOIN competition_categories cc ON cc.competition_id = c.id
    JOIN competition_registrations cr ON cr.category_id = cc.id
    JOIN users u ON u.id = cr.user_id
    WHERE c.id = $1
      AND cr.status IN ('Registered', 'Pending Approval', 'Waitlisted')
      AND u.active = TRUE;
  `;
  pool.query(SQLSTATEMENT, [data.competition_id], callback);
};

module.exports.insertCategory = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO competition_categories (
      competition_id,
      name,
      capacity,
      registration_fee,
      min_age,
      max_age,
      min_rank_value,
      max_rank_value
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const VALUES = [
    data.competition_id,
    data.name,
    data.capacity,
    data.registration_fee,
    data.min_age,
    data.max_age,
    data.min_rank_value,
    data.max_rank_value,
  ];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectCategoryRegistrationInfo = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT
      cc.id,
      cc.capacity,
      cc.competition_id,
      c.status AS competition_status,
      cs.requires_approval,
      cs.allow_waitlist,
      cs.registration_opens_at,
      cs.registration_closes_at,
      COUNT(cr.id) FILTER (WHERE cr.status = 'Registered')::int AS registered_count,
      (
        SELECT cr2.status
        FROM competition_registrations cr2
        JOIN competition_categories cc2 ON cc2.id = cr2.category_id
        WHERE cc2.competition_id = cc.competition_id
          AND cr2.user_id = $2
          AND cr2.status IN ('Pending Approval', 'Registered', 'Waitlisted')
        LIMIT 1
      ) AS existing_competition_registration_status
    FROM competition_categories cc
    JOIN competitions c ON c.id = cc.competition_id
    LEFT JOIN competition_settings cs ON cs.competition_id = c.id
    LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
    WHERE cc.id = $1
    GROUP BY cc.id, c.status, cs.competition_id;
  `;
  pool.query(SQLSTATEMENT, [data.category_id, data.user_id], callback);
};

module.exports.registerUser = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO competition_registrations (user_id, category_id, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, category_id)
    DO UPDATE SET status = EXCLUDED.status
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.user_id, data.category_id, data.status], callback);
};

module.exports.selectRegistrations = (callback) => {
  const SQLSTATEMENT = `
    SELECT
      cr.id,
      cr.status,
      cr.attended,
      cr.seed_number,
      cr.registered_at,
      u.id AS user_id,
      u.name AS participant_name,
      u.email AS participant_email,
      u.username AS participant_username,
      u.role AS participant_role,
      p.school,
      p.rank_type,
      p.rank_value,
      cc.id AS category_id,
      cc.name AS category_name,
      c.id AS competition_id,
      c.title AS competition_title
    FROM competition_registrations cr
    JOIN users u ON u.id = cr.user_id
    JOIN competition_categories cc ON cc.id = cr.category_id
    JOIN competitions c ON c.id = cc.competition_id
    LEFT JOIN player_profiles p ON p.user_id = u.id
    ORDER BY cr.registered_at DESC;
  `;
  pool.query(SQLSTATEMENT, callback);
};

module.exports.updateRegistrationStatus = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE competition_registrations
    SET status = $1::varchar,
        attended = CASE WHEN $1::varchar = 'Registered' THEN attended ELSE FALSE END
    WHERE id = $2
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.status, data.registration_id], callback);
};

module.exports.updateRegistrationAttendance = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE competition_registrations
    SET attended = $1
    WHERE id = $2
      AND status = 'Registered'
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.attended, data.registration_id], callback);
};

module.exports.deleteRegistration = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM competition_registrations
    WHERE id = $1
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.registration_id], callback);
};
