const authService = require("../services/authService");
const tokenService = require("../services/tokenService");
const {
  registerOrganizationSchema,
  loginSchema,
  refreshTokenSchema,
  buildValidationError,
} = require("../validators/auth.validator");

async function registerOrganization(req, res) {
  try {
    const { error, value } = registerOrganizationSchema.validate(req.body, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const normalizedPayload = {
      ...value,
      organizationName: value.organizationName || value.name,
    };

    const { organization, user } = await authService.registerOrganization(
      normalizedPayload
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
          category: organization.organizationCategory
            ? {
                id: organization.organizationCategory.id,
                name: organization.organizationCategory.name,
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
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const context = {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    };

    const user = await authService.login(value, context);

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
              category: user.organization.organizationCategory
                ? {
                    id: user.organization.organizationCategory.id,
                    name: user.organization.organizationCategory.name,
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
    const { error, value } = refreshTokenSchema.validate(req.body || {}, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const result = await tokenService.rotateRefreshToken(value.refreshToken);

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
