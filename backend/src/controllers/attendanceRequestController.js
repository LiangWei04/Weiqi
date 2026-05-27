const model = require("../models/attendanceRequestModel");
const notificationModel = require("../models/notificationModel");

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
      console.error("Error read attendance requests:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(results.rows);
  });
};

module.exports.createEventRequest = (req, res) => {
  const data = {
    registration_id: req.params.registration_id,
    requested_attended: Boolean(req.body.attended),
    reason: (req.body.reason || "").trim(),
    requested_by: res.locals.userId,
  };

  if (!data.reason) {
    return res.status(400).json({ message: "Reason is required when requesting a past attendance change" });
  }

  model.insertEventRequest(data, async (error, results) => {
    if (error) {
      console.error("Error create event attendance request:", error);
      return res.status(500).json(error);
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
  const data = {
    registration_id: req.params.registration_id,
    requested_attended: Boolean(req.body.attended),
    reason: (req.body.reason || "").trim(),
    requested_by: res.locals.userId,
  };

  if (!data.reason) {
    return res.status(400).json({ message: "Reason is required when requesting a past attendance change" });
  }

  model.insertCompetitionRequest(data, async (error, results) => {
    if (error) {
      console.error("Error create competition attendance request:", error);
      return res.status(500).json(error);
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

module.exports.approve = async (req, res) => {
  try {
    const request = await model.approve({
      request_id: req.params.request_id,
      reviewed_by: res.locals.userId,
    });

    if (!request) {
      return res.status(404).json({ message: "Pending attendance request not found" });
    }

    return res.status(200).json({ message: "Attendance request approved", request });
  } catch (error) {
    console.error("Error approve attendance request:", error);
    return res.status(500).json(error);
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
        console.error("Error reject attendance request:", error);
        return res.status(500).json(error);
      }

      if (results.rows.length === 0) {
        return res.status(404).json({ message: "Pending attendance request not found" });
      }

      return res.status(200).json({ message: "Attendance request rejected", request: results.rows[0] });
    }
  );
};
