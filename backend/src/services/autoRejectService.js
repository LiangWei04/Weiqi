const db = require("./db");
const emailService = require("./emailService");
const notificationModel = require("../models/notificationModel");

const sendRejectionMessages = async ({ rows, activityType }) => {
  if (rows.length === 0) {
    return { rejected: 0, notified: 0, emailsSent: 0, emailsSkipped: 0 };
  }

  const notificationGroups = new Map();
  rows.forEach((row) => {
    const key = `${row.activity_id}-${row.rejection_reason}`;
    const group = notificationGroups.get(key) || {
      userIds: [],
      activityId: row.activity_id,
      activityTitle: row.activity_title,
      rejectionReason: row.rejection_reason,
    };
    group.userIds.push(row.user_id);
    notificationGroups.set(key, group);
  });

  await Promise.all(Array.from(notificationGroups.values()).map((group) => (
    notificationModel.insertMany({
      userIds: group.userIds.filter(Boolean),
      title: `${activityType} registration rejected`,
      message: `${group.activityTitle}: ${group.rejectionReason}`,
      type: "Activity",
      activityType,
      activityId: group.activityId,
    })
  )));

  const emailResults = await Promise.all(rows.map(async (row) => {
    try {
      const result = await emailService.sendActivityChangeEmail({
        to: row.email,
        name: row.name,
        activityType,
        activityTitle: row.activity_title,
        action: "Registration Rejected",
        reason: row.rejection_reason,
      });
      return result.sent ? "sent" : "skipped";
    } catch (error) {
      console.error("Auto rejection email failed:", error.message);
      return "skipped";
    }
  }));

  return {
    rejected: rows.length,
    notified: rows.filter((row) => row.user_id).length,
    emailsSent: emailResults.filter((result) => result === "sent").length,
    emailsSkipped: emailResults.filter((result) => result === "skipped").length,
  };
};

const rejectClosedOrFullEventRequests = async () => {
  const result = await db.query(`
    WITH event_counts AS (
      SELECT
        e.id,
        e.title,
        e.capacity,
        e.registration_deadline,
        COUNT(r.id) FILTER (WHERE r.status = 'Registered')::int AS registered_count
      FROM events e
      LEFT JOIN event_registrations r ON r.event_id = e.id
      WHERE e.requires_approval = TRUE
      GROUP BY e.id
    ),
    rejected AS (
      UPDATE event_registrations r
      SET status = 'Rejected',
          attended = FALSE
      FROM event_counts e, users u
      WHERE r.event_id = e.id
        AND u.id = r.user_id
        AND r.status = 'Pending Approval'
        AND (
          e.registration_deadline < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
          OR e.registered_count >= e.capacity
        )
      RETURNING
        r.id,
        r.user_id,
        u.name,
        u.email,
        e.id AS activity_id,
        e.title AS activity_title,
        CASE
          WHEN e.registration_deadline < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
            THEN 'Registration is closed, so your pending request has been rejected.'
          ELSE 'The event is full, so your pending request has been rejected.'
        END AS rejection_reason
    )
    SELECT * FROM rejected;
  `);

  return sendRejectionMessages({ rows: result.rows, activityType: "Event" });
};

const rejectClosedOrFullCompetitionRequests = async () => {
  const result = await db.query(`
    WITH category_counts AS (
      SELECT
        cc.id,
        cc.competition_id,
        cc.name AS category_name,
        cc.capacity,
        c.title,
        c.registration_deadline,
        cs.requires_approval,
        cs.registration_closes_at,
        COUNT(cr.id) FILTER (WHERE cr.status = 'Registered')::int AS registered_count
      FROM competition_categories cc
      JOIN competitions c ON c.id = cc.competition_id
      LEFT JOIN competition_settings cs ON cs.competition_id = c.id
      LEFT JOIN competition_registrations cr ON cr.category_id = cc.id
      GROUP BY cc.id, c.id, cs.competition_id
    ),
    rejected AS (
      UPDATE competition_registrations cr
      SET status = 'Rejected',
          attended = FALSE
      FROM category_counts cc, users u
      WHERE cr.category_id = cc.id
        AND u.id = cr.user_id
        AND cr.status = 'Pending Approval'
        AND cc.requires_approval = TRUE
        AND (
          cc.registration_closes_at < CURRENT_TIMESTAMP
          OR cc.registration_deadline < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
          OR cc.registered_count >= cc.capacity
        )
      RETURNING
        cr.id,
        cr.user_id,
        u.name,
        u.email,
        cc.competition_id AS activity_id,
        cc.title AS activity_title,
        CASE
          WHEN cc.registration_closes_at < CURRENT_TIMESTAMP
            OR cc.registration_deadline < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
            THEN 'Registration is closed, so your pending request has been rejected.'
          ELSE 'The competition category is full, so your pending request has been rejected.'
        END AS rejection_reason
    )
    SELECT * FROM rejected;
  `);

  return sendRejectionMessages({ rows: result.rows, activityType: "Competition" });
};

module.exports.rejectClosedOrFullPendingRequests = async () => {
  const [events, competitions] = await Promise.all([
    rejectClosedOrFullEventRequests(),
    rejectClosedOrFullCompetitionRequests(),
  ]);

  return { events, competitions };
};
