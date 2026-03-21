const request = require("supertest");
const app = require("../../src/app");
const { PrismaClient } = require("@prisma/client");
const { createTestOrganization } = require("../helpers/organizationCategoryHelper");

const prisma = global.prisma || new PrismaClient();

let customerToken;
let customerId;
let productId;
let organizationId;

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function seedCheckoutCart() {
  return request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ productId, quantity: 2 });
}

beforeEach(async () => {

  const res = await request(app)
    .post("/api/customers/register")
    .send({
      name: "Order Customer",
      email: uniqueEmail("ordercustomer"),
      password: "Password123!"
    });

  customerToken = res.body.data.accessToken;
  customerId = res.body.data.customer.id;

  const organization = await createTestOrganization({
    name: "Test Org",
  });

  organizationId = organization.id;

  const product = await prisma.product.create({
    data: {
      name: "Order Product",
      price: 500,
      organizationId,
      sku: "COST-001",
      isActive: true,
      inventory: {
        create: {
          quantity: 20,
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

describe("Order Module", () => {

  test("Checkout", async () => {

    await seedCheckoutCart();

    const res = await request(app)
      .post("/api/orders/checkout")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1000);

  });

  test("Verify inventory updated", async () => {

    await seedCheckoutCart();

    await request(app)
      .post("/api/orders/checkout")
      .set("Authorization", `Bearer ${customerToken}`);

    const inventory = await prisma.inventory.findUnique({
      where: { productId }
    });

    expect(inventory.quantity).toBe(18);

  });

  test("Verify cart cleared", async () => {

    await seedCheckoutCart();

    await request(app)
      .post("/api/orders/checkout")
      .set("Authorization", `Bearer ${customerToken}`);

    const cart = await prisma.cart.findUnique({
      where: {
        customerId_organizationId: {
          customerId,
          organizationId
        }
      },
      include: { items: true }
    });

    expect(cart.items.length).toBe(0);

  });

});
