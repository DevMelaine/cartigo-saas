const request = require("supertest");
const app = require("../../src/app");

// register and login to obtain tokens
async function getTokens() {
  const email = `r${Date.now()}@test.com`;
  const password = "password123";
  await request(app)
    .post("/api/customers/register")
    .send({ name: "Reg", email, password });
  const res = await request(app).post("/api/customers/login").send({ email, password });
  return res.body.data;
}

describe("POST /api/customers/refresh-token", () => {
  it("should issue new access token with valid refresh token", async () => {
    const tokens = await getTokens();
    const res = await request(app)
      .post("/api/customers/refresh-token")
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(tokens.refreshToken);
  });

  it("should reject invalid token", async () => {
    const res = await request(app)
      .post("/api/customers/refresh-token")
      .send({ refreshToken: "abc" })
      .expect(401);
    expect(res.body.success).toBe(false);
  });
});