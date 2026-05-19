const model = require("../models/notificationModel");

module.exports.readMine = (req, res) => {
  model.selectForUser({ user_id: res.locals.userId }, (error, results) => {
    if (error) {
      console.error("Error read notifications:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(results.rows);
  });
};

module.exports.markRead = (req, res) => {
  model.markRead(
    { notification_id: req.params.notification_id, user_id: res.locals.userId },
    (error, results) => {
      if (error) {
        console.error("Error mark notification read:", error);
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(404).json({ message: "Notification not found" });
      }

      return res.status(200).json(results.rows[0]);
    }
  );
};

module.exports.createAnnouncement = (req, res) => {
  const title = (req.body.title || "").trim();
  const message = (req.body.message || "").trim();
  const targetType = req.body.targetType || "All";
  const targetId = req.body.targetId ? Number(req.body.targetId) : null;

  if (!title || !message) {
    return res.status(400).json({ message: "Announcement title and message are required" });
  }

  const handleRecipients = async (error, results) => {
    if (error) {
      console.error("Error select announcement users:", error);
      return res.status(500).json(error);
    }

    const userIds = results.rows.map((row) => row.id);
    const targetLabel = targetType === "All"
      ? "All active users"
      : `${targetType}: ${results.rows[0]?.activity_title || `#${targetId}`}`;
    const notificationTitle = targetType === "All" ? title : `${title} (${targetLabel})`;
    const notificationMessage = targetType === "All" ? message : `[${targetLabel}] ${message}`;

    await model.insertMany({
      userIds,
      title: notificationTitle,
      message: notificationMessage,
      type: "Announcement",
      activityType: targetType === "All" ? null : targetType,
      activityId: targetId,
    });

    return res.status(201).json({ message: "Announcement sent", recipients: userIds.length, target: targetLabel });
  };

  if (targetType === "Event") {
    return model.selectEventUserIds({ event_id: targetId }, handleRecipients);
  }

  if (targetType === "Competition") {
    return model.selectCompetitionUserIds({ competition_id: targetId }, handleRecipients);
  }

  return model.selectActiveUserIds(handleRecipients);
};

module.exports.readMyUpcomingActivities = (req, res) => {
  model.selectMyUpcomingActivities({ user_id: res.locals.userId }, (error, results) => {
    if (error) {
      console.error("Error read my upcoming activities:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(results.rows);
  });
};
