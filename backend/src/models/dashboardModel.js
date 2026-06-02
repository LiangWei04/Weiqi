const pool = require("../services/db");

module.exports.selectStats = (callback) => {
  const SQLSTATEMENT = `
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE active = TRUE) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE active = TRUE AND status = 'Active') AS active_members,
      (SELECT COUNT(*)::int FROM users WHERE active = FALSE OR status = 'Inactive') AS inactive_users,
      (SELECT COUNT(*)::int FROM users WHERE active = TRUE AND email_verified = TRUE) AS verified_users,
      (SELECT COUNT(*)::int FROM users WHERE active = TRUE AND email_verified = FALSE) AS unverified_users,
      (SELECT COUNT(*)::int FROM events) AS total_events,
      (SELECT COUNT(*)::int FROM events WHERE status = 'Open') AS open_events,
      (SELECT COUNT(*)::int FROM events WHERE status = 'Draft') AS draft_events,
      (SELECT COUNT(*)::int FROM events WHERE status = 'Cancelled') AS cancelled_events,
      (SELECT COUNT(*)::int FROM events WHERE pinned = TRUE) AS pinned_events,
      (SELECT COUNT(*)::int FROM events WHERE event_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date) AS upcoming_events,
      (SELECT COUNT(*)::int FROM events WHERE event_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date) AS archived_events,
      (SELECT COALESCE(SUM(capacity), 0)::int FROM events WHERE status = 'Open') AS open_event_capacity,
      (SELECT COUNT(*)::int FROM events WHERE requires_approval = TRUE) AS approval_required_events,
      (SELECT COUNT(*)::int FROM event_registrations) AS total_registrations,
      (SELECT COUNT(*)::int FROM event_registrations WHERE status = 'Registered') AS approved_registrations,
      (SELECT COUNT(*)::int FROM event_registrations WHERE status = 'Pending Approval') AS pending_registrations,
      (SELECT COUNT(*)::int FROM event_registrations WHERE status = 'Rejected') AS rejected_registrations,
      (SELECT COUNT(*)::int FROM event_registrations WHERE attended = TRUE) AS total_attended,
      (SELECT COUNT(*)::int FROM event_comments WHERE deleted_at IS NULL) AS event_comment_count,
      (SELECT COUNT(*)::int FROM event_reactions) AS event_reaction_count,
      (SELECT COUNT(*)::int FROM notifications) AS notification_count,
      (SELECT COUNT(*)::int FROM notifications WHERE read_at IS NULL) AS unread_notification_count,
      (
        SELECT e.title
        FROM events e
        LEFT JOIN event_registrations r ON r.event_id = e.id
        GROUP BY e.id
        ORDER BY COUNT(r.id) DESC
        LIMIT 1
      ) AS most_popular_event,
      (
        SELECT COALESCE(json_agg(role_summary ORDER BY role_summary.role), '[]'::json)
        FROM (
          SELECT role, COUNT(*)::int AS total
          FROM users
          WHERE active = TRUE
          GROUP BY role
        ) role_summary
      ) AS role_breakdown,
      (
        SELECT COALESCE(json_agg(status_summary ORDER BY status_summary.status), '[]'::json)
        FROM (
          SELECT status, COUNT(*)::int AS total
          FROM users
          WHERE active = TRUE
          GROUP BY status
        ) status_summary
      ) AS user_status_breakdown,
      (
        SELECT COALESCE(json_agg(registration_summary ORDER BY registration_summary.status), '[]'::json)
        FROM (
          SELECT status, COUNT(*)::int AS total
          FROM event_registrations
          GROUP BY status
        ) registration_summary
      ) AS registration_status_breakdown,
      (
        SELECT COALESCE(json_agg(event_summary ORDER BY event_summary.registered DESC, event_summary.title), '[]'::json)
        FROM (
          SELECT
            e.id,
            e.title,
            e.capacity,
            COUNT(r.id) FILTER (WHERE r.status = 'Registered')::int AS registered,
            COUNT(r.id) FILTER (WHERE r.status = 'Pending Approval')::int AS pending,
            COALESCE(SUM(CASE WHEN r.attended THEN 1 ELSE 0 END), 0)::int AS attended,
            CASE
              WHEN e.capacity = 0 THEN 0
              ELSE ROUND((COUNT(r.id) FILTER (WHERE r.status = 'Registered')::numeric / e.capacity) * 100)::int
            END AS fill_rate
          FROM events e
          LEFT JOIN event_registrations r ON r.event_id = e.id
          GROUP BY e.id
        ) event_summary
      ) AS event_popularity,
      (
        SELECT COALESCE(json_agg(attendance_summary ORDER BY attendance_summary.attendance_rate DESC, attendance_summary.title), '[]'::json)
        FROM (
          SELECT
            e.title,
            COUNT(r.id) FILTER (WHERE r.status = 'Registered')::int AS registered,
            COALESCE(SUM(CASE WHEN r.attended THEN 1 ELSE 0 END), 0)::int AS attended,
            CASE
              WHEN COUNT(r.id) FILTER (WHERE r.status = 'Registered') = 0 THEN 0
              ELSE ROUND(
                (COALESCE(SUM(CASE WHEN r.attended THEN 1 ELSE 0 END), 0)::numeric /
                COUNT(r.id) FILTER (WHERE r.status = 'Registered')) * 100
              )::int
            END AS attendance_rate
          FROM events e
          LEFT JOIN event_registrations r ON r.event_id = e.id
          GROUP BY e.id
        ) attendance_summary
      ) AS attendance_by_event,
      (SELECT COUNT(*)::int FROM competitions) AS total_competitions,
      (SELECT COUNT(*)::int FROM competitions WHERE status = 'Open') AS open_competitions,
      (SELECT COUNT(*)::int FROM competitions WHERE status = 'Draft') AS draft_competitions,
      (SELECT COUNT(*)::int FROM competitions WHERE status = 'In Progress') AS in_progress_competitions,
      (SELECT COUNT(*)::int FROM competitions WHERE status = 'Completed') AS completed_competitions,
      (SELECT COUNT(*)::int FROM competitions WHERE status = 'Cancelled') AS cancelled_competitions,
      (SELECT COUNT(*)::int FROM competitions WHERE COALESCE(end_date, start_date) >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date) AS upcoming_competitions,
      (SELECT COUNT(*)::int FROM competitions WHERE COALESCE(end_date, start_date) < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date) AS archived_competitions,
      (SELECT COUNT(*)::int FROM competition_categories) AS total_categories,
      (SELECT COALESCE(SUM(capacity), 0)::int FROM competition_categories) AS total_competition_capacity,
      (SELECT COUNT(*)::int FROM competition_registrations) AS total_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE status = 'Registered') AS approved_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE status = 'Pending Approval') AS pending_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE status = 'Waitlisted') AS waitlisted_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE status = 'Rejected') AS rejected_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE attended = TRUE) AS attended_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_rounds) AS total_competition_rounds,
      (SELECT COUNT(*)::int FROM competition_rounds WHERE status <> 'Completed') AS open_competition_rounds,
      (SELECT COUNT(*)::int FROM competition_matches) AS total_competition_matches,
      (SELECT COUNT(*)::int FROM competition_matches WHERE result = 'Scheduled') AS scheduled_competition_matches,
      (SELECT COUNT(*)::int FROM competition_matches WHERE result <> 'Scheduled') AS completed_competition_matches,
      (SELECT COUNT(*)::int FROM competition_ranking_records) AS ranking_snapshot_count,
      (
        SELECT COALESCE(json_agg(status_summary ORDER BY status_summary.status), '[]'::json)
        FROM (
          SELECT status, COUNT(*)::int AS total
          FROM competitions
          GROUP BY status
        ) status_summary
      ) AS competition_status_breakdown,
      (
        SELECT COALESCE(json_agg(format_summary ORDER BY format_summary.total DESC, format_summary.name), '[]'::json)
        FROM (
          SELECT tf.name, COUNT(c.id)::int AS total
          FROM tournament_formats tf
          LEFT JOIN competition_settings cs ON cs.tournament_format_id = tf.id
          LEFT JOIN competitions c ON c.id = cs.competition_id
          GROUP BY tf.id, tf.name
        ) format_summary
      ) AS format_breakdown,
      (
        SELECT COALESCE(json_agg(status_summary ORDER BY status_summary.sort_order), '[]'::json)
        FROM (
          SELECT 'Pending Approval' AS status, COUNT(*)::int AS total, 1 AS sort_order
          FROM competition_registrations WHERE status = 'Pending Approval'
          UNION ALL
          SELECT 'Registered', COUNT(*)::int, 2 FROM competition_registrations WHERE status = 'Registered'
          UNION ALL
          SELECT 'Waitlisted', COUNT(*)::int, 3 FROM competition_registrations WHERE status = 'Waitlisted'
          UNION ALL
          SELECT 'Rejected', COUNT(*)::int, 4 FROM competition_registrations WHERE status = 'Rejected'
          UNION ALL
          SELECT 'Withdrawn', COUNT(*)::int, 5 FROM competition_registrations WHERE status = 'Withdrawn'
        ) status_summary
      ) AS competition_registration_funnel,
      (
        SELECT COALESCE(json_agg(capacity_summary ORDER BY capacity_summary.fill_rate DESC, capacity_summary.title), '[]'::json)
        FROM (
          SELECT
            c.id,
            c.title,
            (SELECT COALESCE(SUM(cc.capacity), 0)::int FROM competition_categories cc WHERE cc.competition_id = c.id) AS capacity,
            (
              SELECT COUNT(*)::int
              FROM competition_registrations cr
              JOIN competition_categories cc ON cc.id = cr.category_id
              WHERE cc.competition_id = c.id
                AND cr.status IN ('Registered', 'Pending Approval', 'Waitlisted')
            ) AS demand,
            (
              SELECT COUNT(*)::int
              FROM competition_registrations cr
              JOIN competition_categories cc ON cc.id = cr.category_id
              WHERE cc.competition_id = c.id
                AND cr.status = 'Registered'
            ) AS confirmed,
            CASE
              WHEN (SELECT COALESCE(SUM(cc.capacity), 0) FROM competition_categories cc WHERE cc.competition_id = c.id) = 0 THEN 0
              ELSE ROUND((
                (
                  SELECT COUNT(*)::numeric
                  FROM competition_registrations cr
                  JOIN competition_categories cc ON cc.id = cr.category_id
                  WHERE cc.competition_id = c.id
                    AND cr.status IN ('Registered', 'Pending Approval', 'Waitlisted')
                ) /
                (SELECT SUM(cc.capacity)::numeric FROM competition_categories cc WHERE cc.competition_id = c.id)
              ) * 100)::int
            END AS fill_rate
          FROM competitions c
        ) capacity_summary
      ) AS competition_capacity,
      (
        SELECT COALESCE(json_agg(category_summary ORDER BY category_summary.demand DESC, category_summary.category_name), '[]'::json)
        FROM (
          SELECT
            c.title AS competition_title,
            cc.name AS category_name,
            cc.capacity,
            COUNT(cr.id)::int AS demand,
            COUNT(cr.id) FILTER (WHERE cr.status = 'Registered')::int AS confirmed,
            COUNT(cr.id) FILTER (WHERE cr.status = 'Pending Approval')::int AS pending
          FROM competition_categories cc
          JOIN competitions c ON c.id = cc.competition_id
          LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
          GROUP BY c.title, cc.id
        ) category_summary
      ) AS category_demand,
      (
        SELECT COALESCE(json_agg(daily_summary ORDER BY daily_summary.registration_date), '[]'::json)
        FROM (
          SELECT
            registered_at::date AS registration_date,
            COUNT(*)::int AS total
          FROM competition_registrations
          GROUP BY registered_at::date
        ) daily_summary
      ) AS registrations_over_time,
      (
        SELECT COALESCE(json_agg(venue_summary ORDER BY venue_summary.competition_count DESC, venue_summary.venue_name), '[]'::json)
        FROM (
          SELECT
            venue_rows.venue_name,
            COUNT(*)::int AS competition_count,
            COALESCE(SUM(venue_rows.capacity), 0)::int AS total_capacity,
            COALESCE(SUM(venue_rows.demand), 0)::int AS total_demand
          FROM (
            SELECT
              c.id,
              COALESCE(v.name, 'Unassigned') AS venue_name,
              (SELECT COALESCE(SUM(cc.capacity), 0)::int FROM competition_categories cc WHERE cc.competition_id = c.id) AS capacity,
              (
                SELECT COUNT(*)::int
                FROM competition_registrations cr
                JOIN competition_categories cc ON cc.id = cr.category_id
                WHERE cc.competition_id = c.id
                  AND cr.status IN ('Registered', 'Pending Approval', 'Waitlisted')
              ) AS demand
            FROM competitions c
            LEFT JOIN venues v ON v.id = c.venue_id
          ) venue_rows
          GROUP BY venue_rows.venue_name
        ) venue_summary
      ) AS venue_utilization,
      (
        SELECT COALESCE(json_agg(attendance_summary ORDER BY attendance_summary.attendance_rate DESC, attendance_summary.title), '[]'::json)
        FROM (
          SELECT
            c.title,
            COUNT(cr.id) FILTER (WHERE cr.status = 'Registered')::int AS registered,
            COUNT(cr.id) FILTER (WHERE cr.attended = TRUE)::int AS attended,
            CASE
              WHEN COUNT(cr.id) FILTER (WHERE cr.status = 'Registered') = 0 THEN 0
              ELSE ROUND(
                (COUNT(cr.id) FILTER (WHERE cr.attended = TRUE)::numeric /
                COUNT(cr.id) FILTER (WHERE cr.status = 'Registered')) * 100
              )::int
            END AS attendance_rate
          FROM competitions c
          LEFT JOIN competition_categories cc ON cc.competition_id = c.id
          LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
          GROUP BY c.id
        ) attendance_summary
      ) AS competition_attendance;
  `;
  pool.query(SQLSTATEMENT, callback);
};

module.exports.selectMemberStats = (data, callback) => {
  const SQLSTATEMENT = `
    WITH activity_rows AS (
      SELECT
        'Event'::text AS activity_type,
        e.title,
        NULL::text AS detail,
        e.event_date::timestamp AS activity_date,
        v.name::text AS venue,
        r.status,
        r.attended,
        r.created_at
      FROM event_registrations r
      JOIN events e ON e.id = r.event_id
      LEFT JOIN venues v ON v.id = e.venue_id
      WHERE r.user_id = $1

      UNION ALL

      SELECT
        'Competition'::text AS activity_type,
        c.title,
        cc.name::text AS detail,
        c.start_date::timestamp AS activity_date,
        v.name::text AS venue,
        cr.status,
        cr.attended,
        cr.registered_at AS created_at
      FROM competition_registrations cr
      JOIN competition_categories cc ON cc.id = cr.category_id
      JOIN competitions c ON c.id = cc.competition_id
      LEFT JOIN venues v ON v.id = c.venue_id
      WHERE cr.user_id = $1
    ),
    player_matches AS (
      SELECT
        m.id AS match_id,
        c.id AS competition_id,
        c.title AS competition_title,
        cc.name AS category_name,
        r.round_number,
        m.table_number,
        m.result,
        m.completed_at,
        opponent.id AS opponent_id,
        opponent.name AS opponent_name,
        CASE
          WHEN m.result = 'Bye' THEN 'Bye'
          WHEN m.black_user_id = $1 AND m.result IN ('Black Win', 'Forfeit White') THEN 'Win'
          WHEN m.white_user_id = $1 AND m.result IN ('White Win', 'Forfeit Black') THEN 'Win'
          WHEN m.black_user_id = $1 AND m.result IN ('White Win', 'Forfeit Black') THEN 'Loss'
          WHEN m.white_user_id = $1 AND m.result IN ('Black Win', 'Forfeit White') THEN 'Loss'
          ELSE 'Scheduled'
        END AS outcome
      FROM competition_matches m
      JOIN competition_rounds r ON r.id = m.round_id
      JOIN competitions c ON c.id = m.competition_id
      JOIN competition_categories cc ON cc.id = m.category_id
      LEFT JOIN users opponent ON opponent.id = CASE
        WHEN m.black_user_id = $1 THEN m.white_user_id
        ELSE m.black_user_id
      END
      WHERE (m.black_user_id = $1 OR m.white_user_id = $1)
        AND m.result <> 'Scheduled'
    ),
    latest_rankings AS (
      SELECT DISTINCT ON (rr.competition_id, rr.category_id)
        rr.competition_id,
        rr.category_id,
        c.title AS competition_title,
        cc.name AS category_name,
        rr.round_number,
        rr.rank_position,
        rr.mms,
        rr.sos,
        rr.sosos,
        rr.wins,
        rr.losses,
        rr.byes,
        rr.recorded_at
      FROM competition_ranking_records rr
      JOIN competitions c ON c.id = rr.competition_id
      JOIN competition_categories cc ON cc.id = rr.category_id
      WHERE rr.user_id = $1
      ORDER BY rr.competition_id, rr.category_id, rr.round_number DESC, rr.recorded_at DESC
    )
    SELECT
      COUNT(*)::int AS total_registrations,
      COUNT(*) FILTER (WHERE activity_type = 'Event')::int AS event_registrations,
      COUNT(*) FILTER (WHERE activity_type = 'Competition')::int AS competition_registrations,
      COUNT(*) FILTER (WHERE activity_type = 'Event' AND status = 'Registered')::int AS approved_event_registrations,
      COUNT(*) FILTER (WHERE activity_type = 'Competition' AND status = 'Registered')::int AS approved_competition_registrations,
      COUNT(*) FILTER (WHERE status = 'Registered')::int AS approved_registrations,
      COUNT(*) FILTER (WHERE status = 'Pending Approval')::int AS pending_registrations,
      COUNT(*) FILTER (WHERE status = 'Waitlisted')::int AS waitlisted_registrations,
      COUNT(*) FILTER (WHERE status = 'Rejected')::int AS rejected_registrations,
      COUNT(*) FILTER (WHERE attended = TRUE)::int AS attended_count,
      COUNT(*) FILTER (WHERE activity_type = 'Event' AND attended = TRUE)::int AS attended_event_count,
      COUNT(*) FILTER (WHERE activity_type = 'Competition' AND attended = TRUE)::int AS attended_competition_count,
      CASE
        WHEN COUNT(*) FILTER (WHERE status = 'Registered') = 0 THEN 0
        ELSE ROUND(
          (COUNT(*) FILTER (WHERE attended = TRUE)::numeric /
          COUNT(*) FILTER (WHERE status = 'Registered')) * 100
        )::int
      END AS attendance_rate,
      COUNT(*) FILTER (
        WHERE activity_date >= CURRENT_DATE
          AND status IN ('Registered', 'Pending Approval', 'Waitlisted')
      )::int AS upcoming_count,
      (
        SELECT COALESCE(json_agg(status_summary ORDER BY status_summary.status), '[]'::json)
        FROM (
          SELECT status, COUNT(*)::int AS total
          FROM activity_rows
          GROUP BY status
        ) status_summary
      ) AS status_breakdown,
      (
        SELECT COALESCE(json_agg(type_summary ORDER BY type_summary.name), '[]'::json)
        FROM (
          SELECT activity_type AS name, COUNT(*)::int AS total
          FROM activity_rows
          GROUP BY activity_type
        ) type_summary
      ) AS type_breakdown,
      (
        SELECT COALESCE(json_agg(month_summary ORDER BY month_summary.month), '[]'::json)
        FROM (
          SELECT
            date_trunc('month', created_at)::date AS month,
            COUNT(*)::int AS total
          FROM activity_rows
          GROUP BY date_trunc('month', created_at)::date
        ) month_summary
      ) AS monthly_activity,
      (SELECT COUNT(*)::int FROM player_matches WHERE outcome IN ('Win', 'Loss')) AS competition_matches_played,
      (SELECT COUNT(*)::int FROM player_matches WHERE outcome = 'Win') AS competition_match_wins,
      (SELECT COUNT(*)::int FROM player_matches WHERE outcome = 'Loss') AS competition_match_losses,
      (SELECT COUNT(*)::int FROM player_matches WHERE outcome = 'Bye') AS competition_byes,
      (
        SELECT CASE
          WHEN COUNT(*) FILTER (WHERE outcome IN ('Win', 'Loss')) = 0 THEN 0
          ELSE ROUND(
            (COUNT(*) FILTER (WHERE outcome = 'Win')::numeric /
            COUNT(*) FILTER (WHERE outcome IN ('Win', 'Loss'))) * 100
          )::int
        END
        FROM player_matches
      ) AS competition_win_rate,
      (SELECT COUNT(*)::int FROM latest_rankings WHERE rank_position = 1) AS first_place_count,
      (SELECT COUNT(*)::int FROM latest_rankings WHERE rank_position = 2) AS second_place_count,
      (SELECT COUNT(*)::int FROM latest_rankings WHERE rank_position = 3) AS third_place_count,
      (SELECT COUNT(*)::int FROM latest_rankings WHERE rank_position <= 5) AS top5_count,
      (SELECT COUNT(*)::int FROM latest_rankings WHERE rank_position <= 10) AS top10_count,
      (SELECT MIN(rank_position)::int FROM latest_rankings) AS best_finish,
      (SELECT COUNT(*)::int FROM events WHERE created_by = $1) AS events_created,
      (SELECT COUNT(*)::int FROM competitions WHERE organizer_id = $1) AS competitions_organized,
      (SELECT COUNT(*)::int FROM competition_rounds WHERE generated_by = $1) AS rounds_generated,
      (SELECT COUNT(*)::int FROM event_comments WHERE user_id = $1 AND deleted_at IS NULL) AS comments_posted,
      (SELECT COUNT(*)::int FROM event_reactions WHERE user_id = $1) AS reactions_made,
      (SELECT COUNT(*)::int FROM attendance_change_requests WHERE requested_by = $1) AS attendance_requests_made,
      (SELECT COUNT(*)::int FROM attendance_change_requests WHERE reviewed_by = $1) AS attendance_requests_reviewed,
      (
        SELECT COUNT(*)::int
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id
        WHERE e.created_by = $1
      ) AS managed_event_signups,
      (
        SELECT COUNT(*)::int
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id
        WHERE e.created_by = $1
          AND er.status = 'Pending Approval'
      ) AS managed_event_pending,
      (
        SELECT COUNT(*)::int
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id
        WHERE e.created_by = $1
          AND er.attended = TRUE
      ) AS managed_event_attended,
      (
        SELECT COUNT(*)::int
        FROM competition_registrations cr
        JOIN competition_categories cc ON cc.id = cr.category_id
        JOIN competitions c ON c.id = cc.competition_id
        WHERE c.organizer_id = $1
      ) AS managed_competition_signups,
      (
        SELECT COUNT(*)::int
        FROM competition_registrations cr
        JOIN competition_categories cc ON cc.id = cr.category_id
        JOIN competitions c ON c.id = cc.competition_id
        WHERE c.organizer_id = $1
          AND cr.status = 'Pending Approval'
      ) AS managed_competition_pending,
      (
        SELECT COUNT(*)::int
        FROM competition_registrations cr
        JOIN competition_categories cc ON cc.id = cr.category_id
        JOIN competitions c ON c.id = cc.competition_id
        WHERE c.organizer_id = $1
          AND cr.attended = TRUE
      ) AS managed_competition_attended,
      (
        SELECT COALESCE(json_agg(contribution_summary ORDER BY contribution_summary.sort_order), '[]'::json)
        FROM (
          SELECT 'Events Created' AS name, COUNT(*)::int AS total, 1 AS sort_order FROM events WHERE created_by = $1
          UNION ALL
          SELECT 'Competitions Organized', COUNT(*)::int, 2 FROM competitions WHERE organizer_id = $1
          UNION ALL
          SELECT 'Rounds Generated', COUNT(*)::int, 3 FROM competition_rounds WHERE generated_by = $1
          UNION ALL
          SELECT 'Comments Posted', COUNT(*)::int, 4 FROM event_comments WHERE user_id = $1 AND deleted_at IS NULL
          UNION ALL
          SELECT 'Reactions Made', COUNT(*)::int, 5 FROM event_reactions WHERE user_id = $1
          UNION ALL
          SELECT 'Attendance Reviews', COUNT(*)::int, 6 FROM attendance_change_requests WHERE reviewed_by = $1
        ) contribution_summary
      ) AS exco_contribution_breakdown,
      (
        SELECT COALESCE(json_agg(load_summary ORDER BY load_summary.activity_type), '[]'::json)
        FROM (
          SELECT
            'Events' AS activity_type,
            COUNT(er.id)::int AS total_signups,
            COUNT(er.id) FILTER (WHERE er.status = 'Pending Approval')::int AS pending,
            COUNT(er.id) FILTER (WHERE er.attended = TRUE)::int AS attended
          FROM events e
          LEFT JOIN event_registrations er ON er.event_id = e.id
          WHERE e.created_by = $1
          UNION ALL
          SELECT
            'Competitions' AS activity_type,
            COUNT(cr.id)::int AS total_signups,
            COUNT(cr.id) FILTER (WHERE cr.status = 'Pending Approval')::int AS pending,
            COUNT(cr.id) FILTER (WHERE cr.attended = TRUE)::int AS attended
          FROM competitions c
          LEFT JOIN competition_categories cc ON cc.competition_id = c.id
          LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
          WHERE c.organizer_id = $1
        ) load_summary
      ) AS managed_activity_load,
      (
        SELECT COALESCE(json_agg(result_summary ORDER BY result_summary.sort_order), '[]'::json)
        FROM (
          SELECT 'Win' AS status, COUNT(*)::int AS total, 1 AS sort_order FROM player_matches WHERE outcome = 'Win'
          UNION ALL
          SELECT 'Loss', COUNT(*)::int, 2 FROM player_matches WHERE outcome = 'Loss'
          UNION ALL
          SELECT 'Bye', COUNT(*)::int, 3 FROM player_matches WHERE outcome = 'Bye'
        ) result_summary
      ) AS competition_result_breakdown,
      (
        SELECT COALESCE(json_agg(opponent_summary ORDER BY opponent_summary.played DESC, opponent_summary.opponent_name), '[]'::json)
        FROM (
          SELECT
            opponent_id,
            COALESCE(opponent_name, 'Bye') AS opponent_name,
            COUNT(*) FILTER (WHERE outcome IN ('Win', 'Loss'))::int AS played,
            COUNT(*) FILTER (WHERE outcome = 'Win')::int AS wins,
            COUNT(*) FILTER (WHERE outcome = 'Loss')::int AS losses,
            MAX(completed_at) AS last_played
          FROM player_matches
          WHERE opponent_id IS NOT NULL
          GROUP BY opponent_id, opponent_name
          ORDER BY COUNT(*) FILTER (WHERE outcome IN ('Win', 'Loss')) DESC, opponent_name
          LIMIT 8
        ) opponent_summary
      ) AS opponent_records,
      (
        SELECT COALESCE(json_agg(match_summary ORDER BY match_summary.completed_at DESC NULLS LAST, match_summary.round_number DESC), '[]'::json)
        FROM (
          SELECT
            competition_title,
            category_name,
            round_number,
            table_number,
            opponent_name,
            outcome,
            completed_at
          FROM player_matches
          ORDER BY completed_at DESC NULLS LAST, round_number DESC
          LIMIT 4
        ) match_summary
      ) AS recent_matches,
      (
        SELECT COALESCE(json_agg(achievement ORDER BY achievement.rank_position, achievement.competition_title), '[]'::json)
        FROM (
          SELECT
            competition_title,
            category_name,
            round_number,
            rank_position,
            mms,
            sos,
            sosos,
            wins,
            losses
          FROM latest_rankings
          ORDER BY rank_position, competition_title
          LIMIT 4
        ) achievement
      ) AS competition_achievements,
      (
        SELECT COALESCE(json_agg(activity ORDER BY activity.activity_date ASC, activity.created_at DESC), '[]'::json)
        FROM (
          SELECT
            activity_type,
            title,
            detail,
            activity_date,
            venue,
            status,
            attended,
            created_at
          FROM activity_rows
          WHERE activity_date >= CURRENT_DATE
            AND status IN ('Registered', 'Pending Approval', 'Waitlisted')
          ORDER BY activity_date ASC, created_at DESC
          LIMIT 8
        ) activity
      ) AS upcoming_activities
    FROM activity_rows;
  `;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};
