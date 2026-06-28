process.env.GOOGLE_CLIENT_ID = "google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
process.env.GOOGLE_REDIRECT_URI =
  "http://localhost:5001/api/auth/google/callback";
process.env.DASHBOARD_URL = "http://localhost:3000";

const request = require("supertest");
const app = require("../../src/app");

describe("Google auth endpoints", () => {
  it("should redirect to Google authorization URL and set OAuth state cookie", async () => {
    const response = await request(app).get("/api/auth/google").expect(302);

    expect(response.headers.location).toContain(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
    expect(response.headers.location).toContain("client_id=google-client-id");
    expect(response.headers.location).toContain(
      encodeURIComponent("http://localhost:5001/api/auth/google/callback")
    );
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("cartigo_oauth_state=")])
    );
  });

  it("should reject callback with invalid or missing OAuth state", async () => {
    const response = await request(app)
      .get("/api/auth/google/callback")
      .query({
        code: "fake-code",
        state: "wrong-state",
      })
      .expect(302);

    expect(response.headers.location).toContain(
      "http://localhost:3000/login?oauthError=Invalid+OAuth+state"
    );
  });
});
