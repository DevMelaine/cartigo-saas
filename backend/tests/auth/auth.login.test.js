const request = require("supertest");
const app = require("../../src/app");
const {
  ensureOrganizationCategory,
} = require("../helpers/organizationCategoryHelper");

// helper that registers a user using the public endpoint
async function registerAdmin(email = "login@test.com") {
  const category = await ensureOrganizationCategory();

  await request(app).post("/api/auth/register-organization").send({
    name: "Login Org",
    categoryId: category.id,
    adminName: "Login Admin",
    email,
    password: "password123",
  });
}

describe("POST /api/auth/login", () => {
  it("should login successfully with correct credentials", async () => {
    await registerAdmin();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "password123" })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toHaveProperty("email", "login@test.com");
  });

  it("should fail with wrong password", async () => {
    await registerAdmin();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "badpass" })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid credentials/);
  });

  it("should fail with unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown@test.com", password: "password123" })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it("should return accessToken and refreshToken on success", async () => {
    await registerAdmin("tokens@test.com");

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "tokens@test.com", password: "password123" })
      .expect(200);

    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
  });
});
