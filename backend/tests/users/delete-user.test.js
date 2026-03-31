const request = require("supertest");
const app = require("../../src/app");
const { getAuthToken } = require("../helpers/authHelper");

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

describe("DELETE /api/users/:id", () => {
  it("ADMIN can soft delete a user", async () => {
    const admin = await getAuthToken(app);
    const user = await createStaff(admin);

    const res = await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${admin}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  it("soft deleted user is not returned in list", async () => {
    const admin = await getAuthToken(app);
    const user = await createStaff(admin);

    await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${admin}`)
      .expect(200);

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${admin}`)
      .expect(200);

    expect(res.body.data.every((u) => u.id !== user.id)).toBe(true);
  });

  it("cannot delete non-existent user", async () => {
    const admin = await getAuthToken(app);
    const res = await request(app)
      .delete("/api/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${admin}`)
      .expect(404);
    expect(res.body.success).toBe(false);
  });

  it("cannot delete other org user", async () => {
    const t1 = await getAuthToken(app);
    const t2 = await getAuthToken(app);
    const user = await createStaff(t1);

    await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${t2}`)
      .expect(404);
  });
});