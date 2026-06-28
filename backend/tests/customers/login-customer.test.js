const request = require("supertest");
const app = require("../../src/app");

// helper to register and return credentials
async function createCustomer() {
  const email = `c${Date.now()}@test.com`;
  const password = "password123";
  await request(app)
    .post("/api/customers/register")
    .send({ name: "Test", email, password });
  return { email, password };
}

describe("POST /api/customers/login", () => {
  it("should login successfully", async () => {
    const creds = await createCustomer();
    const res = await request(app)
      .post("/api/customers/login")
      .send(creds)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it("should fail with wrong password", async () => {
    const creds = await createCustomer();
    const res = await request(app)
      .post("/api/customers/login")
      .send({ email: creds.email, password: "wrong" })
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  it("should fail with unknown email", async () => {
    const res = await request(app)
      .post("/api/customers/login")
      .send({ email: "noone@test.com", password: "password" })
      .expect(401);
    expect(res.body.success).toBe(false);
  });
});