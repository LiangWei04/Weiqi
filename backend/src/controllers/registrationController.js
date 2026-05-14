const model = require("../models/registrationModel");

module.exports.readAll = (req, res) => {
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
  };

  model.updateAttendance(data, (error, results) => {
    if (error) {
      console.error("Error updateAttendance:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Registration not found or not approved yet" });
    }

    return res.status(200).json(results.rows[0]);
  });
};

module.exports.approveRegistration = (req, res) => {
  model.approveRegistration({ registration_id: req.params.registration_id }, (error, results) => {
    if (error) {
      console.error("Error approveRegistration:", error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    return res.status(200).json(results.rows[0]);
  });
};

module.exports.rejectRegistration = (req, res) => {
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
