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
      (COALESCE(c.end_date, c.start_date) < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date) AS is_archived,
      v.name AS venue_name,
      u.name AS organizer_name,
      tf.name AS tournament_format,
      ss.name AS scoring_system,
      cs.requires_approval,
      cs.allow_waitlist,
      cs.round_count,
      (SELECT COUNT(*)::int FROM competition_categories cc WHERE cc.competition_id = c.id) AS category_count,
      (
        SELECT COUNT(*)::int
        FROM competition_registrations cr
        JOIN competition_categories cc ON cc.id = cr.category_id
        WHERE cc.competition_id = c.id
      ) AS registration_count,
      (
        SELECT COUNT(*)::int
        FROM competition_registrations cr
        JOIN competition_categories cc ON cc.id = cr.category_id
        WHERE cc.competition_id = c.id
          AND cr.status = 'Pending Approval'
      ) AS pending_count,
      (SELECT COALESCE(SUM(cc.capacity), 0)::int FROM competition_categories cc WHERE cc.competition_id = c.id) AS total_capacity,
      (
        SELECT COUNT(*)::int
        FROM competition_registrations cr
        JOIN competition_categories cc ON cc.id = cr.category_id
        WHERE cc.competition_id = c.id
          AND cr.status = 'Registered'
      ) AS confirmed_signups,
      (
        SELECT COUNT(*)::int
        FROM competition_registrations cr
        JOIN competition_categories cc ON cc.id = cr.category_id
        WHERE cc.competition_id = c.id
          AND cr.status = 'Pending Approval'
      ) AS pending_signups,
      (
        SELECT COUNT(*)::int
        FROM competition_registrations cr
        JOIN competition_categories cc ON cc.id = cr.category_id
        WHERE cc.competition_id = c.id
          AND cr.attended = TRUE
      ) AS attended_count
    FROM competitions c
    LEFT JOIN venues v ON v.id = c.venue_id
    LEFT JOIN users u ON u.id = c.organizer_id
    LEFT JOIN competition_settings cs ON cs.competition_id = c.id
    LEFT JOIN tournament_formats tf ON tf.id = cs.tournament_format_id
    LEFT JOIN scoring_systems ss ON ss.id = cs.scoring_system_id
    GROUP BY c.id, v.name, u.name, cs.competition_id, tf.name, ss.name
    ORDER BY is_archived ASC, c.start_date DESC, c.id DESC;
  `;
  pool.query(SQLSTATEMENT, callback);
};

module.exports.selectById = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT
      c.*,
      (COALESCE(c.end_date, c.start_date) < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date) AS is_archived,
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
            'registration_closed', EXISTS (
              SELECT 1
              FROM competition_matches m
              WHERE m.category_id = cc.id
              LIMIT 1
            ) OR cs.registration_closes_at < CURRENT_TIMESTAMP OR c.registration_deadline < CURRENT_DATE,
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

module.exports.updateCategory = (data, callback) => {
  const SQLSTATEMENT = `
    WITH usage AS (
      SELECT
        cc.id,
        COUNT(cr.id) FILTER (WHERE cr.status IN ('Registered', 'Pending Approval', 'Waitlisted'))::int AS active_signups
      FROM competition_categories cc
      LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
      WHERE cc.id = $1
      GROUP BY cc.id
    )
    UPDATE competition_categories cc
    SET name = COALESCE($2, cc.name),
        capacity = COALESCE($3, cc.capacity),
        registration_fee = COALESCE($4, cc.registration_fee)
    FROM usage
    WHERE cc.id = usage.id
      AND COALESCE($3, cc.capacity) >= usage.active_signups
    RETURNING cc.*, usage.active_signups;
  `;
  pool.query(SQLSTATEMENT, [
    data.category_id,
    data.name,
    data.capacity,
    data.registration_fee,
  ], callback);
};

module.exports.selectCategoryById = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT
      cc.*,
      COUNT(cr.id) FILTER (WHERE cr.status IN ('Registered', 'Pending Approval', 'Waitlisted'))::int AS active_signups
    FROM competition_categories cc
    LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
    WHERE cc.id = $1
    GROUP BY cc.id;
  `;
  pool.query(SQLSTATEMENT, [data.category_id], callback);
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
      EXISTS (
        SELECT 1
        FROM competition_matches m
        WHERE m.category_id = cc.id
        LIMIT 1
      ) OR cs.registration_closes_at < CURRENT_TIMESTAMP OR c.registration_deadline < CURRENT_DATE AS registration_closed,
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
      c.title AS competition_title,
      c.start_date AS competition_start_date
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
    UPDATE competition_registrations cr
    SET status = $1::varchar,
        attended = CASE WHEN $1::varchar = 'Registered' THEN attended ELSE FALSE END
    FROM competition_categories cc
    JOIN competitions c ON c.id = cc.competition_id
    LEFT JOIN competition_settings cs ON cs.competition_id = c.id
    WHERE cr.id = $2
      AND cr.category_id = cc.id
      AND (
        $1::varchar <> 'Registered'
        OR (
          (cs.registration_closes_at IS NULL OR cs.registration_closes_at >= CURRENT_TIMESTAMP)
          AND (
            c.registration_deadline IS NULL
            OR c.registration_deadline >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
          )
          AND (
            SELECT COUNT(*)
            FROM competition_registrations existing
            WHERE existing.category_id = cc.id
              AND existing.status = 'Registered'
          ) < cc.capacity
        )
      )
    RETURNING cr.*;
  `;
  pool.query(SQLSTATEMENT, [data.status, data.registration_id], callback);
};

module.exports.updateRegistrationAttendance = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE competition_registrations cr
    SET attended = $1
    FROM competition_categories cc
    JOIN competitions c ON c.id = cc.competition_id
    WHERE cr.id = $2
      AND cr.category_id = cc.id
      AND cr.status = 'Registered'
      AND (
        (c.start_date AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
        OR (
          $3::varchar = 'Captain'
          AND (c.start_date AT TIME ZONE 'Asia/Singapore')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
        )
      )
    RETURNING cr.*, c.start_date AS competition_start_date;
  `;
  pool.query(SQLSTATEMENT, [data.attended, data.registration_id, data.role], callback);
};

module.exports.deleteRegistration = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM competition_registrations
    WHERE id = $1
    RETURNING *;
  `;
  pool.query(SQLSTATEMENT, [data.registration_id], callback);
};

const resultPoints = (match, userId) => {
  if (match.result === "Bye" && Number(match.black_user_id) === Number(userId)) {
    return 1;
  }

  if (match.result === "Black Win") {
    return Number(match.black_user_id) === Number(userId) ? 1 : 0;
  }

  if (match.result === "White Win") {
    return Number(match.white_user_id) === Number(userId) ? 1 : 0;
  }

  if (match.result === "Forfeit Black") {
    return Number(match.white_user_id) === Number(userId) ? 1 : 0;
  }

  if (match.result === "Forfeit White") {
    return Number(match.black_user_id) === Number(userId) ? 1 : 0;
  }

  return 0;
};

const resultRecord = (match, userId) => {
  if (match.result === "Bye" && Number(match.black_user_id) === Number(userId)) {
    return { wins: 1, losses: 0, byes: 1 };
  }

  const points = resultPoints(match, userId);
  if (points === 1) {
    return { wins: 1, losses: 0, byes: 0 };
  }

  if (["Black Win", "White Win", "Forfeit Black", "Forfeit White"].includes(match.result)) {
    return { wins: 0, losses: 1, byes: 0 };
  }

  return { wins: 0, losses: 0, byes: 0 };
};

const roundText = (match, userId, standingMap) => {
  if (match.result === "Bye" && Number(match.black_user_id) === Number(userId)) {
    return "0+";
  }

  const isBlack = Number(match.black_user_id) === Number(userId);
  const opponentId = isBlack ? match.white_user_id : match.black_user_id;
  if (!opponentId) {
    return "";
  }
  const opponentNumber = standingMap.get(Number(opponentId))?.player_number || opponentId;

  let symbol = "";
  if (
    (isBlack && ["Black Win", "Forfeit White"].includes(match.result)) ||
    (!isBlack && ["White Win", "Forfeit Black"].includes(match.result))
  ) {
    symbol = "+";
  } else if (match.result !== "Scheduled") {
    symbol = "-";
  }

  return symbol ? `${opponentNumber}${symbol}/${isBlack ? "b" : "w"}${match.handicap || 0}` : `${opponentNumber}/${isBlack ? "b" : "w"}${match.handicap || 0}`;
};

const buildStandings = (participants, matches) => {
  const completedMatches = matches.filter((match) => match.result !== "Scheduled");
  const standingMap = new Map();

  participants.forEach((participant) => {
    standingMap.set(Number(participant.user_id), {
      user_id: participant.user_id,
      player_number: participant.player_number,
      name: participant.name,
      email: participant.email,
      school: participant.school,
      rank_type: participant.rank_type,
      rank_value: participant.rank_value,
      initial_mms: Number(participant.initial_mms || 10),
      points: 0,
      mms: Number(participant.initial_mms || 10),
      sos: 0,
      sosos: 0,
      wins: 0,
      losses: 0,
      byes: 0,
      rounds: {},
      opponents: [],
    });
  });

  completedMatches.forEach((match) => {
    [match.black_user_id, match.white_user_id].filter(Boolean).forEach((userId) => {
      const standing = standingMap.get(Number(userId));
      if (!standing) {
        return;
      }

      const points = resultPoints(match, userId);
      const record = resultRecord(match, userId);
      standing.points += points;
      standing.mms += points;
      standing.wins += record.wins;
      standing.losses += record.losses;
      standing.byes += record.byes;
      standing.rounds[`R${match.round_number}`] = roundText(match, userId, standingMap);

      const opponentId = Number(match.black_user_id) === Number(userId)
        ? match.white_user_id
        : match.black_user_id;
      if (opponentId) {
        standing.opponents.push(Number(opponentId));
      }
    });
  });

  standingMap.forEach((standing) => {
    standing.sos = standing.opponents.reduce((sum, opponentId) => {
      const opponent = standingMap.get(Number(opponentId));
      return sum + Number(opponent?.mms || 0);
    }, 0);
  });

  standingMap.forEach((standing) => {
    standing.sosos = standing.opponents.reduce((sum, opponentId) => {
      const opponent = standingMap.get(Number(opponentId));
      return sum + Number(opponent?.sos || 0);
    }, 0);
  });

  return Array.from(standingMap.values())
    .sort((a, b) => (
      b.mms - a.mms ||
      b.sos - a.sos ||
      b.sosos - a.sosos ||
      b.wins - a.wins ||
      a.player_number - b.player_number
    ))
    .map((standing, index) => ({
      ...standing,
      rank_position: index + 1,
      mms: Number(standing.mms.toFixed(2)),
      sos: Number(standing.sos.toFixed(2)),
      sosos: Number(standing.sosos.toFixed(2)),
    }));
};

const selectTournamentRows = async (competitionId, categoryId, dbClient = pool) => {
  const participantResult = await dbClient.query(
    `
      SELECT
        cr.user_id,
        COALESCE(cr.seed_number, ROW_NUMBER() OVER (ORDER BY cr.registered_at, cr.id))::int AS player_number,
        cr.initial_mms,
        u.name,
        u.email,
        p.school,
        p.rank_type,
        p.rank_value
      FROM competition_registrations cr
      JOIN users u ON u.id = cr.user_id
      JOIN competition_categories cc ON cc.id = cr.category_id
      LEFT JOIN player_profiles p ON p.user_id = u.id
      WHERE cc.competition_id = $1
        AND cr.category_id = $2
        AND cr.status = 'Registered'
      ORDER BY player_number, u.name;
    `,
    [competitionId, categoryId]
  );

  const matchResult = await dbClient.query(
    `
      SELECT
        m.*,
        r.round_number,
        bu.name AS black_name,
        wu.name AS white_name,
        breg.seed_number AS black_seed_number,
        wreg.seed_number AS white_seed_number,
        COALESCE(breg.seed_number, 0)::int AS black_player_number,
        COALESCE(wreg.seed_number, 0)::int AS white_player_number
      FROM competition_matches m
      JOIN competition_rounds r ON r.id = m.round_id
      LEFT JOIN users bu ON bu.id = m.black_user_id
      LEFT JOIN users wu ON wu.id = m.white_user_id
      LEFT JOIN competition_registrations breg ON breg.user_id = m.black_user_id AND breg.category_id = m.category_id
      LEFT JOIN competition_registrations wreg ON wreg.user_id = m.white_user_id AND wreg.category_id = m.category_id
      WHERE m.competition_id = $1
        AND m.category_id = $2
      ORDER BY r.round_number, m.table_number, m.id;
    `,
    [competitionId, categoryId]
  );

  return {
    participants: participantResult.rows,
    matches: matchResult.rows,
  };
};

module.exports.selectTournament = async (data) => {
  const categoryResult = await pool.query(
    `
      SELECT id, name, capacity
      FROM competition_categories
      WHERE competition_id = $1
      ORDER BY id;
    `,
    [data.competition_id]
  );

  const roundResult = await pool.query(
    `
      SELECT r.*, cc.name AS category_name
      FROM competition_rounds r
      JOIN competition_categories cc ON cc.id = r.category_id
      WHERE r.competition_id = $1
      ORDER BY cc.name, r.round_number;
    `,
    [data.competition_id]
  );

  const categories = [];
  for (const category of categoryResult.rows) {
    const rows = await selectTournamentRows(data.competition_id, category.id);
    const standings = buildStandings(rows.participants, rows.matches);
    const completedMatches = rows.matches.filter((match) => match.result !== "Scheduled").length;
    const scheduledMatches = rows.matches.length;

    categories.push({
      ...category,
      player_count: rows.participants.length,
      standings,
      rounds: roundResult.rows.filter((round) => Number(round.category_id) === Number(category.id)),
      matches: rows.matches,
      insights: {
        completed_matches: completedMatches,
        scheduled_matches: scheduledMatches,
        completion_rate: scheduledMatches === 0 ? 0 : Math.round((completedMatches / scheduledMatches) * 100),
        tied_leaders: standings.filter((standing) => standings[0] && Number(standing.mms) === Number(standings[0].mms)).length,
        no_result_matches: rows.matches.filter((match) => match.result === "Scheduled").length,
      },
    });
  }

  return { categories };
};

const calculateColorCounts = (matches, userId) => ({
  black: matches.filter((match) => Number(match.black_user_id) === Number(userId)).length,
  white: matches.filter((match) => Number(match.white_user_id) === Number(userId)).length,
});

const hasPlayed = (matches, userId, opponentId) => matches.some((match) => (
  (Number(match.black_user_id) === Number(userId) && Number(match.white_user_id) === Number(opponentId)) ||
  (Number(match.white_user_id) === Number(userId) && Number(match.black_user_id) === Number(opponentId))
));

module.exports.generateRound = async (data) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Serialize generation for this category so concurrent clicks cannot create
    // duplicate rounds or bypass the bounded public demo.
    await client.query("SELECT id FROM competition_categories WHERE id=$1 AND competition_id=$2 FOR UPDATE", [data.category_id, data.competition_id]);
    if (process.env.DEMO_MODE === 'true') {
      const rounds = await client.query("SELECT count(*)::integer AS count FROM competition_rounds WHERE category_id=$1", [data.category_id]);
      if (rounds.rows[0].count >= 3) {
        throw Object.assign(new Error('The three-round demo is complete. Reset to try again.'), { statusCode:409 });
      }
    }

    const existingOpenRound = await client.query(
      `
        SELECT r.id
        FROM competition_rounds r
        JOIN competition_matches m ON m.round_id = r.id
        WHERE r.category_id = $1
          AND m.result = 'Scheduled'
        LIMIT 1;
      `,
      [data.category_id]
    );

    if (existingOpenRound.rows.length > 0) {
      const error = new Error("Complete the current round before generating another one");
      error.statusCode = 400;
      throw error;
    }

    const currentRows = await selectTournamentRows(data.competition_id, data.category_id, client);
    if (currentRows.participants.length < 2) {
      const error = new Error("At least two approved players are required to generate pairings");
      error.statusCode = 400;
      throw error;
    }

    const standings = buildStandings(currentRows.participants, currentRows.matches);
    const nextRoundNumber = currentRows.matches.reduce((maxRound, match) => Math.max(maxRound, Number(match.round_number || 0)), 0) + 1;
    const roundResult = await client.query(
      `
        INSERT INTO competition_rounds (competition_id, category_id, round_number, generated_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `,
      [data.competition_id, data.category_id, nextRoundNumber, data.generated_by]
    );

    const unpaired = [...standings];
    const pairings = [];
    const byeCandidateIndex = unpaired.length % 2 === 1
      ? [...unpaired].reverse().findIndex((player) => !currentRows.matches.some((match) => match.result === "Bye" && Number(match.black_user_id) === Number(player.user_id)))
      : -1;

    let byePairing = null;
    if (unpaired.length % 2 === 1) {
      const reverseIndex = byeCandidateIndex >= 0 ? byeCandidateIndex : 0;
      const byeIndex = unpaired.length - 1 - reverseIndex;
      const [byePlayer] = unpaired.splice(byeIndex, 1);
      byePairing = { black_user_id: byePlayer.user_id, white_user_id: null, result: "Bye", winner_user_id: byePlayer.user_id };
    }

    while (unpaired.length > 0) {
      const player = unpaired.shift();
      let opponentIndex = unpaired.findIndex((candidate) => !hasPlayed(currentRows.matches, player.user_id, candidate.user_id));
      if (opponentIndex === -1) {
        opponentIndex = 0;
      }
      const [opponent] = unpaired.splice(opponentIndex, 1);
      const playerColors = calculateColorCounts(currentRows.matches, player.user_id);
      const opponentColors = calculateColorCounts(currentRows.matches, opponent.user_id);
      const playerNeedsBlack = playerColors.black <= playerColors.white;
      const opponentNeedsBlack = opponentColors.black < opponentColors.white;
      const black = playerNeedsBlack || !opponentNeedsBlack ? player : opponent;
      const white = black.user_id === player.user_id ? opponent : player;
      pairings.push({ black_user_id: black.user_id, white_user_id: white.user_id, result: "Scheduled", winner_user_id: null });
    }

    if (byePairing) {
      pairings.push(byePairing);
    }

    let tableNumber = 1;
    for (const pairing of pairings) {
      await client.query(
        `
          INSERT INTO competition_matches (
            competition_id,
            category_id,
            round_id,
            table_number,
            black_user_id,
            white_user_id,
            result,
            winner_user_id,
            completed_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::varchar, $8, CASE WHEN $7::varchar = 'Bye' THEN CURRENT_TIMESTAMP ELSE NULL END);
        `,
        [
          data.competition_id,
          data.category_id,
          roundResult.rows[0].id,
          tableNumber,
          pairing.black_user_id,
          pairing.white_user_id,
          pairing.result,
          pairing.winner_user_id,
        ]
      );
      tableNumber += 1;
    }

    await client.query("COMMIT");
    return {
      round: roundResult.rows[0],
      pairings: pairings.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports.updateMatchResult = async (data) => {
  const result = await pool.query(
    `
      UPDATE competition_matches
      SET result = $1::varchar,
          winner_user_id = CASE
            WHEN $1::varchar = 'Black Win' THEN black_user_id
            WHEN $1::varchar = 'White Win' THEN white_user_id
            WHEN $1::varchar = 'Forfeit Black' THEN white_user_id
            WHEN $1::varchar = 'Forfeit White' THEN black_user_id
            WHEN $1::varchar = 'Bye' THEN black_user_id
            ELSE NULL
          END,
          completed_at = CASE WHEN $1::varchar = 'Scheduled' THEN NULL ELSE CURRENT_TIMESTAMP END
      WHERE id = $2
      RETURNING *;
    `,
    [data.result, data.match_id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

module.exports.recordRankingSnapshot = async (data) => {
  const rows = await selectTournamentRows(data.competition_id, data.category_id);
  const standings = buildStandings(rows.participants, rows.matches);
  const latestRound = rows.matches.reduce((maxRound, match) => Math.max(maxRound, Number(match.round_number || 0)), 0);

  for (const standing of standings) {
    await pool.query(
      `
        INSERT INTO competition_ranking_records (
          competition_id,
          category_id,
          user_id,
          round_number,
          rank_position,
          mms,
          sos,
          sosos,
          wins,
          losses,
          byes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (competition_id, category_id, user_id, round_number)
        DO UPDATE SET
          rank_position = EXCLUDED.rank_position,
          mms = EXCLUDED.mms,
          sos = EXCLUDED.sos,
          sosos = EXCLUDED.sosos,
          wins = EXCLUDED.wins,
          losses = EXCLUDED.losses,
          byes = EXCLUDED.byes,
          recorded_at = CURRENT_TIMESTAMP;
      `,
      [
        data.competition_id,
        data.category_id,
        standing.user_id,
        latestRound,
        standing.rank_position,
        standing.mms,
        standing.sos,
        standing.sosos,
        standing.wins,
        standing.losses,
        standing.byes,
      ]
    );
  }
};
