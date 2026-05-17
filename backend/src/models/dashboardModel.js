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
      (SELECT COUNT(*)::int FROM events WHERE requires_approval = TRUE) AS approval_required_events,
      (SELECT COUNT(*)::int FROM event_registrations) AS total_registrations,
      (SELECT COUNT(*)::int FROM event_registrations WHERE status = 'Registered') AS approved_registrations,
      (SELECT COUNT(*)::int FROM event_registrations WHERE status = 'Pending Approval') AS pending_registrations,
      (SELECT COUNT(*)::int FROM event_registrations WHERE status = 'Rejected') AS rejected_registrations,
      (SELECT COUNT(*)::int FROM event_registrations WHERE attended = TRUE) AS total_attended,
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
      (SELECT COUNT(*)::int FROM competition_categories) AS total_categories,
      (SELECT COUNT(*)::int FROM competition_registrations) AS total_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE status = 'Registered') AS approved_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE status = 'Pending Approval') AS pending_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE status = 'Waitlisted') AS waitlisted_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE status = 'Rejected') AS rejected_competition_registrations,
      (SELECT COUNT(*)::int FROM competition_registrations WHERE attended = TRUE) AS attended_competition_registrations,
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
            COALESCE(SUM(cc.capacity), 0)::int AS capacity,
            COUNT(cr.id) FILTER (WHERE cr.status IN ('Registered', 'Pending Approval', 'Waitlisted'))::int AS demand,
            COUNT(cr.id) FILTER (WHERE cr.status = 'Registered')::int AS confirmed,
            CASE
              WHEN COALESCE(SUM(cc.capacity), 0) = 0 THEN 0
              ELSE ROUND((COUNT(cr.id) FILTER (WHERE cr.status IN ('Registered', 'Pending Approval', 'Waitlisted'))::numeric / SUM(cc.capacity)) * 100)::int
            END AS fill_rate
          FROM competitions c
          LEFT JOIN competition_categories cc ON cc.competition_id = c.id
          LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
          GROUP BY c.id
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
            COALESCE(v.name, 'Unassigned') AS venue_name,
            COUNT(c.id)::int AS competition_count,
            COALESCE(SUM(cc.capacity), 0)::int AS total_capacity,
            COUNT(cr.id) FILTER (WHERE cr.status IN ('Registered', 'Pending Approval', 'Waitlisted'))::int AS total_demand
          FROM competitions c
          LEFT JOIN venues v ON v.id = c.venue_id
          LEFT JOIN competition_categories cc ON cc.competition_id = c.id
          LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
          GROUP BY COALESCE(v.name, 'Unassigned')
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
