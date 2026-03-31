const request = require("supertest");

const app = require("../../src/app");
const { getAuthToken, getTokenForRole } = require("../helpers/authHelper");

function makeInvitePayload() {
  const stamp = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

  return {
    email: `invite-${stamp}@test.com`,
    role: "STAFF",
  };
}

describe("Invitation routes", () => {
  it("should allow ADMIN to create an invitation", async () => {
    const token = await getAuthToken(app);
    const payload = makeInvitePayload();

    const response = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(payload.email);
    expect(response.body.data.role).toBe(payload.role);
    expect(response.body.data.status).toBe("PENDING");
    expect(response.body.data.inviteUrl).toContain("/accept-invite?token=");
  });

  it("should allow MANAGER to create an invitation and forbid CASHIER", async () => {
    const managerToken = await getTokenForRole(app, "MANAGER");
    const cashierToken = await getTokenForRole(app, "CASHIER");

    await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${managerToken}`)
      .send(makeInvitePayload())
      .expect(201);

    await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${cashierToken}`)
      .send(makeInvitePayload())
      .expect(403);
  });

  it("should isolate invitations by organization", async () => {
    const tokenOne = await getAuthToken(app);
    const tokenTwo = await getAuthToken(app);

    await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${tokenOne}`)
      .send(makeInvitePayload())
      .expect(201);

    await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${tokenTwo}`)
      .send(makeInvitePayload())
      .expect(201);

    await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${tokenTwo}`)
      .send(makeInvitePayload())
      .expect(201);

    const listOne = await request(app)
      .get("/api/invitations")
      .set("Authorization", `Bearer ${tokenOne}`)
      .expect(200);

    const listTwo = await request(app)
      .get("/api/invitations")
      .set("Authorization", `Bearer ${tokenTwo}`)
      .expect(200);

    expect(listOne.body.data).toHaveLength(1);
    expect(listTwo.body.data).toHaveLength(2);
  });

  it("should accept an invitation and create the user in the organization", async () => {
    const adminToken = await getAuthToken(app);
    const payload = {
      email: `accepted-${Date.now()}@test.com`,
      role: "MANAGER",
    };

    const inviteResponse = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    const token = new URL(inviteResponse.body.data.inviteUrl).searchParams.get("token");

    const acceptResponse = await request(app)
      .post("/api/invitations/accept")
      .send({
        token,
        name: "Invited Manager",
        password: "password123",
      })
      .expect(201);

    expect(acceptResponse.body.success).toBe(true);
    expect(acceptResponse.body.data.user.email).toBe(payload.email);
    expect(acceptResponse.body.data.user.role).toBe(payload.role);
    expect(acceptResponse.body.data.invitation.status).toBe("ACCEPTED");

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: payload.email,
        password: "password123",
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.user.email).toBe(payload.email);
    expect(loginResponse.body.data.user.role).toBe(payload.role);
  });
});
