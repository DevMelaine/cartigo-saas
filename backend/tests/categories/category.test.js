const request = require("supertest");
const app = require("../../src/app");
const {
  ensureOrganizationCategory,
} = require("../helpers/organizationCategoryHelper");

async function setupTestOrg() {
  const organizationCategory = await ensureOrganizationCategory();

  const registerRes = await request(app)
    .post("/api/auth/register-organization")
    .send({
      name: `Test Org Categories ${Date.now()}`,
      categoryId: organizationCategory.id,
      adminName: "Test Admin",
      email: `test-cat-org-${Date.now()}@test.com`,
      password: "password123",
    });

  if (!registerRes.body.data) {
    console.error("Registration failed:", registerRes.body);
    throw new Error("Registration failed");
  }

  return {
    adminToken: registerRes.body.data.accessToken,
    orgId: registerRes.body.data.organization.id,
  };
}

describe("Category Management", () => {
  let adminToken, orgId;

  beforeEach(async () => {
    const setup = await setupTestOrg();
    adminToken = setup.adminToken;
    orgId = setup.orgId;
  });

  describe("POST /api/categories", () => {
    it("should create a new category", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Electronics",
          description: "Electronic items",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.name).toBe("Electronics");
    });

    it("should reject duplicate category name", async () => {
      await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate",
          description: "First",
        })
        .expect(201);

      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate",
          description: "Second",
        })
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it("should reject missing name", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          description: "No name",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/categories")
        .send({
          name: "Unauthorized",
        })
        .expect(401);
    });
  });

  describe("GET /api/categories", () => {
    it("should list all categories", async () => {
      const res = await request(app)
        .get("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("total");
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it("should support pagination", async () => {
      const res = await request(app)
        .get("/api/categories?skip=0&take=5")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.skip).toBe(0);
      expect(res.body.data.take).toBe(5);
    });
  });

  describe("GET /api/categories/:id", () => {
    it("should get category by id", async () => {
      const createRes = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Electronics",
          description: "Electronic items",
        })
        .expect(201);

      const categoryId = createRes.body.data.id;
      const res = await request(app)
        .get(`/api/categories/${categoryId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(categoryId);
    });

    it("should return 404 for non-existent category", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(`/api/categories/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe("PATCH /api/categories/:id", () => {
    it("should update category", async () => {
      const createRes = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Electronics",
          description: "Electronic items",
        })
        .expect(201);

      const categoryId = createRes.body.data.id;
      const res = await request(app)
        .patch(`/api/categories/${categoryId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          description: "Updated description",
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe("Updated description");
    });

    it("should reject updating to duplicate name", async () => {
      // Create first category
      const res1 = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Electronics",
        })
        .expect(201);

      const categoryId = res1.body.data.id;

      // Create second category
      await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Furniture",
        })
        .expect(201);

      // Try to update first to same name as second
      const res = await request(app)
        .patch(`/api/categories/${categoryId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Furniture",
        })
        .expect(409);

      expect(res.body.success).toBe(false);
    });
  });

  describe("DELETE /api/categories/:id", () => {
    it("should delete category", async () => {
      // Create category to delete
      const createRes = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "To Delete",
        })
        .expect(201);

      const toDeleteId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/categories/${toDeleteId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify it's deleted
      await request(app)
        .get(`/api/categories/${toDeleteId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });

    it("should return 404 for non-existent category", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .delete(`/api/categories/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });
});
