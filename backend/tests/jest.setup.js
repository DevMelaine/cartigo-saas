const prisma = require("../src/lib/prisma");

global.prisma = prisma;

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  const tables = [
    "DeviceToken",
    "Notification",
    "DeliveryJob",
    "OrderAuditLog",
    "Payment",
    "OrderItem",
    "Order",
    "CartItem",
    "Cart",
    "Inventory",
    "Product",
    "Category",
    "RefreshToken",
    "CustomerRefreshToken",
    "RefreshCustomerToken",
    "CustomerAuditLog",
    "User",
    "Customer",
    "Organization",
    "OrganizationCategory"
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
