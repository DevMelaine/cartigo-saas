const request = require("supertest");
const { v4: uuidv4 } = require("uuid");
const {
  ensureOrganizationCategory,
} = require("./organizationCategoryHelper");

// generate a unique email for test users to avoid collisions when
// several accounts are created within the same millisecond.
function makeTestEmail() {
  return `test+${Date.now()}-${uuidv4()}@example.com`;
}

async function getAuthToken(app) {
  const email = makeTestEmail();
  const password = "password123";
  const category = await ensureOrganizationCategory();

  // create organization and admin user
  await request(app)
    .post("/api/auth/register-organization")
    .send({
      name: `Org ${Date.now()}`,
      categoryId: category.id,
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
 * registering a new organization; other roles are created as real users
 * in that same organization and then authenticated normally.
 *
 * @param {Express.Application} app
 * @param {string} role one of ADMIN, MANAGER, CASHIER, STAFF
 */
async function getTokenForRole(app, role = "ADMIN") {
  if (role === "ADMIN") {
    return getAuthToken(app);
  }

  const adminToken = await getAuthToken(app);
  const email = makeTestEmail();
  const password = "password123";

  await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      email,
      password,
      name: `${role} Test User`,
      role,
    })
    .expect(201);

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);

  if (!loginResponse.body?.data?.accessToken) {
    throw new Error("Role login failed in test helper: " + JSON.stringify(loginResponse.body));
  }

  return loginResponse.body.data.accessToken;
}

module.exports = { getAuthToken, getTokenForRole };
