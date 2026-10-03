const request = require("supertest");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { PrismaClient } = require("@prisma/client");
const app = require("../../src/app");
const notificationService = require("../../src/services/notification.service");
const { NOTIFICATION_TYPES } = require("../../src/utils/notificationEvents");
const { createTestOrganization } = require("../helpers/organizationCategoryHelper");

const prisma = global.prisma || new PrismaClient();

function uniqueEmail(prefix = "notification") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function signUserToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signCustomerToken(customer, organizationId = null) {
  return jwt.sign(
    {
      userId: customer.id,
      customerId: customer.id,
      organizationId,
      role: "CUSTOMER",
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

async function seedNotificationActors() {
  const organization = await createTestOrganization({
    name: `Notifications Org ${Date.now()}`,
  });

  const [admin, manager, cashier, staff] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin User",
        email: uniqueEmail("notif-admin"),
        password: "hashed-password",
        role: "ADMIN",
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Manager User",
        email: uniqueEmail("notif-manager"),
        password: "hashed-password",
        role: "MANAGER",
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Cashier User",
        email: uniqueEmail("notif-cashier"),
        password: "hashed-password",
        role: "CASHIER",
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Staff User",
        email: uniqueEmail("notif-staff"),
        password: "hashed-password",
        role: "STAFF",
        organizationId: organization.id,
      },
    }),
  ]);

  const customer = await prisma.customer.create({
    data: {
      name: "Notification Customer",
      email: uniqueEmail("notif-customer"),
      password: "hashed-password",
    },
  });

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      organizationId: organization.id,
      status: "PENDING_PAYMENT",
      total: 750,
    },
  });

  return {
    organization,
    users: {
      admin,
      manager,
      cashier,
      staff,
    },
    customer,
    order,
    tokens: {
      admin: signUserToken(admin),
      manager: signUserToken(manager),
      cashier: signUserToken(cashier),
      staff: signUserToken(staff),
      customer: signCustomerToken(customer, organization.id),
    },
  };
}

describe("Notifications module", () => {
  let pushProvider;
  let emailProvider;
  let smsProvider;

  beforeEach(() => {
    pushProvider = {
      sendToTokens: jest.fn().mockResolvedValue({ sentCount: 1 }),
    };
    emailProvider = {
      send: jest.fn().mockResolvedValue({ provider: "mock-email", messageId: randomUUID() }),
    };
    smsProvider = {
      send: jest.fn().mockResolvedValue({ provider: "mock-sms" }),
    };

    notificationService.setPushProvider(pushProvider);
    notificationService.setEmailProvider(emailProvider);
    notificationService.setSmsProvider(smsProvider);
  });

  afterEach(async () => {
    await notificationService.waitForBackgroundTasks();
    notificationService.resetPushProvider();
    notificationService.resetEmailProvider();
    notificationService.resetSmsProvider();
    notificationService.clearAntiSpamState();
  });

  it("registers a device token for the authenticated actor", async () => {
    const context = await seedNotificationActors();

    const response = await request(app)
      .post("/api/notifications/register-device")
      .set("Authorization", `Bearer ${context.tokens.admin}`)
      .send({
        token: "device-token-admin-12345678901234567890",
        platform: "android",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe(context.users.admin.id);
    expect(response.body.data.customerId).toBeNull();

    const stored = await prisma.deviceToken.findUnique({
      where: {
        token: "device-token-admin-12345678901234567890",
      },
    });

    expect(stored.platform).toBe("android");
  });

  it("creates deduplicated ORDER_PAID notifications and sends push only once per recipient", async () => {
    const context = await seedNotificationActors();

    await prisma.deviceToken.createMany({
      data: [
        {
          token: `token-admin-${randomUUID()}`,
          platform: "android",
          userId: context.users.admin.id,
        },
        {
          token: `token-manager-${randomUUID()}`,
          platform: "android",
          userId: context.users.manager.id,
        },
        {
          token: `token-cashier-${randomUUID()}`,
          platform: "ios",
          userId: context.users.cashier.id,
        },
        {
          token: `token-customer-${randomUUID()}`,
          platform: "web",
          customerId: context.customer.id,
        },
        {
          token: `token-staff-${randomUUID()}`,
          platform: "web",
          userId: context.users.staff.id,
        },
      ],
    });

    await Promise.all([
      notificationService.notifyEvent(NOTIFICATION_TYPES.ORDER_PAID, { orderId: context.order.id }),
      notificationService.notifyEvent(NOTIFICATION_TYPES.ORDER_PAID, { orderId: context.order.id }),
    ]);

    await notificationService.waitForBackgroundTasks();

    const notifications = await prisma.notification.findMany({
      where: {
        type: NOTIFICATION_TYPES.ORDER_PAID,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    expect(notifications).toHaveLength(4);
    expect(notifications.some((notification) => notification.userId === context.users.staff.id)).toBe(false);
    expect(notifications.some((notification) => notification.customerId === context.customer.id)).toBe(true);
    expect(pushProvider.sendToTokens).toHaveBeenCalledTimes(4);
  });

  it("lists only the current user's notifications with pagination and unread filtering", async () => {
    const context = await seedNotificationActors();

    await prisma.notification.createMany({
      data: [
        {
          userId: context.users.admin.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.LOW_STOCK,
          title: "Low stock 1",
          message: "First alert",
          isRead: false,
          eventKey: `low-stock-${randomUUID()}`,
        },
        {
          userId: context.users.admin.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_READY,
          title: "Order ready",
          message: "Second alert",
          isRead: true,
          eventKey: `order-ready-${randomUUID()}`,
        },
        {
          userId: context.users.manager.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_PAID,
          title: "Manager only",
          message: "Third alert",
          isRead: false,
          eventKey: `order-paid-${randomUUID()}`,
        },
      ],
    });

    const response = await request(app)
      .get("/api/notifications")
      .query({ unread: true, page: 1, limit: 10 })
      .set("Authorization", `Bearer ${context.tokens.admin}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userId).toBe(context.users.admin.id);
    expect(response.body.data[0].isRead).toBe(false);
    expect(response.body.unreadCount).toBe(1);
    expect(response.body.pagination.total).toBe(1);
  });

  it("returns the unread notifications count for the current actor only", async () => {
    const context = await seedNotificationActors();

    await prisma.notification.createMany({
      data: [
        {
          userId: context.users.admin.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_READY,
          title: "Unread one",
          message: "Unread one",
          isRead: false,
          eventKey: `unread-count-1-${randomUUID()}`,
        },
        {
          userId: context.users.admin.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_READY,
          title: "Read one",
          message: "Read one",
          isRead: true,
          eventKey: `unread-count-2-${randomUUID()}`,
        },
        {
          userId: context.users.manager.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_READY,
          title: "Manager unread",
          message: "Manager unread",
          isRead: false,
          eventKey: `unread-count-3-${randomUUID()}`,
        },
      ],
    });

    const response = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${context.tokens.admin}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.unreadCount).toBe(1);
  });

  it("marks a single notification as read only for its owner", async () => {
    const context = await seedNotificationActors();

    const notification = await prisma.notification.create({
      data: {
        userId: context.users.admin.id,
        organizationId: context.organization.id,
        type: NOTIFICATION_TYPES.ORDER_READY,
        title: "Ready",
        message: "Ready message",
        eventKey: `single-read-${randomUUID()}`,
      },
    });

    const response = await request(app)
      .patch(`/api/notifications/${notification.id}/read`)
      .set("Authorization", `Bearer ${context.tokens.admin}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isRead).toBe(true);

    const outsiderResponse = await request(app)
      .patch(`/api/notifications/${notification.id}/read`)
      .set("Authorization", `Bearer ${context.tokens.manager}`)
      .expect(404);

    expect(outsiderResponse.body.success).toBe(false);
  });

  it("marks all current actor notifications as read", async () => {
    const context = await seedNotificationActors();

    await prisma.notification.createMany({
      data: [
        {
          userId: context.users.admin.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_READY,
          title: "One",
          message: "One",
          eventKey: `read-all-1-${randomUUID()}`,
        },
        {
          userId: context.users.admin.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.LOW_STOCK,
          title: "Two",
          message: "Two",
          eventKey: `read-all-2-${randomUUID()}`,
        },
        {
          userId: context.users.manager.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_PAID,
          title: "Three",
          message: "Three",
          eventKey: `read-all-3-${randomUUID()}`,
        },
      ],
    });

    const response = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${context.tokens.admin}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.updatedCount).toBe(2);

    const unreadCount = await prisma.notification.count({
      where: {
        userId: context.users.admin.id,
        isRead: false,
      },
    });

    expect(unreadCount).toBe(0);
  });

  it("filters customer notifications so a customer only sees their own inbox", async () => {
    const context = await seedNotificationActors();
    const otherCustomer = await prisma.customer.create({
      data: {
        name: "Other Customer",
        email: uniqueEmail("notif-customer-other"),
        password: "hashed-password",
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          customerId: context.customer.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_PAID,
          title: "Customer paid",
          message: "Your payment is confirmed",
          eventKey: `customer-1-${randomUUID()}`,
        },
        {
          customerId: otherCustomer.id,
          organizationId: context.organization.id,
          type: NOTIFICATION_TYPES.ORDER_READY,
          title: "Other customer",
          message: "Other inbox",
          eventKey: `customer-2-${randomUUID()}`,
        },
      ],
    });

    const response = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${context.tokens.customer}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].customerId).toBe(context.customer.id);
  });

  it("queues a login notification from authenticated context and stores an in-app alert", async () => {
    const context = await seedNotificationActors();

    const response = await request(app)
      .post("/api/notifications/login")
      .set("Authorization", `Bearer ${context.tokens.admin}`)
      .send({
        user: {
          phone: "+22890000000",
        },
        channels: ["email", "sms", "inApp"],
        metadata: {
          ipAddress: "197.200.1.1",
          device: "Chrome on Windows",
        },
      })
      .expect(202);

    expect(response.body.success).toBe(true);
    expect(response.body.data.queued).toBe(true);
    expect(response.body.data.type).toBe(NOTIFICATION_TYPES.LOGIN);

    await notificationService.waitForBackgroundTasks();

    const notifications = await prisma.notification.findMany({
      where: {
        userId: context.users.admin.id,
        type: NOTIFICATION_TYPES.LOGIN,
      },
    });

    expect(notifications).toHaveLength(1);
    expect(emailProvider.send).toHaveBeenCalledTimes(1);
    expect(smsProvider.send).toHaveBeenCalledTimes(1);
    expect(notifications[0].message).toContain("login");
  });

  it("queues a suspicious login notification when requested", async () => {
    const context = await seedNotificationActors();

    const response = await request(app)
      .post("/api/notifications/login")
      .set("Authorization", `Bearer ${context.tokens.admin}`)
      .send({
        suspicious: true,
        metadata: {
          ipAddress: "10.10.10.10",
          location: "Lome",
        },
      })
      .expect(202);

    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe(NOTIFICATION_TYPES.SUSPICIOUS_LOGIN);

    await notificationService.waitForBackgroundTasks();

    const notifications = await prisma.notification.findMany({
      where: {
        userId: context.users.admin.id,
        type: NOTIFICATION_TYPES.SUSPICIOUS_LOGIN,
      },
    });

    expect(notifications).toHaveLength(1);
    expect(emailProvider.send).toHaveBeenCalledTimes(1);
  });

  it("queues a transaction notification through the integration endpoint", async () => {
    const context = await seedNotificationActors();

    const response = await request(app)
      .post("/api/notifications/transaction")
      .set("Authorization", `Bearer ${context.tokens.admin}`)
      .send({
        channels: ["email", "inApp"],
        transaction: {
          id: "txn-001",
          reference: "MFI-TRX-001",
          amount: 25000,
          currency: "XOF",
          type: "DEPOSIT",
          status: "SUCCESS",
          description: "Savings deposit",
        },
      })
      .expect(202);

    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe(NOTIFICATION_TYPES.TRANSACTION_ALERT);

    await notificationService.waitForBackgroundTasks();

    const notifications = await prisma.notification.findMany({
      where: {
        userId: context.users.admin.id,
        type: NOTIFICATION_TYPES.TRANSACTION_ALERT,
      },
    });

    expect(notifications).toHaveLength(1);
    expect(emailProvider.send).toHaveBeenCalledTimes(1);
    expect(notifications[0].message).toContain("MFI-TRX-001");
  });

  it("throttles duplicate transaction notifications inside the anti-spam window", async () => {
    const context = await seedNotificationActors();
    const user = {
      id: context.users.admin.id,
      email: context.users.admin.email,
    };
    const transaction = {
      id: "txn-duplicate",
      reference: "MFI-DUP-001",
      amount: 5000,
      currency: "USD",
      type: "TRANSFER",
      status: "PENDING",
    };

    await notificationService.notifyTransaction(user, transaction, {
      channels: ["email", "inApp"],
      organizationId: context.organization.id,
    });
    await notificationService.notifyTransaction(user, transaction, {
      channels: ["email", "inApp"],
      organizationId: context.organization.id,
    });

    await notificationService.waitForBackgroundTasks();

    const notifications = await prisma.notification.findMany({
      where: {
        userId: context.users.admin.id,
        type: NOTIFICATION_TYPES.TRANSACTION_ALERT,
      },
    });

    expect(notifications).toHaveLength(1);
    expect(emailProvider.send).toHaveBeenCalledTimes(1);
  });
});
