const request = require("supertest");
const app = require("../../src/app");
const { getAuthToken, getTokenForRole } = require("../helpers/authHelper");

/**
 * Product update and delete tests
 * Validates role-based authorization, data integrity, and soft delete
 */



// helper: create a product
async function createProduct(token) {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Test Product",
      price: 20,
      stock: 100,
      sku: `SKU-${Date.now()}`,
    });
  return res.body.data;
}

describe("PUT /api/products/:id", () => {
  it("should update product name and price", async () => {
    const token = await getAuthToken(app);
    const product = await createProduct(token);

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Product",
        price: 25,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Updated Product");
    expect(res.body.data.price).toBe(25);
  });

  it("should update multiple fields", async () => {
    const token = await getAuthToken(app);
    const product = await createProduct(token);

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Multi Update",
        stock: 200,
        category: "Electronics",
        lowStockThreshold: 50,
      })
      .expect(200);

    expect(res.body.data.name).toBe("Multi Update");
    expect(res.body.data.stock).toBe(200);
    expect(res.body.data.category).toBe("Electronics");
    expect(res.body.data.lowStockThreshold).toBe(50);
  });

  it("should not allow duplicate SKU after update", async () => {
    const token = await getAuthToken(app);
    const product1 = await createProduct(token);
    const product2 = await createProduct(token);

    const res = await request(app)
      .put(`/api/products/${product2.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        sku: product1.sku, // try to duplicate SKU
      })
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it("should update SKU when not duplicating", async () => {
    const token = await getAuthToken(app);
    const product = await createProduct(token);

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        sku: "NEW-SKU-001",
      })
      .expect(200);

    expect(res.body.data.sku).toBe("NEW-SKU-001");
  });

  it("should fail updating with invalid data", async () => {
    const token = await getAuthToken(app);
    const product = await createProduct(token);

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        price: -10, // invalid
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it("should return 404 when updating non-existent product", async () => {
    const token = await getAuthToken(app);

    const res = await request(app)
      .put("/api/products/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test" })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it("should not allow EMPLOYEE to update product", async () => {
    const adminToken = await getAuthToken(app);
    const product = await createProduct(adminToken);

    // generate a token for an EMPLOYEE within the same organization
    const employeeToken = await getTokenForRole(app, "EMPLOYEE");

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ name: "Updated" })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

});

describe("DELETE /api/products/:id", () => {
  it("should soft delete a product", async () => {
    const token = await getAuthToken(app);
    const product = await createProduct(token);

    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("should hide soft deleted product from listings", async () => {
    const token = await getAuthToken(app);
    const product = await createProduct(token);

    await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.every((p) => p.id !== product.id)).toBe(true);
  });

  it("should return 404 when deleting non-existent product", async () => {
    const token = await getAuthToken(app);

    const res = await request(app)
      .delete("/api/products/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it("should not delete another organization's product", async () => {
    const token1 = await getAuthToken(app);
    const token2 = await getAuthToken(app);

    const product = await createProduct(token1);

    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token2}`)
      .expect(404);

    expect(res.body.success).toBe(false);

    // verify product still exists for org1
    const getRes = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token1}`)
      .expect(200);

    expect(getRes.body.data.isActive).toBe(true);
  });
});

describe("Role-based authorization", () => {
  it("should require authentication for all product operations", async () => {
    const res = await request(app).get("/api/products").expect(401);

    expect(res.body.success).toBe(false);
  });

  it("should allow ADMIN to create products", async () => {
    const token = await getAuthToken(app);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: 10,
        stock: 50,
        sku: "ADMIN-001",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it("should forbid EMPLOYEE from creating products", async () => {
    const token = await getTokenForRole(app, "EMPLOYEE");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product",
        price: 10,
        stock: 50,
        sku: "EMP-001",
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
