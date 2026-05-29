const model = require("../models/eventModel");
const emailService = require("../services/emailService");
const notificationModel = require("../models/notificationModel");
const autoRejectService = require("../services/autoRejectService");

const runAutoRejections = async () => {
  try {
    return await autoRejectService.rejectClosedOrFullPendingRequests();
  } catch (error) {
    console.error("Error auto rejecting pending requests:", error);
    return null;
  }
};

const notifyParticipants = async ({ recipients, activityType, activityTitle, action, reason }) => {
  const userIds = recipients.map((recipient) => recipient.user_id).filter(Boolean);
  await notificationModel.insertMany({
    userIds,
    title: `${activityType} ${action}`,
    message: `${activityTitle}: ${reason}`,
    type: "Activity",
    activityType,
    activityId: recipients[0]?.activity_id || null,
  });

  Promise.all(recipients.map(async (recipient) => {
    try {
      const result = await emailService.sendActivityChangeEmail({
        to: recipient.email,
        name: recipient.name,
        activityType,
        activityTitle,
        action,
        reason,
      });

      return result.sent ? "sent" : "skipped";
    } catch (error) {
      console.error("Activity change email failed:", error.message);
      return "skipped";
    }
  })).catch((error) => {
    console.error("Activity email batch failed:", error.message);
  });

  return {
    sent: 0,
    skipped: recipients.length,
    inApp: userIds.length,
  };
};

const isBeforeToday = (dateValue) => {
  if (!dateValue) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateValue) < today;
};

const isAfterDate = (dateValue, compareDateValue) => {
  if (!dateValue || !compareDateValue) {
    return false;
  }

  return new Date(dateValue) > new Date(compareDateValue);
};

const cleanCommentText = (value) => value.trim();

module.exports.readAll = async (req, res) => {
  await runAutoRejections();

  model.selectAll({ user_id: res.locals.userId }, (error, results) => {
    if (error) {
      console.error("Error readAll events:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(results.rows);
  });
};

module.exports.createEvent = (req, res) => {
  const requiredFields = ["title", "eventDate", "venue", "capacity"];
  for (const field of requiredFields) {
    if (req.body[field] === undefined || req.body[field] === "") {
      return res.status(400).json({ message: `${field} is undefined or empty` });
    }
  }

  if (isBeforeToday(req.body.eventDate)) {
    return res.status(400).json({ message: "Event date cannot be in the past" });
  }

  if (req.body.registrationDeadline && isAfterDate(req.body.registrationDeadline, req.body.eventDate)) {
    return res.status(400).json({ message: "Registration deadline cannot be after the event date" });
  }

  const data = {
    title: req.body.title,
    description: req.body.description || "",
    eventDate: req.body.eventDate,
    registrationDeadline: req.body.registrationDeadline || req.body.eventDate,
    venue: req.body.venue,
    capacity: req.body.capacity,
    status: "Draft",
    requiresApproval: Boolean(req.body.requiresApproval),
    createdBy: res.locals.userId,
  };

  model.insertSingle(data, (error, results) => {
    if (error) {
      console.error("Error createEvent:", error);
      return res.status(500).json(error);
    }

    return res.status(201).json(results.rows[0]);
  });
};

module.exports.updateEventById = (req, res) => {
  const reason = (req.body.reason || "").trim();
  const data = {
    event_id: req.params.event_id,
    title: req.body.title,
    description: req.body.description,
    eventDate: req.body.eventDate,
    registrationDeadline: req.body.registrationDeadline,
    venue: req.body.venue,
    capacity: req.body.capacity,
    status: req.body.status,
    requiresApproval: req.body.requiresApproval === undefined ? undefined : Boolean(req.body.requiresApproval),
    pinned: req.body.pinned === undefined ? undefined : Boolean(req.body.pinned),
  };

  model.selectById(data, (selectError, selectResults) => {
    if (selectError) {
      console.error("Error select event before update:", selectError);
      return res.status(500).json(selectError);
    }

    if (selectResults.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const existingEvent = selectResults.rows[0];
    const nextStatus = req.body.status || existingEvent.status;
    const isDraftOnlyUpdate = existingEvent.status === "Draft" && nextStatus === "Draft";

    if (!isDraftOnlyUpdate && !reason) {
      return res.status(400).json({ message: "Reason for change is required for published events. Draft edits do not need a reason." });
    }

    const nextEventDate = req.body.eventDate || existingEvent.event_date;
    const nextRegistrationDeadline = req.body.registrationDeadline || existingEvent.registration_deadline;

    if (req.body.eventDate && isBeforeToday(req.body.eventDate)) {
      return res.status(400).json({ message: "Event date cannot be in the past" });
    }

    if (nextRegistrationDeadline && nextEventDate && isAfterDate(nextRegistrationDeadline, nextEventDate)) {
      return res.status(400).json({ message: "Registration deadline cannot be after the event date" });
    }

    model.selectNotificationRecipients(data, (recipientError, recipientResults) => {
      if (recipientError) {
        console.error("Error select event recipients:", recipientError);
        return res.status(500).json(recipientError);
      }

      model.updateById(data, async (error, results) => {
        if (error) {
          console.error("Error updateEventById:", error);
          return res.status(500).json(error);
        }

        if (results.rows.length === 0) {
          return res.status(404).json({ message: "Event not found" });
        }

        const notification = isDraftOnlyUpdate
          ? { sent: 0, skipped: 0, inApp: 0 }
          : await notifyParticipants({
            recipients: recipientResults.rows,
            activityType: "Event",
            activityTitle: results.rows[0].title,
            action: "Updated",
            reason,
          });

        return res.status(200).json({
          event: results.rows[0],
          message: "Event updated",
          notification,
        });
      });
    });
  });
};

module.exports.deleteEventById = (req, res) => {
  const reason = (req.body.reason || "").trim();
  const data = { event_id: req.params.event_id };

  model.selectById(data, (selectError, selectResults) => {
    if (selectError) {
      console.error("Error select event before delete:", selectError);
      return res.status(500).json(selectError);
    }

    if (selectResults.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const eventItem = selectResults.rows[0];
    const deleteReason = reason || "Draft deleted before publication.";
    if (eventItem.status !== "Draft" && !reason) {
      return res.status(400).json({ message: "Reason for deletion or cancellation is required" });
    }

    model.selectNotificationRecipients(data, (recipientError, recipientResults) => {
      if (recipientError) {
        console.error("Error select event recipients:", recipientError);
        return res.status(500).json(recipientError);
      }

      model.deleteById(data, async (error, results) => {
        if (error) {
          console.error("Error deleteEventById:", error);
          return res.status(500).json(error);
        }

        if (results.rowCount === 0) {
          return res.status(404).json({ message: "Event not found" });
        }

        const notification = await notifyParticipants({
          recipients: recipientResults.rows,
          activityType: "Event",
          activityTitle: recipientResults.rows[0]?.activity_title || eventItem.title || "Deleted event",
          action: "Cancelled",
          reason: deleteReason,
        });

        return res.status(200).json({
          message: "Event deleted",
          notification,
        });
      });
    });
  });
};

module.exports.registerForEvent = (req, res) => {
  const data = {
    user_id: res.locals.userId,
    event_id: req.params.event_id,
  };

  model.selectRegistrationAvailability(data, (availabilityError, availabilityResults) => {
    if (availabilityError) {
      console.error("Error selectRegistrationAvailability:", availabilityError);
      return res.status(500).json(availabilityError);
    }

    if (availabilityResults.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = availabilityResults.rows[0];

    if (event.status !== "Open") {
      return res.status(400).json({ message: "Event is not open for registration" });
    }

    if (event.registration_deadline && isBeforeToday(event.registration_deadline)) {
      return res.status(400).json({ message: "Registration deadline has closed for this event" });
    }

    if (["Registered", "Pending Approval"].includes(event.current_user_registration_status)) {
      return res.status(400).json({ message: `You are already ${event.current_user_registration_status.toLowerCase()} for this event` });
    }

    if (Number(event.active_signups) >= Number(event.capacity)) {
      return res.status(400).json({ message: "Event is full" });
    }

    data.registrationStatus = event.requires_approval ? "Pending Approval" : "Registered";

    model.registerUser(data, (error, results) => {
      if (error) {
        console.error("Error registerForEvent:", error);
        return res.status(500).json(error);
      }

      return res.status(201).json({
        ...results.rows[0],
        message: event.requires_approval
          ? "Registration request sent for captain approval"
          : "Registered for event",
      });
    });
  });
};

module.exports.readComments = (req, res) => {
  model.selectComments(
    {
      event_id: req.params.event_id,
      user_id: res.locals.userId,
    },
    (error, results) => {
      if (error) {
        console.error("Error read event comments:", error);
        return res.status(500).json(error);
      }

      return res.status(200).json(results.rows);
    }
  );
};

module.exports.createComment = (req, res) => {
  const commentText = cleanCommentText(req.body.commentText || "");
  if (!commentText) {
    return res.status(400).json({ message: "Comment cannot be empty" });
  }

  model.insertComment(
    {
      event_id: req.params.event_id,
      user_id: res.locals.userId,
      comment_text: commentText,
    },
    (error, results) => {
      if (error) {
        console.error("Error create event comment:", error);
        if (error.code === "22P05") {
          return res.status(400).json({ message: "This database cannot store emoji. Please remove emoji and try again." });
        }
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.status(201).json({
        message: "Comment added",
        comment: results.rows[0],
      });
    }
  );
};

module.exports.updateComment = (req, res) => {
  const commentText = cleanCommentText(req.body.commentText || "");
  if (!commentText) {
    return res.status(400).json({ message: "Comment cannot be empty" });
  }

  model.updateComment(
    {
      comment_id: req.params.comment_id,
      user_id: res.locals.userId,
      comment_text: commentText,
    },
    (error, results) => {
      if (error) {
        console.error("Error update event comment:", error);
        if (error.code === "22P05") {
          return res.status(400).json({ message: "This database cannot store emoji. Please remove emoji and try again." });
        }
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(403).json({ message: "Comments can only be edited by the author within 5 minutes" });
      }

      return res.status(200).json({
        message: "Comment updated",
        comment: results.rows[0],
      });
    }
  );
};

module.exports.deleteComment = (req, res) => {
  model.softDeleteComment(
    {
      comment_id: req.params.comment_id,
      deleted_by: res.locals.userId,
      can_moderate: ["Captain", "Vice-Captain"].includes(res.locals.role),
    },
    (error, results) => {
      if (error) {
        console.error("Error delete event comment:", error);
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(403).json({ message: "You can only delete your own comment within 5 minutes. Excos can delete any comment." });
      }

      return res.status(200).json({ message: "Comment deleted" });
    }
  );
};

module.exports.updateReaction = (req, res) => {
  const allowedReactions = ["like", "heart", "clap", "eyes"];
  const reactionType = req.body.reactionType;
  if (!allowedReactions.includes(reactionType)) {
    return res.status(400).json({ message: "Invalid reaction" });
  }

  model.upsertReaction(
    {
      event_id: req.params.event_id,
      user_id: res.locals.userId,
      reaction_type: reactionType,
    },
    (error, results) => {
      if (error) {
        console.error("Error update event reaction:", error);
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.status(200).json({ message: "Reaction updated", reaction: results.rows[0] });
    }
  );
};

module.exports.deleteReaction = (req, res) => {
  model.deleteReaction(
    {
      event_id: req.params.event_id,
      user_id: res.locals.userId,
    },
    (error) => {
      if (error) {
        console.error("Error delete event reaction:", error);
        return res.status(500).json(error);
      }

      return res.status(200).json({ message: "Reaction removed" });
    }
  );
};
