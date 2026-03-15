const request = require("supertest");
const app = require("../../src/app");
const { PrismaClient } = require("@prisma/client");

const prisma = global.prisma || new PrismaClient();
const originalFetch = global.fetch;

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function uniqueSku(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

async function registerCustomer(prefix = "payment-customer") {
  const response = await request(app)
    .post("/api/customers/register")
    .send({
      name: "Payment Customer",
      email: uniqueEmail(prefix),
      password: "Password123!",
    })
    .expect(201);

  return {
    token: response.body.data.accessToken,
    customerId: response.body.data.customer.id,
  };
}

async function seedPayableOrder() {
  const session = await registerCustomer();

  const organization = await prisma.organization.create({
    data: {
      name: `Payment Org ${Date.now()}`,
    },
  });

  const product = await prisma.product.create({
    data: {
      name: "Payment Product",
      price: 500,
      organizationId: organization.id,
      sku: uniqueSku("pay"),
      isActive: true,
      inventory: {
        create: {
          quantity: 20,
          organization: {
            connect: { id: organization.id },
          },
        },
      },
    },
    include: {
      inventory: true,
    },
  });

  await request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${session.token}`)
    .send({
      productId: product.id,
      quantity: 2,
    })
    .expect(200);

  const checkoutResponse = await request(app)
    .post("/api/orders/checkout")
    .set("Authorization", `Bearer ${session.token}`)
    .expect(200);

  return {
    token: session.token,
    customerId: session.customerId,
    organizationId: organization.id,
    productId: product.id,
    orderId: checkoutResponse.body.data.id,
    orderTotal: checkoutResponse.body.data.total,
  };
}

describe("PayGate payments", () => {
  beforeEach(() => {
    process.env.PAYGATE_API_KEY = "paygate_test_key";
    process.env.PAYGATE_BASE_URL = "https://paygateglobal.com";
    process.env.PAYGATE_CALLBACK_URL = "https://cartigo.test/api/payments/paygate/webhook";
    process.env.APP_BASE_URL = "https://cartigo.test";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("should create a PayGate payment and persist a pending record", async () => {
    const order = await seedPayableOrder();

    const response = await request(app)
      .post("/api/payments/paygate")
      .set("Authorization", `Bearer ${order.token}`)
      .send({ orderId: order.orderId })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.paymentUrl).toContain("https://paygateglobal.com/v1/page");

    const payment = await prisma.payment.findFirst({
      where: { orderId: order.orderId },
    });

    expect(payment).not.toBeNull();
    expect(payment.status).toBe("PENDING");
    expect(payment.provider).toBe("PAYGATE");

    const paymentUrl = new URL(response.body.paymentUrl);
    expect(paymentUrl.searchParams.get("token")).toBe(process.env.PAYGATE_API_KEY);
    expect(paymentUrl.searchParams.get("identifier")).toBe(payment.txReference);
    expect(paymentUrl.searchParams.get("amount")).toBe(String(order.orderTotal));
  });

  it("should process the PayGate webhook and mark the order as paid", async () => {
    const order = await seedPayableOrder();

    await request(app)
      .post("/api/payments/paygate")
      .set("Authorization", `Bearer ${order.token}`)
      .send({ orderId: order.orderId })
      .expect(200);

    const payment = await prisma.payment.findFirst({
      where: { orderId: order.orderId },
    });

    const webhookResponse = await request(app)
      .post("/api/payments/paygate/webhook")
      .send({
        tx_reference: "PG-TX-001",
        identifier: payment.txReference,
        payment_reference: "PG-PAY-001",
        amount: order.orderTotal,
        datetime: new Date().toISOString(),
        payment_method: "FLOOZ",
        phone_number: "90000000",
      })
      .expect(200);

    expect(webhookResponse.body.success).toBe(true);
    expect(webhookResponse.body.data.paymentStatus).toBe("SUCCESS");
    expect(webhookResponse.body.data.orderStatus).toBe("PAID");

    const refreshedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
    });
    const refreshedOrder = await prisma.order.findUnique({
      where: { id: order.orderId },
    });

    expect(refreshedPayment.status).toBe("SUCCESS");
    expect(refreshedPayment.paymentReference).toBe("PG-PAY-001");
    expect(refreshedOrder.status).toBe("PAID");
  });

  it("should ignore duplicate webhook notifications without double processing", async () => {
    const order = await seedPayableOrder();

    await request(app)
      .post("/api/payments/paygate")
      .set("Authorization", `Bearer ${order.token}`)
      .send({ orderId: order.orderId })
      .expect(200);

    const payment = await prisma.payment.findFirst({
      where: { orderId: order.orderId },
    });

    const payload = {
      tx_reference: "PG-TX-002",
      identifier: payment.txReference,
      payment_reference: "PG-PAY-002",
      amount: order.orderTotal,
      datetime: new Date().toISOString(),
      payment_method: "TMONEY",
      phone_number: "91000000",
    };

    await request(app)
      .post("/api/payments/paygate/webhook")
      .send(payload)
      .expect(200);

    const inventoryAfterFirstWebhook = await prisma.inventory.findUnique({
      where: { productId: order.productId },
    });

    const duplicateResponse = await request(app)
      .post("/api/payments/paygate/webhook")
      .send(payload)
      .expect(200);

    const inventoryAfterDuplicateWebhook = await prisma.inventory.findUnique({
      where: { productId: order.productId },
    });

    expect(duplicateResponse.body.success).toBe(true);
    expect(duplicateResponse.body.message).toMatch(/already processed/i);
    expect(inventoryAfterDuplicateWebhook.quantity).toBe(inventoryAfterFirstWebhook.quantity);

    const payments = await prisma.payment.findMany({
      where: { orderId: order.orderId },
    });
    expect(payments).toHaveLength(1);
  });

  it("should verify PayGate status and update local records", async () => {
    const order = await seedPayableOrder();

    await request(app)
      .post("/api/payments/paygate")
      .set("Authorization", `Bearer ${order.token}`)
      .send({ orderId: order.orderId })
      .expect(200);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 0,
        amount: order.orderTotal,
        payment_reference: "PG-VERIFY-001",
        payment_method: "FLOOZ",
      }),
    });

    const response = await request(app)
      .get(`/api/payments/status/${order.orderId}`)
      .set("Authorization", `Bearer ${order.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("SUCCESS");
    expect(response.body.data.providerStatusCode).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const payment = await prisma.payment.findFirst({
      where: { orderId: order.orderId },
    });
    const refreshedOrder = await prisma.order.findUnique({
      where: { id: order.orderId },
    });

    expect(payment.status).toBe("SUCCESS");
    expect(refreshedOrder.status).toBe("PAID");
  });

  it("should reject payment creation for another customer's order", async () => {
    const ownerOrder = await seedPayableOrder();
    const otherCustomer = await registerCustomer("other-customer");

    const response = await request(app)
      .post("/api/payments/paygate")
      .set("Authorization", `Bearer ${otherCustomer.token}`)
      .send({ orderId: ownerOrder.orderId })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/order not found/i);
  });
});
