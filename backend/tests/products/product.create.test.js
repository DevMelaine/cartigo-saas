const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const { getAuthToken, getTokenForRole } = require("../helpers/authHelper");
const { ensureProductCategory } = require("../helpers/productCategoryHelper");

/**
 * Product creation tests
 * Validates business rules, multi-tenant isolation, and error handling
 */



describe("POST /api/products", () => {
  it("should create product successfully with valid data", async () => {
    const token = await getAuthToken(app);
    const category = await ensureProductCategory(token, "Food");

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Rice 10kg",
        description: "Premium quality rice",
        price: 25.5,
        costPrice: 15.0,
        stock: 100,
        sku: "RICE-001",
        categoryId: category.id,
        lowStockThreshold: 20,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe("Rice 10kg");
    expect(res.body.data.sku).toBe("RICE-001");
  });

  it("should create product successfully with image URLs from the upload flow", async () => {
    const token = await getAuthToken(app);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const category = await ensureProductCategory(token, "Food");

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Rice 5kg",
        description: "Pack shot with direct upload URL",
        price: 18.5,
        stock: 42,
        sku: "RICE-IMAGE-001",
        categoryId: category.id,
        imageUrl: `products/${decoded.organizationId}/front-cover.png`,
        galleryImages: [
          `products/${decoded.organizationId}/detail-1.png`,
          `products/${decoded.organizationId}/detail-2.png`,
        ],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.imageUrl).toContain(
      `/products/${decoded.organizationId}/front-cover.png`
    );
    expect(res.body.data.galleryImages).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `/products/${decoded.organizationId}/detail-1.png`
        ),
        expect.stringContaining(
          `/products/${decoded.organizationId}/detail-2.png`
        ),
      ])
    );
  });

  it("should convert SKU to uppercase", async () => {
    const token = await getAuthToken(app);
    const category = await ensureProductCategory(token);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: 10,
        stock: 50,
        sku: "prod-001",
        categoryId: category.id,
      })
      .expect(201);

    expect(res.body.data.sku).toBe("PROD-001");
  });

  it("should fail with duplicate SKU in same organization", async () => {
    const token = await getAuthToken(app);
    const category = await ensureProductCategory(token);

    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product 1",
        price: 10,
        stock: 50,
        sku: "DUP-001",
        categoryId: category.id,
      })
      .expect(201);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product 2",
        price: 15,
        stock: 30,
        sku: "DUP-001",
        categoryId: category.id,
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/SKU already exists/);
  });

  it("should allow same SKU in different organizations", async () => {
    const token1 = await getAuthToken(app);
    const token2 = await getAuthToken(app);
    const category1 = await ensureProductCategory(token1);
    const category2 = await ensureProductCategory(token2);

    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        name: "Product",
        price: 10,
        stock: 50,
        sku: "SHARED-001",
        categoryId: category1.id,
      })
      .expect(201);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token2}`)
      .send({
        name: "Product",
        price: 15,
        stock: 30,
        sku: "SHARED-001",
        categoryId: category2.id,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it("should fail with missing required fields", async () => {
    const token = await getAuthToken(app);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        // missing price and stock
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("should fail with negative price", async () => {
    const token = await getAuthToken(app);
    const category = await ensureProductCategory(token);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: -5,
        stock: 50,
        sku: "NEG-001",
        categoryId: category.id,
      })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("positive")])
    );
  });

  it("should fail with negative stock", async () => {
    const token = await getAuthToken(app);
    const category = await ensureProductCategory(token);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: 10,
        stock: -10,
        sku: "NEGSTOCK-001",
        categoryId: category.id,
      })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("non-negative")])
    );
  });

  it("should fail with cost price greater than selling price", async () => {
    const token = await getAuthToken(app);
    const category = await ensureProductCategory(token);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: 10,
        costPrice: 15,
        stock: 50,
        sku: "COST-001",
        categoryId: category.id,
      })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Cost price cannot be greater")])
    );
  });

  it("should fail with invalid SKU format", async () => {
    const token = await getAuthToken(app);
    const category = await ensureProductCategory(token);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: 10,
        stock: 50,
        sku: "sku@#$%", // invalid characters
        categoryId: category.id,
      })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("SKU must contain only letters, numbers, hyphens, or underscores.")])
    );
  });

  it("should fail with invalid image URL", async () => {
    const token = await getAuthToken(app);
    const category = await ensureProductCategory(token);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: 10,
        stock: 50,
        sku: "URL-001",
        categoryId: category.id,
        imageUrl: "not-a-url",
      })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("valid storage path or HTTP URL"),
      ])
    );
  });

  it("should forbid STAFF from creating products", async () => {
    const token = await getTokenForRole(app, "STAFF");
    const category = await ensureProductCategory(token);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: 10,
        stock: 10,
        sku: "EMP-001",
        categoryId: category.id,
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
