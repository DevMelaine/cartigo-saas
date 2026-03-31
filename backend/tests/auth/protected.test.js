const request = require("supertest");
const app = require("../../src/app");

// helper to register, login and return access token
async function createAndLogin() {
  const email = `prot${Date.now()}@test.com`;
  await request(app).post("/api/auth/register-organization").send({
    name: "Prot Org",
    adminName: "Prot Admin",
    email,
    password: "password123",
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password123" });
  return res.body.data.accessToken;
}

describe("GET /api/test/protected", () => {
  it("should allow access with valid JWT", async () => {
    const token = await createAndLogin();
    const res = await request(app)
      .get("/api/test/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe("Access granted");
    expect(res.body.user).toBeDefined();
  });

  it("should deny access without token", async () => {
    const res = await request(app).get("/api/test/protected").expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/missing or malformed/);
  });

  it("should deny access with invalid token", async () => {
    const res = await request(app)
      .get("/api/test/protected")
      .set("Authorization", "Bearer invalid.token.here")
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid or expired token/);
  });
});
