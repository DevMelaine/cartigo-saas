const NOTIFICATION_TYPES = {
  ORDER_PAID: "ORDER_PAID",
  ORDER_READY: "ORDER_READY",
  LOW_STOCK: "LOW_STOCK",
};

const NOTIFICATION_EVENT_CONFIG = {
  [NOTIFICATION_TYPES.ORDER_PAID]: {
    type: NOTIFICATION_TYPES.ORDER_PAID,
    userRoles: ["ADMIN", "MANAGER", "CASHIER"],
    includeCustomer: true,
    buildEventKey: ({ orderId }) => `order:${orderId}:paid`,
    buildUserTitle: () => "Order paid",
    buildUserMessage: ({ orderId }) => `Order ${orderId} has been paid successfully.`,
    buildCustomerTitle: () => "Payment confirmed",
    buildCustomerMessage: ({ orderId }) => `Your payment for order ${orderId} has been confirmed.`,
  },
  [NOTIFICATION_TYPES.ORDER_READY]: {
    type: NOTIFICATION_TYPES.ORDER_READY,
    userRoles: ["ADMIN", "MANAGER", "STAFF"],
    includeCustomer: true,
    buildEventKey: ({ orderId }) => `order:${orderId}:ready`,
    buildUserTitle: () => "Order ready",
    buildUserMessage: ({ orderId }) => `Order ${orderId} is ready for delivery.`,
    buildCustomerTitle: () => "Order ready",
    buildCustomerMessage: ({ orderId }) => `Your order ${orderId} is ready for delivery.`,
  },
  [NOTIFICATION_TYPES.LOW_STOCK]: {
    type: NOTIFICATION_TYPES.LOW_STOCK,
    userRoles: ["ADMIN", "MANAGER", "STAFF"],
    includeCustomer: false,
    buildEventKey: ({ productId, quantity }) => `product:${productId}:low-stock:${quantity}`,
    buildUserTitle: () => "Low stock alert",
    buildUserMessage: ({ productName, quantity }) => `${productName} is low on stock (${quantity} remaining).`,
  },
};

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_EVENT_CONFIG,
};
