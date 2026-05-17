const model = require("../models/dashboardModel");

module.exports.readStats = (req, res) => {
  model.selectStats((error, results) => {
    if (error) {
      console.error("Error readStats:", error);
      return res.status(500).json(error);
    }

    const stats = results.rows[0];
    const attendanceRate = stats.total_registrations === 0
      ? 0
      : Math.round((stats.total_attended / stats.total_registrations) * 100);
    const verificationRate = stats.total_users === 0
      ? 0
      : Math.round((stats.verified_users / stats.total_users) * 100);
    const approvalRate = stats.total_registrations === 0
      ? 0
      : Math.round((stats.approved_registrations / stats.total_registrations) * 100);
    const competitionApprovalRate = stats.total_competition_registrations === 0
      ? 0
      : Math.round((stats.approved_competition_registrations / stats.total_competition_registrations) * 100);
    const competitionAttendanceRate = stats.approved_competition_registrations === 0
      ? 0
      : Math.round((stats.attended_competition_registrations / stats.approved_competition_registrations) * 100);

    return res.status(200).json({
      ...stats,
      attendance_rate: attendanceRate,
      verification_rate: verificationRate,
      approval_rate: approvalRate,
      competition_approval_rate: competitionApprovalRate,
      competition_attendance_rate: competitionAttendanceRate,
    });
  });
};
