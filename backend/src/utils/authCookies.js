const REFRESH_TOKEN_COOKIE_NAME = "cartigo_refresh_token";
const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_COOKIE_NAME = "cartigo_oauth_state";
const OAUTH_STATE_LIFETIME_MS = 10 * 60 * 1000;

function getRefreshTokenCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: REFRESH_TOKEN_LIFETIME_MS,
    path: "/api/auth",
  };
}

function getOAuthStateCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: OAUTH_STATE_LIFETIME_MS,
    path: "/api/auth",
  };
}

function parseCookies(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      if (!key) {
        return accumulator;
      }

      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

function getRefreshTokenFromRequest(req) {
  const cookies = parseCookies(req.headers?.cookie);

  if (cookies[REFRESH_TOKEN_COOKIE_NAME]) {
    return cookies[REFRESH_TOKEN_COOKIE_NAME];
  }

  if (typeof req.body?.refreshToken === "string" && req.body.refreshToken.trim()) {
    return req.body.refreshToken.trim();
  }

  return null;
}

function getOAuthStateFromRequest(req) {
  const cookies = parseCookies(req.headers?.cookie);
  return cookies[OAUTH_STATE_COOKIE_NAME] || null;
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshTokenCookieOptions()
  );
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(
    REFRESH_TOKEN_COOKIE_NAME,
    getRefreshTokenCookieOptions()
  );
}

function setOAuthStateCookie(res, state) {
  res.cookie(
    OAUTH_STATE_COOKIE_NAME,
    state,
    getOAuthStateCookieOptions()
  );
}

function clearOAuthStateCookie(res) {
  res.clearCookie(
    OAUTH_STATE_COOKIE_NAME,
    getOAuthStateCookieOptions()
  );
}

module.exports = {
  REFRESH_TOKEN_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  getRefreshTokenCookieOptions,
  getOAuthStateCookieOptions,
  getRefreshTokenFromRequest,
  getOAuthStateFromRequest,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  setOAuthStateCookie,
  clearOAuthStateCookie,
};
