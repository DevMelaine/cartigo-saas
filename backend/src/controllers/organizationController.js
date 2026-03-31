const organizationService = require("../services/organizationService");

async function getMyOrganization(req, res) {
  try {
    const organization = await organizationService.getOrganizationProfile(
      req.user.organizationId
    );

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to load organization.",
      errors: error.details,
    });
  }
}

async function updateMyOrganization(req, res) {
  try {
    const organization = await organizationService.updateOrganization(
      req.user.organizationId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully.",
      data: organization,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to update organization.",
      errors: error.details,
    });
  }
}

module.exports = {
  getMyOrganization,
  updateMyOrganization,
};
