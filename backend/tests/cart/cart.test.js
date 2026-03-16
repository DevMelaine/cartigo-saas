const request = require("supertest");
const app = require("../../src/app");
const { PrismaClient } = require("@prisma/client");
const { createOrganizationForTest } = require("../helpers/organizationCategoryHelper");

const prisma = global.prisma || new PrismaClient();

let customerToken;
let customerId;
let productId;
let organizationId;

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function addItemToCart(quantity = 2) {
  return request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ productId, quantity });
}

beforeEach(async () => {

  const res = await request(app)
    .post("/api/customers/register")
    .send({
      name: "Test Customer",
      email: uniqueEmail("testcustomer"),
      password: "Password123!"
    });

  customerToken = res.body.data.accessToken;
  customerId = res.body.data.customer.id;

  const organization = await createOrganizationForTest({
    name: "Test Org",
  });

  organizationId = organization.id;

  const product = await prisma.product.create({
    data: {
      name: "Test Product",
      price: 1000,
      organizationId,
      sku: "COST-001",
      isActive: true,
      inventory: {
        create: {
          quantity: 50,
          organization: {
            connect: { id: organizationId }
          }
        }
      }
    },
    include: { inventory: true }
  });

  productId = product.id;

});

describe("Cart Module", () => {

  test("Add product to cart", async () => {

    const res = await addItemToCart(2);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quantity).toBe(2);

  });

  test("Update quantity", async () => {

    const addRes = await addItemToCart(2);
    const itemId = addRes.body.data.id;

    const res = await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ quantity: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.quantity).toBe(5);

  });

  test("Get cart", async () => {

    await addItemToCart(2);

    const res = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0].productId).toBe(productId);
    expect(res.body.data.total).toBe(2000);

  });

  test("Remove item", async () => {

    const addRes = await addItemToCart(2);
    const itemId = addRes.body.data.id;

    const res = await request(app)
      .delete(`/api/cart/items/${itemId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("item removed");

  });

});
