const request = require("supertest");
const jwt = require("jsonwebtoken");
const { Prisma } = require("@prisma/client");
const app = require("../../src/app");
const { getAuthToken, getTokenForRole } = require("../helpers/authHelper");
const { ensureProductCategory } = require("../helpers/productCategoryHelper");

/**
 * Product read tests
 * Validates pagination, filtering, search, and multi-tenant isolation
 */



// helper: create multiple products
async function createProducts(token, count = 5) {
  const foodCategory = await ensureProductCategory(token, "Food");
  const beverageCategory = await ensureProductCategory(token, "Beverage");
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
        categoryId: i % 2 === 0 ? foodCategory.id : beverageCategory.id,
      });
    products.push(res.body.data);
  }
  return products;
}

function getOrganizationIdFromToken(token) {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  return decoded.organizationId;
}

async function createDeliveredSale(token, product, quantity = 2) {
  const organizationId = getOrganizationIdFromToken(token);
  const customer = await global.prisma.customer.create({
    data: {
      email: `metrics+${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      password: "hashed-password",
      name: "Metrics customer",
    },
  });

  const unitPrice = new Prisma.Decimal(product.price);
  const total = new Prisma.Decimal(product.price * quantity);

  const order = await global.prisma.order.create({
    data: {
      customerId: customer.id,
      organizationId,
      status: "DELIVERED",
      total,
    },
  });

  await global.prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      quantity,
      price: unitPrice,
    },
  });
}

describe("GET /api/products", () => {
  it("should forbid unauthenticated requests", async () => {
    await request(app).get("/api/products").expect(401);
  });

  it("should allow STAFF to list products", async () => {
    const token = await getTokenForRole(app, "STAFF");
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

  it("should filter by categoryId", async () => {
    const token = await getAuthToken(app);
    const products = await createProducts(token, 5);
    const targetCategoryId = products.find((product) => product.categoryId)?.categoryId;

    const res = await request(app)
      .get(`/api/products?categoryId=${targetCategoryId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((product) => product.categoryId === targetCategoryId)).toBe(true);
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

  it("should filter by price range", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 5);

    const res = await request(app)
      .get("/api/products?minPrice=11&maxPrice=13")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((product) => product.price >= 11 && product.price <= 13)).toBe(true);
  });

  it("should not show archived products in the default listing", async () => {
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
    expect(res.body.data.every((p) => p.status === "ACTIVE")).toBe(true);
  });

  it("should expose archived products when the archived status filter is requested", async () => {
    const token = await getAuthToken(app);
    const products = await createProducts(token, 2);

    await request(app)
      .delete(`/api/products/${products[0].id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .get("/api/products?status=archived")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(products[0].id);
    expect(res.body.data[0].status).toBe("ARCHIVED");
  });

  it("should not show deleted products", async () => {
    const token = await getAuthToken(app);
    await createProducts(token, 3);

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.every((p) => p.status === "ACTIVE")).toBe(true);
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

describe("GET /api/products/stats/overview", () => {
  it("should expose enriched product statistics", async () => {
    const token = await getAuthToken(app);
    const products = await createProducts(token, 2);

    await createDeliveredSale(token, products[0], 3);

    const res = await request(app)
      .get("/api/products/stats/overview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalProducts).toBe(2);
    expect(res.body.data.totalSales).toBe(3);
    expect(res.body.data.revenueGenerated).toBe(products[0].price * 3);
    expect(typeof res.body.data.topPerformers).toBe("number");
    expect(typeof res.body.data.lowStockCount).toBe("number");
  });
});

describe("GET /api/products/stats/top-performers", () => {
  it("should rank products by generated revenue", async () => {
    const token = await getAuthToken(app);
    const products = await createProducts(token, 3);

    await createDeliveredSale(token, products[0], 5);
    await createDeliveredSale(token, products[1], 2);

    const res = await request(app)
      .get("/api/products/stats/top-performers?limit=2")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.data[0].id).toBe(products[0].id);
    expect(res.body.data[0].revenueGenerated).toBeGreaterThanOrEqual(
      res.body.data[1].revenueGenerated
    );
  });
});
