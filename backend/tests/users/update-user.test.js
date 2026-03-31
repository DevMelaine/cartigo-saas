const request = require("supertest");
const app = require("../../src/app");
const { getAuthToken, getTokenForRole } = require("../helpers/authHelper");

async function createStaff(token) {
  const res = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${token}`)
    .send({
      email: `staff${Date.now()}@test.com`,
      password: "password123",
      name: "Staffer",
      role: "STAFF",
    });
  return res.body.data;
}

describe("PUT /api/users/:id", () => {
  it("ADMIN can change role and name", async () => {
    const admin = await getAuthToken(app);
    const user = await createStaff(admin);

    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ name: "New Name", role: "MANAGER" })
      .expect(200);

    expect(res.body.data.name).toBe("New Name");
    expect(res.body.data.role).toBe("MANAGER");
  });

  it("should not allow MANAGER to update", async () => {
    const admin = await getAuthToken(app);
    const user = await createStaff(admin);
    const manager = await getTokenForRole(app, "MANAGER");

    await request(app)
      .put(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${manager}`)
      .send({ name: "Hacker" })
      .expect(403);
  });

  it("returns 404 when updating other org user", async () => {
    const a1 = await getAuthToken(app);
    const a2 = await getAuthToken(app);
    const user = await createStaff(a1);

    await request(app)
      .put(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${a2}`)
      .send({ name: "Should Not" })
      .expect(404);
  });

  it("validates input", async () => {
    const admin = await getAuthToken(app);
    const user = await createStaff(admin);
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ role: "INVALID" })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});