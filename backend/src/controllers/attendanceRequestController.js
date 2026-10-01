const model = require("../models/attendanceRequestModel");
const notificationModel = require("../models/notificationModel");

const correctionInput = (req, res) => {
  if (typeof req.body?.attended !== "boolean" ||
      typeof req.body?.reason !== "string" || !req.body.reason.trim()) {
    res.status(400).json({ code: "INVALID_CORRECTION", message: "Attendance must be a boolean and a non-empty reason is required." });
    return null;
  }
  return { requested_attended: req.body.attended, reason: req.body.reason.trim(), requested_by: res.locals.userId };
};

const handleError = (res, error) => {
  if (error.code === "23505") {
    return res.status(409).json({ code: "PENDING_REQUEST_EXISTS", message: "A pending correction already exists. Refresh and use Replace on that request." });
  }
  console.error("Attendance request operation failed:", error.code || error.name);
  return res.status(500).json({ code: "ATTENDANCE_REQUEST_FAILED", message: "The attendance request could not be processed." });
};

const unavailable = (res) => res.status(409).json({
  code: "REQUEST_NOT_PENDING",
  message: "This request has already been reviewed, replaced, or is no longer available. Refresh to review the latest request. To make a further correction after a decision, explicitly create a new request.",
});

const notifyCaptains = async ({ title, message }) => {
  try {
    const result = await new Promise((resolve, reject) => {
      notificationModel.selectCaptainUserIds((error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    await notificationModel.insertMany({
      userIds: result.rows.map((row) => row.id),
      title,
      message,
      type: "Attendance",
    });
  } catch (error) {
    console.error("Attendance request notification failed:", error.message);
  }
};

module.exports.readPending = (req, res) => {
  model.selectPending((error, results) => {
    if (error) {
      return handleError(res, error);
    }

    return res.status(200).json(results.rows);
  });
};

module.exports.createEventRequest = (req, res) => {
  const input = correctionInput(req, res);
  if (!input) return;
  const data = {
    registration_id: req.params.registration_id,
    ...input,
  };

  model.insertEventRequest(data, async (error, results) => {
    if (error) {
      return handleError(res, error);
    }

    if (results.rows.length === 0) {
      return res.status(400).json({ message: "Attendance request can only be made for approved past event registrations" });
    }

    await notifyCaptains({
      title: "Attendance change requested",
      message: `A past event attendance change is waiting for Captain approval.`,
    });

    return res.status(201).json({
      message: "Attendance change request sent to Captain",
      request: results.rows[0],
    });
  });
};

module.exports.createCompetitionRequest = (req, res) => {
  const input = correctionInput(req, res);
  if (!input) return;
  const data = {
    registration_id: req.params.registration_id,
    ...input,
  };

  model.insertCompetitionRequest(data, async (error, results) => {
    if (error) {
      return handleError(res, error);
    }

    if (results.rows.length === 0) {
      return res.status(400).json({ message: "Attendance request can only be made for approved past competition registrations" });
    }

    await notifyCaptains({
      title: "Attendance change requested",
      message: `A past competition attendance change is waiting for Captain approval.`,
    });

    return res.status(201).json({
      message: "Attendance change request sent to Captain",
      request: results.rows[0],
    });
  });
};

module.exports.replace = async (req, res) => {
  const input = correctionInput(req, res);
  if (!input) return;
  try {
    const request = await model.replace({ ...input, request_id: req.params.request_id });
    if (!request) return unavailable(res);
    await notifyCaptains({ title: "Attendance request replaced", message: "A revised attendance correction is waiting for Captain approval." });
    return res.status(201).json({ message: "Replacement request sent to Captain", request });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports.approve = async (req, res) => {
  try {
    const request = await model.approve({
      request_id: req.params.request_id,
      reviewed_by: res.locals.userId,
    });

    if (!request) {
      return unavailable(res);
    }

    return res.status(200).json({ message: "Attendance request approved", request });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports.reject = (req, res) => {
  model.reject(
    {
      request_id: req.params.request_id,
      reviewed_by: res.locals.userId,
    },
    (error, results) => {
      if (error) {
        return handleError(res, error);
      }

      if (results.rows.length === 0) {
        return unavailable(res);
      }

      return res.status(200).json({ message: "Attendance request rejected", request: results.rows[0] });
    }
  );
};
