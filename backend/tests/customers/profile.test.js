const request = require("supertest");
const app = require("../../src/app");

async function registerAndLogin() {
  const email = `p${Date.now()}@test.com`;
  const password = "password123";
  await request(app)
    .post("/api/customers/register")
    .send({ name: "Prof", email, password });
  const res = await request(app).post("/api/customers/login").send({ email, password });
  return res.body.data.accessToken;
}

describe("GET /api/customers/profile", () => {
  it("should return profile for authenticated customer", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/customers/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("email");
  });

  it("should reject without token", async () => {
    await request(app).get("/api/customers/profile").expect(401);
  });
});