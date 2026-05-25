const model = require("../models/competitionModel");
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

const validateCompetitionDates = ({ startDate, endDate, registrationDeadline }) => {
  if (isBeforeToday(startDate)) {
    return "Competition start date cannot be in the past";
  }

  if (endDate && new Date(endDate) < new Date(startDate)) {
    return "Competition end date cannot be before the start date";
  }

  if (registrationDeadline && new Date(registrationDeadline) > new Date(startDate)) {
    return "Registration deadline cannot be after the start date";
  }

  return null;
};

module.exports.readOptions = (req, res) => {
  model.selectOptions((error, results) => {
    if (error) {
      console.error("Error readOptions:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(results.rows[0]);
  });
};

module.exports.readAll = async (req, res) => {
  await runAutoRejections();

  model.selectAll((error, results) => {
    if (error) {
      console.error("Error readAll competitions:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(results.rows);
  });
};

module.exports.readById = (req, res) => {
  model.selectById({ competition_id: req.params.competition_id, user_id: res.locals.userId }, (error, results) => {
    if (error) {
      console.error("Error readById competition:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Competition not found" });
    }

    return res.status(200).json(results.rows[0]);
  });
};

module.exports.createCompetition = (req, res) => {
  const requiredFields = ["title", "startDate"];
  for (const field of requiredFields) {
    if (req.body[field] === undefined || req.body[field] === "") {
      return res.status(400).json({ message: `${field} is undefined or empty` });
    }
  }

  const dateError = validateCompetitionDates({
    startDate: req.body.startDate,
    endDate: req.body.endDate || req.body.startDate,
    registrationDeadline: req.body.registrationDeadline,
  });
  if (dateError) {
    return res.status(400).json({ message: dateError });
  }

  const data = {
    title: req.body.title,
    description: req.body.description || "",
    organizer_id: res.locals.userId,
    venue_id: req.body.venueId || null,
    start_date: req.body.startDate,
    end_date: req.body.endDate || req.body.startDate,
    status: "Draft",
    tournament_format_id: req.body.tournamentFormatId || null,
    scoring_system_id: req.body.scoringSystemId || null,
    registration_opens_at: req.body.registrationOpensAt || null,
    registration_closes_at: req.body.registrationClosesAt || null,
    requires_approval: req.body.requiresApproval !== false,
    allow_waitlist: req.body.allowWaitlist !== false,
    round_count: Number(req.body.roundCount || 5),
    schedule_text: "",
    awards_text: "",
    eligibility_text: "",
    registration_method: "",
    registration_deadline: req.body.registrationDeadline || null,
    time_control: "25 minutes plus 10 seconds increment from Move 1.",
    late_policy: "Any player who is late by 15 minutes will automatically lose the game.",
    arbiter_policy: "For any dispute, the Chief Arbiter will make the final decision.",
    rules_text: "The official name list will be put up for final checking after the registration deadline. There will be no changing of the name list on the actual day of competition. The organizers reserve the rights to amend the rules as stated above.",
  };

  model.insertCompetition(data, (error, results) => {
    if (error) {
      console.error("Error createCompetition:", error);
      return res.status(500).json(error);
    }

    return res.status(201).json({
      message: "Competition created",
      competitionId: results.rows[0].competition_id,
    });
  });
};

module.exports.updateCompetitionById = (req, res) => {
  const reason = (req.body.reason || "").trim();
  if (!reason) {
    return res.status(400).json({ message: "Reason for change is required" });
  }

  const dateError = validateCompetitionDates({
    startDate: req.body.startDate,
    endDate: req.body.endDate || req.body.startDate,
    registrationDeadline: req.body.registrationDeadline,
  });
  if (dateError) {
    return res.status(400).json({ message: dateError });
  }

  const data = {
    competition_id: req.params.competition_id,
    title: req.body.title,
    description: req.body.description,
    venue_id: req.body.venueId || null,
    start_date: req.body.startDate,
    end_date: req.body.endDate,
    status: req.body.status,
    registration_deadline: req.body.registrationDeadline,
    requires_approval: req.body.requiresApproval === undefined ? undefined : Boolean(req.body.requiresApproval),
    allow_waitlist: req.body.allowWaitlist === undefined ? undefined : Boolean(req.body.allowWaitlist),
  };

  model.selectNotificationRecipients(data, (recipientError, recipientResults) => {
    if (recipientError) {
      console.error("Error select competition recipients:", recipientError);
      return res.status(500).json(recipientError);
    }

    model.updateCompetition(data, async (error, results) => {
      if (error) {
        console.error("Error updateCompetitionById:", error);
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(404).json({ message: "Competition not found" });
      }

      const notification = await notifyParticipants({
        recipients: recipientResults.rows,
        activityType: "Competition",
        activityTitle: results.rows[0].title,
        action: "Updated",
        reason,
      });

      return res.status(200).json({
        message: "Competition updated",
        competition: results.rows[0],
        notification,
      });
    });
  });
};

module.exports.deleteCompetitionById = (req, res) => {
  const reason = (req.body.reason || "").trim();
  const data = { competition_id: req.params.competition_id };

  model.selectById({ ...data, user_id: res.locals.userId }, (selectError, selectResults) => {
    if (selectError) {
      console.error("Error select competition before delete:", selectError);
      return res.status(500).json(selectError);
    }

    if (selectResults.rows.length === 0) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const competition = selectResults.rows[0];
    const deleteReason = reason || "Draft deleted before publication.";
    if (competition.status !== "Draft" && !reason) {
      return res.status(400).json({ message: "Reason for deletion or cancellation is required" });
    }

    model.selectNotificationRecipients(data, (recipientError, recipientResults) => {
      if (recipientError) {
        console.error("Error select competition recipients:", recipientError);
        return res.status(500).json(recipientError);
      }

      model.deleteCompetition(data, async (error, results) => {
        if (error) {
          console.error("Error deleteCompetitionById:", error);
          return res.status(500).json(error);
        }

        if (results.rowCount === 0) {
          return res.status(404).json({ message: "Competition not found" });
        }

        const notification = await notifyParticipants({
          recipients: recipientResults.rows,
          activityType: "Competition",
          activityTitle: recipientResults.rows[0]?.activity_title || competition.title || "Deleted competition",
          action: "Cancelled",
          reason: deleteReason,
        });

        return res.status(200).json({
          message: "Competition deleted",
          notification,
        });
      });
    });
  });
};

module.exports.createCategory = (req, res) => {
  const requiredFields = ["name", "capacity"];
  for (const field of requiredFields) {
    if (req.body[field] === undefined || req.body[field] === "") {
      return res.status(400).json({ message: `${field} is undefined or empty` });
    }
  }

  const data = {
    competition_id: req.params.competition_id,
    name: req.body.name,
    capacity: Number(req.body.capacity),
    registration_fee: Number(req.body.registrationFee || 0),
    min_age: req.body.minAge || null,
    max_age: req.body.maxAge || null,
    min_rank_value: req.body.minRankValue || null,
    max_rank_value: req.body.maxRankValue || null,
  };

  model.insertCategory(data, (error, results) => {
    if (error) {
      console.error("Error createCategory:", error);
      return res.status(500).json(error);
    }

    return res.status(201).json(results.rows[0]);
  });
};

module.exports.updateCategory = (req, res) => {
  const capacity = req.body.capacity === undefined ? undefined : Number(req.body.capacity);
  const registrationFee = req.body.registrationFee === undefined ? undefined : Number(req.body.registrationFee);

  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity <= 0)) {
    return res.status(400).json({ message: "Capacity must be a positive whole number" });
  }

  if (registrationFee !== undefined && registrationFee < 0) {
    return res.status(400).json({ message: "Registration fee cannot be negative" });
  }

  const data = {
    category_id: req.params.category_id,
    name: req.body.name || undefined,
    capacity,
    registration_fee: registrationFee,
  };

  model.updateCategory(data, (error, results) => {
    if (error) {
      console.error("Error updateCategory:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length > 0) {
      return res.status(200).json({
        message: "Category updated",
        category: results.rows[0],
      });
    }

    model.selectCategoryById(data, (selectError, selectResults) => {
      if (selectError) {
        console.error("Error selectCategoryById:", selectError);
        return res.status(500).json(selectError);
      }

      if (selectResults.rows.length === 0) {
        return res.status(404).json({ message: "Competition category not found" });
      }

      return res.status(400).json({
        message: `Capacity cannot be lower than ${selectResults.rows[0].active_signups} active signup(s)`,
      });
    });
  });
};

module.exports.registerForCategory = (req, res) => {
  const data = {
    user_id: res.locals.userId,
    category_id: req.params.category_id,
  };

  model.selectCategoryRegistrationInfo(data, (infoError, infoResults) => {
    if (infoError) {
      console.error("Error selectCategoryRegistrationInfo:", infoError);
      return res.status(500).json(infoError);
    }

    if (infoResults.rows.length === 0) {
      return res.status(404).json({ message: "Competition category not found" });
    }

    const category = infoResults.rows[0];
    if (category.competition_status !== "Open") {
      return res.status(400).json({ message: "Competition is not open for registration" });
    }

    if (category.registration_closes_at && new Date(category.registration_closes_at) < new Date()) {
      return res.status(400).json({ message: "Registration deadline has closed for this competition" });
    }

    if (category.registration_closed) {
      return res.status(400).json({ message: "Registration is closed because tournament pairings have started" });
    }

    if (category.existing_competition_registration_status) {
      return res.status(400).json({
        message: `You are already ${String(category.existing_competition_registration_status).toLowerCase()} for this competition`,
      });
    }

    if (Number(category.registered_count) >= Number(category.capacity) && !category.allow_waitlist) {
      return res.status(400).json({ message: "Category is full" });
    }

    if (Number(category.registered_count) >= Number(category.capacity)) {
      data.status = "Waitlisted";
    } else {
      data.status = category.requires_approval ? "Pending Approval" : "Registered";
    }

    model.registerUser(data, (error, results) => {
      if (error) {
        console.error("Error registerForCategory:", error);
        return res.status(500).json(error);
      }

      return res.status(201).json({
        ...results.rows[0],
        message: `Competition registration ${data.status.toLowerCase()}`,
      });
    });
  });
};

module.exports.readRegistrations = async (req, res) => {
  await runAutoRejections();

  model.selectRegistrations((error, results) => {
    if (error) {
      console.error("Error read competition registrations:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(results.rows);
  });
};

module.exports.updateRegistrationStatus = async (req, res) => {
  const allowedStatuses = ["Pending Approval", "Registered", "Waitlisted", "Rejected", "Withdrawn"];
  const status = req.body.status;

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid registration status" });
  }

  await runAutoRejections();

  model.updateRegistrationStatus(
    {
      registration_id: req.params.registration_id,
      status,
    },
    (error, results) => {
      if (error) {
        console.error("Error updateRegistrationStatus:", error);
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(404).json({ message: "Registration not found, or it was auto-rejected because registration is closed/full" });
      }

      runAutoRejections().then((autoRejected) => res.status(200).json({
        message: "Registration status updated",
        registration: results.rows[0],
        autoRejected,
      }));
    }
  );
};

module.exports.updateRegistrationAttendance = (req, res) => {
  model.updateRegistrationAttendance(
    {
      registration_id: req.params.registration_id,
      attended: Boolean(req.body.attended),
      role: res.locals.role,
    },
    (error, results) => {
      if (error) {
        console.error("Error update competition attendance:", error);
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(400).json({
          message: "Attendance can only be marked on the competition day. After the competition, ask the Captain to update it.",
        });
      }

      return res.status(200).json(results.rows[0]);
    }
  );
};

module.exports.deleteRegistration = (req, res) => {
  model.deleteRegistration({ registration_id: req.params.registration_id }, (error, results) => {
    if (error) {
      console.error("Error delete competition registration:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Registration not found" });
    }

    return res.status(200).json({ message: "Competition registration removed" });
  });
};

module.exports.readTournament = async (req, res) => {
  try {
    const tournament = await model.selectTournament({
      competition_id: req.params.competition_id,
    });
    return res.status(200).json(tournament);
  } catch (error) {
    console.error("Error readTournament:", error);
    return res.status(500).json(error);
  }
};

module.exports.generateRound = async (req, res) => {
  try {
    const result = await model.generateRound({
      competition_id: req.params.competition_id,
      category_id: req.params.category_id,
      generated_by: res.locals.userId,
    });

    return res.status(201).json({
      message: `Round ${result.round.round_number} pairings generated`,
      ...result,
    });
  } catch (error) {
    console.error("Error generateRound:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not generate round" });
  }
};

module.exports.updateMatchResult = async (req, res) => {
  const allowedResults = ["Scheduled", "Black Win", "White Win", "Bye", "Forfeit Black", "Forfeit White"];
  if (!allowedResults.includes(req.body.result)) {
    return res.status(400).json({ message: "Invalid match result" });
  }

  try {
    const match = await model.updateMatchResult({
      match_id: req.params.match_id,
      result: req.body.result,
    });

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    await model.recordRankingSnapshot({
      competition_id: match.competition_id,
      category_id: match.category_id,
    });

    return res.status(200).json({
      message: "Match result updated",
      match,
    });
  } catch (error) {
    console.error("Error updateMatchResult:", error);
    return res.status(500).json(error);
  }
};
