const request = require("supertest");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// generate a unique email for test users to avoid collisions when
// several accounts are created within the same millisecond.
function makeTestEmail() {
  return `test+${Date.now()}-${uuidv4()}@example.com`;
}

async function getAuthToken(app) {
  const email = makeTestEmail();
  const password = "password123";

  // create organization and admin user
  await request(app)
    .post("/api/auth/register-organization")
    .send({
      name: `Org ${Date.now()}`,
      adminName: "Admin",
      email,
      password,
    });

  // login as admin to receive a valid token
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  if (!res.body || !res.body.data || !res.body.data.accessToken) {
    throw new Error("Login failed in test helper: " + JSON.stringify(res.body));
  }

  return res.body.data.accessToken;
}

/**
 * Obtain a JWT for a given role. ADMIN returns a fresh token by
 * registering a new organization; other roles reuse the organization
 * created by an ADMIN token and forge a token payload directly.
 *
 * @param {Express.Application} app
 * @param {string} role one of ADMIN, MANAGER, EMPLOYEE
 */
async function getTokenForRole(app, role = "ADMIN") {
  if (role === "ADMIN") {
    return getAuthToken(app);
  }

  // create base organization by getting an admin token
  const adminToken = await getAuthToken(app);
  const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
  const organizationId = decoded.organizationId;

  const fakeUserId = uuidv4();

  // sign a token for the requested role; we don't need a real user record
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

  const token = jwt.sign(
    { userId: fakeUserId, organizationId, role }, 
    secret,
    { expiresIn }
  );

  return token;
}

module.exports = { getAuthToken, getTokenForRole };