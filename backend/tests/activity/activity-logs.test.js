const jwt = require("jsonwebtoken");
const request = require("supertest");

const app = require("../../src/app");
const prisma = require("../../src/lib/prisma");
const { getAuthToken } = require("../helpers/authHelper");

function decodeToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);
}

async function createStaff(token, suffix) {
  const response = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${token}`)
    .send({
      email: `staff-${suffix}@test.com`,
      password: "password123",
      name: `Staff ${suffix}`,
      role: "STAFF",
    })
    .expect(201);

  return response.body.data;
}

describe("GET /api/activity-logs", () => {
  it("creates and returns user activity logs for the authenticated organization", async () => {
    const adminToken = await getAuthToken(app);
    const admin = decodeToken(adminToken);
    const user = await createStaff(adminToken, Date.now());

    await request(app)
      .put(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Staff Updated" })
      .expect(200);

    await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const storedLogs = await prisma.auditLog.findMany({
      where: {
        organizationId: admin.organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(storedLogs.map((log) => log.action)).toEqual(
      expect.arrayContaining(["USER_CREATED", "USER_UPDATED", "USER_STATUS_CHANGED"])
    );

    const response = await request(app)
      .get("/api/activity-logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organizationId: admin.organizationId,
          performedBy: admin.userId,
          action: "USER_CREATED",
          entityType: "user",
          entityId: user.id,
          actorUserId: admin.userId,
        }),
        expect.objectContaining({
          organizationId: admin.organizationId,
          performedBy: admin.userId,
          action: "USER_UPDATED",
          entityType: "user",
          entityId: user.id,
        }),
        expect.objectContaining({
          organizationId: admin.organizationId,
          performedBy: admin.userId,
          action: "USER_STATUS_CHANGED",
          entityType: "user",
          entityId: user.id,
        }),
      ])
    );
  });

  it("filters activity logs by organization from the JWT", async () => {
    const organizationOneToken = await getAuthToken(app);
    const organizationTwoToken = await getAuthToken(app);
    const organizationOne = decodeToken(organizationOneToken);

    const user = await createStaff(organizationOneToken, `org-one-${Date.now()}`);

    const response = await request(app)
      .get("/api/activity-logs")
      .set("Authorization", `Bearer ${organizationTwoToken}`)
      .expect(200);

    expect(
      response.body.data.some(
        (log) => log.entityId === user.id && log.organizationId === organizationOne.organizationId
      )
    ).toBe(false);
  });
});
