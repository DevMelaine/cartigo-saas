const request = require("supertest");
const app = require("../../src/app");
const { getAuthToken, getTokenForRole } = require("../helpers/authHelper");

// helper to create many users under an org
async function createStaff(token, count = 5) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: `u${Date.now()}${i}@test.com`,
        password: "password123",
        name: `User ${i}`,
        role: "STAFF",
      });
    arr.push(res.body.data);
  }
  return arr;
}

describe("GET /api/users", () => {
  it("should require authentication", async () => {
    await request(app).get("/api/users").expect(401);
  });

  it("should paginate results", async () => {
    const token = await getAuthToken(app);
    await createStaff(token, 25);

    const page1 = await request(app)
      .get("/api/users?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(page1.body.pagination.total).toBe(26);
    expect(page1.body.data.length).toBe(10);

    const page2 = await request(app)
      .get("/api/users?page=2&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(page2.body.data.length).toBe(10);
    expect(page2.body.data[0].id).not.toBe(page1.body.data[0].id);
  });

  it("should enforce multi-tenant isolation", async () => {
    const t1 = await getAuthToken(app);
    const t2 = await getAuthToken(app);

    await createStaff(t1, 3);
    await createStaff(t2, 2);

    const r1 = await request(app).get("/api/users").set("Authorization", `Bearer ${t1}`).expect(200);
    const r2 = await request(app).get("/api/users").set("Authorization", `Bearer ${t2}`).expect(200);

    expect(r1.body.pagination.total).toBe(4);
    expect(r2.body.pagination.total).toBe(3);
  });

  it("should allow MANAGER to list", async () => {
    const admin = await getAuthToken(app);
    await createStaff(admin, 1);
    const manager = await getTokenForRole(app, "MANAGER");
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${manager}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  describe("GET /api/users/:id", () => {
    it("should return a single user", async () => {
      const admin = await getAuthToken(app);
      const [u] = await createStaff(admin, 1);
      const res = await request(app)
        .get(`/api/users/${u.id}`)
        .set("Authorization", `Bearer ${admin}`)
        .expect(200);
      expect(res.body.data.id).toBe(u.id);
    });

    it("should 404 for other organisation user", async () => {
      const a1 = await getAuthToken(app);
      const a2 = await getAuthToken(app);
      const [u] = await createStaff(a1, 1);
      await request(app)
        .get(`/api/users/${u.id}`)
        .set("Authorization", `Bearer ${a2}`)
        .expect(404);
    });
  });
});