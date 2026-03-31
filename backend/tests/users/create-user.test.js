const request = require("supertest");

const app = require("../../src/app");

const { getAuthToken, getTokenForRole } = require("../helpers/authHelper");

/**
 * Admin can create staff users, other roles cannot.
 */
describe("POST /api/users", () => {

  it("should allow ADMIN to create a MANAGER user", async () => {

    const adminToken = await getAuthToken(app);

    const email = `manager${Date.now()}@test.com`;

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email,
        password: "password123",
        name: "Manager One",
        role: "MANAGER",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.role).toBe("MANAGER");
    expect(res.body.data.isActive).toBe(true);
  });

  it("should forbid MANAGER from creating a user", async () => {

    const token = await getTokenForRole(app, "MANAGER");

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: `staff${Date.now()}@test.com`,
        password: "password123",
        name: "Staff",
        role: "STAFF",
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it("should validate required fields", async () => {

    const token = await getAuthToken(app);

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "bad" })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("should enforce unique email", async () => {

    const token = await getAuthToken(app);

    const payload = {
      email: `unique${Date.now()}@test.com`,
      password: "password123",
      name: "First",
      role: "STAFF",
    };

    await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it("should not allow creation in other organization", async () => {

    const adminToken1 = await getAuthToken(app);
    const adminToken2 = await getAuthToken(app);

    // create user under org1
    const res1 = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken1}`)
      .send({
        email: "org1@test.com",
        password: "password123",
        name: "User1",
        role: "STAFF",
      })
      .expect(201);

    // using org2 token attempt to update that user should fail
    await request(app)
      .put(`/api/users/${res1.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken2}`)
      .send({ name: "Hacker" })
      .expect(404);
  });

});