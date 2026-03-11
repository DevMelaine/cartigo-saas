const request = require("supertest");
const app = require("../../src/app");
const { getAuthToken, getTokenForRole } = require("../helpers/authHelper");

/**
 * Product read tests
 * Validates pagination, filtering, search, and multi-tenant isolation
 */



// helper: create multiple products
async function createProducts(token, count = 5) {
  const products = [];
  for (let i = 0; i < count; i++) {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `Product ${i + 1}`,
        price: 10 + i,
        stock: 50 + i * 10,
        sku: `TEST-00${i + 1}`,
        category: i % 2 === 0 ? "Food" : "Beverage",
      });
    products.push(res.body.data);
  }
  return products;
}

describe("GET /api/products", () => {
  it("should forbid unauthenticated requests", async () => {
    await request(app).get("/api/products").expect(401);
  });

  it("should allow EMPLOYEE to list products", async () => {
    const token = await getTokenForRole(app, "EMPLOYEE");
    await request(app).get("/api/products").set("Authorization", `Bearer ${token}`).expect(200);
  });
  it("should get products with default pagination", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 5);

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.total).toBe(5);
  });

  it("should paginate products correctly", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 25);

    const page1 = await request(app)
      .get("/api/products?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(page1.body.data.length).toBe(10);
    expect(page1.body.pagination.total).toBe(25);
    expect(page1.body.pagination.totalPages).toBe(3);

    const page2 = await request(app)
      .get("/api/products?page=2&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(page2.body.data.length).toBe(10);
    expect(page2.body.data[0].id).not.toBe(page1.body.data[0].id);
  });

  it("should filter by category", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 5);

    const res = await request(app)
      .get("/api/products?category=Food")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.every((p) => p.category === "Food")).toBe(true);
  });

  it("should search by product name", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 5);

    const res = await request(app)
      .get("/api/products?search=Product 1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some((p) => p.name.includes("Product 1"))).toBe(true);
  });

  it("should search by SKU", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 5);

    const res = await request(app)
      .get("/api/products?search=TEST-001")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some((p) => p.sku === "TEST-001")).toBe(true);
  });

  it("should sort by price ascending", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 5);

    const res = await request(app)
      .get("/api/products?sort=price&order=asc")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const prices = res.body.data.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("should sort by created date descending", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 5);

    const res = await request(app)
      .get("/api/products?sort=createdAt&order=desc")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const dates = res.body.data.map((p) => new Date(p.createdAt).getTime());
    const sorted = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sorted);
  });

  it("should not show inactive products", async () => {
    const token = await getAuthToken(app);
    const products = await createProducts(token, 2);

    // soft delete one product
    await request(app)
      .delete(`/api/products/${products[0].id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data.every((p) => p.isActive)).toBe(true);
  });

  it("should not show deleted products", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 3);

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.every((p) => p.isActive)).toBe(true);
  });

  it("should reject invalid pagination parameters", async () => {
    const token = await getAuthToken(app);

    const res = await request(app)
      .get("/api/products?page=abc&limit=999")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it("should enforce multi-tenant isolation", async () => {
    const token1 = await getAuthToken(app);
    const token2 = await getAuthToken(app);

    await createProducts(token1, 5);
    await createProducts(token2, 3);

    const res1 = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token1}`)
      .expect(200);

    const res2 = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token2}`)
      .expect(200);

    expect(res1.body.pagination.total).toBe(5);
    expect(res2.body.pagination.total).toBe(3);
  });
});

describe("GET /api/products/:id", () => {
  it("should get a single product by ID", async () => {
    const token = await getAuthToken(app);
    const products = await createProducts(token, 1);

    const res = await request(app)
      .get(`/api/products/${products[0].id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(products[0].id);
  });

  it("should return 404 for non-existent product", async () => {
    const token = await getAuthToken(app);

    const res = await request(app)
      .get("/api/products/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it("should not expose another organization's product", async () => {
    const token1 = await getAuthToken(app);
    const token2 = await getAuthToken(app);

    const products = await createProducts(token1, 1);
    const productId = products[0].id;

    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${token2}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});
