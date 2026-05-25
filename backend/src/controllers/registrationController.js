const model = require("../models/registrationModel");
const autoRejectService = require("../services/autoRejectService");

const runAutoRejections = async () => {
  try {
    return await autoRejectService.rejectClosedOrFullPendingRequests();
  } catch (error) {
    console.error("Error auto rejecting pending requests:", error);
    return null;
  }
};

module.exports.readAll = async (req, res) => {
  await runAutoRejections();

  model.selectAll((error, results) => {
    if (error) {
      console.error("Error readAll registrations:", error);
      return res.status(500).json(error);
    }

    return res.status(200).json(results.rows);
  });
};

module.exports.updateAttendance = (req, res) => {
  const data = {
    registration_id: req.params.registration_id,
    attended: Boolean(req.body.attended),
    role: res.locals.role,
  };

  model.updateAttendance(data, (error, results) => {
    if (error) {
      console.error("Error updateAttendance:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(400).json({
        message: "Attendance can only be marked on the event day. After the event, ask the Captain to update it.",
      });
    }

    return res.status(200).json(results.rows[0]);
  });
};

module.exports.approveRegistration = async (req, res) => {
  await runAutoRejections();

  model.approveRegistration({ registration_id: req.params.registration_id }, (error, results) => {
    if (error) {
      console.error("Error approveRegistration:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Pending request not found, or it was auto-rejected because registration is closed/full" });
    }

    runAutoRejections().then((autoRejected) => res.status(200).json({
      ...results.rows[0],
      autoRejected,
    }));
  });
};

module.exports.rejectRegistration = async (req, res) => {
  await runAutoRejections();

  model.rejectRegistration({ registration_id: req.params.registration_id }, (error, results) => {
    if (error) {
      console.error("Error rejectRegistration:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    return res.status(200).json(results.rows[0]);
  });
};

module.exports.deleteRegistration = (req, res) => {
  model.deleteRegistration({ registration_id: req.params.registration_id }, (error, results) => {
    if (error) {
      console.error("Error deleteRegistration:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Registration not found" });
    }

    return res.status(200).json({ message: "Event registration removed" });
  });
};
