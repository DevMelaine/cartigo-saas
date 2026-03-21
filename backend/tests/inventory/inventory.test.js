const request = require("supertest");
const app = require("../../src/app");
const {
  ensureOrganizationCategory,
} = require("../helpers/organizationCategoryHelper");

async function setupTestOrgAndProduct() {
  const organizationCategory = await ensureOrganizationCategory();

  const registerRes = await request(app)
    .post("/api/auth/register-organization")
    .send({
      name: `Test Org Inventory ${Date.now()}`,
      categoryId: organizationCategory.id,
      adminName: "Test Admin",
      email: `test-inv-org-${Date.now()}@test.com`,
      password: "password123",
    });

  if (!registerRes.body.data) {
    console.error("Registration failed:", registerRes.body);
    throw new Error("Registration failed");
  }

  const adminToken = registerRes.body.data.accessToken;
  const orgId = registerRes.body.data.organization.id;

  // Create a product (stock required by validation)
  const productRes = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Test Product",
      price: 99.99,
      stock: 0,
      sku: `SKU-${Date.now()}`,
    });

  return {
    adminToken,
    orgId,
    productId: productRes.body.data.id,
  };
}

describe("Inventory Management", () => {
  let adminToken, orgId, productId;

  beforeEach(async () => {
    const setup = await setupTestOrgAndProduct();
    adminToken = setup.adminToken;
    orgId = setup.orgId;
    productId = setup.productId;
  });

  describe("POST /api/inventory/add", () => {
    it("should add stock to product", async () => {
      const res = await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 50,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity).toBe(50);
    });

    it("should increment stock on subsequent adds", async () => {
      // Add 30 first
      await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 30,
        })
        .expect(200);

      // Add 20 more
      const res = await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 20,
        })
        .expect(200);

      expect(res.body.data.quantity).toBe(50);
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/inventory/add")
        .send({
          productId,
          quantity: 10,
        })
        .expect(401);
    });

    it("should require productId", async () => {
      const res = await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          quantity: 10,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should require quantity", async () => {
      const res = await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/inventory/remove", () => {
    it("should remove stock from product", async () => {
      // Add 50 first
      await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 50,
        })
        .expect(200);

      // Remove 20
      const res = await request(app)
        .post("/api/inventory/remove")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 20,
        })
        .expect(200);

      expect(res.body.data.quantity).toBe(30);
    });

    it("should reject removal exceeding stock", async () => {
      // Add 10
      await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 10,
        })
        .expect(200);

      // Try to remove 20 (more than available)
      const res = await request(app)
        .post("/api/inventory/remove")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 20,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/inventory/remove")
        .send({
          productId,
          quantity: 10,
        })
        .expect(401);
    });
  });

  describe("GET /api/inventory/:productId", () => {
    it("should get inventory by product id", async () => {
      // Add 50 first
      await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 50,
        })
        .expect(200);

      const res = await request(app)
        .get(`/api/inventory/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.productId).toBe(productId);
      expect(res.body.data.quantity).toBe(50);
    });

    it("should return initialized inventory when none exists", async () => {
      const res = await request(app)
        .get(`/api/inventory/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity).toBe(0);
      expect(res.body.data.minStock).toBe(0);
    });

    it("should require authentication", async () => {
      await request(app)
        .get(`/api/inventory/${productId}`)
        .expect(401);
    });
  });

  describe("PATCH /api/inventory/:productId", () => {
    it("should update inventory minStock", async () => {
      // Add stock first
      await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 50,
        })
        .expect(200);

      const res = await request(app)
        .patch(`/api/inventory/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          minStock: 10,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.minStock).toBe(10);
    });

    it("should initialize inventory when updating non-existent inventory", async () => {
      const res = await request(app)
        .patch(`/api/inventory/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          minStock: 5,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.minStock).toBe(5);
    });
  });

  describe("Multi-tenancy", () => {
    it("should isolate inventory by organization", async () => {
      // Create inventory in first org
      await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          productId,
          quantity: 100,
        })
        .expect(200);

      // Create second org
      const org2Setup = await setupTestOrgAndProduct();
      const org2Token = org2Setup.adminToken;
      const org2ProductId = org2Setup.productId;

      // Add inventory to second org
      await request(app)
        .post("/api/inventory/add")
        .set("Authorization", `Bearer ${org2Token}`)
        .send({
          productId: org2ProductId,
          quantity: 50,
        })
        .expect(200);

      // First org should see 100, not 50
      const res = await request(app)
        .get(`/api/inventory/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.quantity).toBe(100);
    });
  });
});

