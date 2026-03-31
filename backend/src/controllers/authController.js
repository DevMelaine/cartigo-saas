const crypto = require("crypto");
const authService = require("../services/authService");
const tokenService = require("../services/tokenService");
const { buildGoogleAuthorizationUrl } = require("../utils/googleOAuth");
const {
  clearOAuthStateCookie,
  clearRefreshTokenCookie,
  getOAuthStateFromRequest,
  getRefreshTokenFromRequest,
  setOAuthStateCookie,
  setRefreshTokenCookie,
} = require("../utils/authCookies");

function getDashboardBaseUrl() {
  return (process.env.DASHBOARD_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function getGoogleSuccessRedirectUrl() {
  const redirectUrl = new URL("/login", `${getDashboardBaseUrl()}/`);
  redirectUrl.searchParams.set("oauth", "google");
  return redirectUrl.toString();
}

function getGoogleErrorRedirectUrl(message) {
  const redirectUrl = new URL("/login", `${getDashboardBaseUrl()}/`);
  redirectUrl.searchParams.set("oauthError", message);
  return redirectUrl.toString();
}

function serializeAuthPayload({ user, organization, accessToken, refreshToken }) {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
    },
    organization: organization
      ? {
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
        }
      : null,
    accessToken,
    refreshToken,
  };
}

async function registerOrganization(req, res) {
  try {
    const { organization, user } = await authService.registerOrganization(req.body);
    const { accessToken, refreshToken } =
      await tokenService.createTokenPairForUser(user);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      data: serializeAuthPayload({
        user,
        organization,
        accessToken,
        refreshToken,
      }),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "An error occurred while registering organization.",
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

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      data: serializeAuthPayload({
        user,
        organization: user.organization,
        accessToken,
        refreshToken,
      }),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "An error occurred while logging in.",
      errors: err.details || undefined,
    });
  }
}

function googleAuth(req, res) {
  try {
    const state = crypto.randomBytes(24).toString("hex");
    setOAuthStateCookie(res, state);
    return res.redirect(buildGoogleAuthorizationUrl(state));
  } catch (err) {
    return res.redirect(
      getGoogleErrorRedirectUrl(
        err.message || "Google authentication is unavailable."
      )
    );
  }
}

async function googleCallback(req, res) {
  const expectedState = getOAuthStateFromRequest(req);
  clearOAuthStateCookie(res);

  try {
    const context = {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    };

    const user = await authService.loginWithGoogle(
      {
        ...req.query,
        expectedState,
      },
      context
    );

    const { accessToken, refreshToken } =
      await tokenService.createTokenPairForUser(user);

    setRefreshTokenCookie(res, refreshToken);

    return res.redirect(getGoogleSuccessRedirectUrl());
  } catch (err) {
    clearRefreshTokenCookie(res);
    return res.redirect(
      getGoogleErrorRedirectUrl(
        err.message || "Google authentication failed."
      )
    );
  }
}

async function forgotPassword(req, res) {
  try {
    await authService.requestPasswordReset(req.body);

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Unable to process forgot password request.",
      errors: err.details || undefined,
    });
  }
}

async function resetPassword(req, res) {
  try {
    await authService.resetPassword(req.body);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Unable to reset password.",
      errors: err.details || undefined,
    });
  }
}

async function refreshToken(req, res) {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const result = await tokenService.rotateRefreshToken(refreshToken);

    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      success: false,
      message: err.message || "Invalid refresh token.",
    });
  }
}

async function logout(req, res) {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
    }

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (err) {
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  }
}

async function me(req, res) {
  try {
    const user = await authService.getCurrentUserProfile(req.user.userId);

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
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Unable to fetch authenticated user.",
    });
  }
}

module.exports = {
  registerOrganization,
  login,
  googleAuth,
  googleCallback,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  me,
};
