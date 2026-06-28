const request = require("supertest");
const app = require("../../src/app");

describe("POST /api/customers/register", () => {
  it("should register a new customer", async () => {
    const res = await request(app)
      .post("/api/customers/register")
      .send({
        name: "Alice",
        email: `alice${Date.now()}@test.com`,
        password: "password123",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("customer");
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
  });

  it("should not allow duplicate email", async () => {
    const payload = {
      name: "Bob",
      email: `bob${Date.now()}@test.com`,
      password: "password123",
    };

    await request(app).post("/api/customers/register").send(payload).expect(201);

    const res = await request(app).post("/api/customers/register").send(payload).expect(409);
    expect(res.body.success).toBe(false);
  });

  it("should validate input", async () => {
    const res = await request(app)
      .post("/api/customers/register")
      .send({ email: "notanemail" })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});