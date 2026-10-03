const activityLogService = require("../services/activityLog.service");

async function listActivityLogs(req, res) {
  try {
    const result = await activityLogService.listActivityLogs(req.user, req.query);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch activity logs.",
    });
  }
}

module.exports = {
  listActivityLogs,
};
