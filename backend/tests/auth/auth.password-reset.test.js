process.env.DASHBOARD_URL = "http://localhost:3000";

jest.mock("../../src/services/emailService", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: "test" }),
}));

const request = require("supertest");
const app = require("../../src/app");
const prisma = require("../../src/lib/prisma");
const {
  ensureOrganizationCategory,
} = require("../helpers/organizationCategoryHelper");
const { sendPasswordResetEmail } = require("../../src/services/emailService");

async function registerAdmin(email = "reset@test.com") {
  const category = await ensureOrganizationCategory();

  await request(app).post("/api/auth/register-organization").send({
    name: "Reset Org",
    categoryId: category.id,
    adminName: "Reset Admin",
    email,
    password: "password123",
  });
}

describe("Password reset flow", () => {
  it("should create a password reset token and send a reset email", async () => {
    await registerAdmin();

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "reset@test.com" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const resetToken = await prisma.passwordResetToken.findFirst();
    expect(resetToken).not.toBeNull();
  });

  it("should reset the password and invalidate the token", async () => {
    await registerAdmin("change@test.com");

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "change@test.com" })
      .expect(200);

    const [{ resetUrl }] = sendPasswordResetEmail.mock.calls.at(-1);
    const resetUrlObject = new URL(resetUrl);
    const token = resetUrlObject.searchParams.get("token");

    expect(token).toBeTruthy();

    await request(app)
      .post("/api/auth/reset-password")
      .send({
        token,
        password: "newPassword123",
      })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({
        email: "change@test.com",
        password: "password123",
      })
      .expect(401);

    await request(app)
      .post("/api/auth/login")
      .send({
        email: "change@test.com",
        password: "newPassword123",
      })
      .expect(200);

    const remainingTokens = await prisma.passwordResetToken.findMany();
    expect(remainingTokens).toHaveLength(0);
  });
});
