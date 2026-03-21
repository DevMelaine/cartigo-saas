const authService = require("../services/authService");
const tokenService = require("../services/tokenService");

async function registerOrganization(req, res) {
  try {
    const { organization, user } = await authService.registerOrganization(
      req.body
    );

    const { accessToken, refreshToken } =
      await tokenService.createTokenPairForUser(user);

    return res.status(201).json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          categoryId: organization.categoryId,
          category: organization.category
            ? {
                id: organization.category.id,
                name: organization.category.name,
              }
            : null,
          createdAt: organization.createdAt,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message:
        err.message || "An error occurred while registering organization.",
      errors: err.details || undefined,
    });
  }
}

async function login(req, res) {
  try {
    const context = {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    };

    const user = await authService.login(req.body, context);

    const { accessToken, refreshToken } =
      await tokenService.createTokenPairForUser(user);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          createdAt: user.createdAt,
        },
        organization: user.organization
          ? {
              id: user.organization.id,
              name: user.organization.name,
              categoryId: user.organization.categoryId,
              category: user.organization.category
                ? {
                    id: user.organization.category.id,
                    name: user.organization.category.name,
                  }
                : null,
              createdAt: user.organization.createdAt,
            }
          : null,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message: err.message || "An error occurred while logging in.",
      errors: err.details || undefined,
    });
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const result = await tokenService.rotateRefreshToken(refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    const statusCode = err.statusCode || 401;

    return res.status(statusCode).json({
      success: false,
      message: "Invalid refresh token.",
    });
  }
}

module.exports = {
  registerOrganization,
  login,
  refreshToken,
};
