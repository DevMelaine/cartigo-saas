const OrderService = require("../services/order.service");
const { listOrdersSchema, updateOrderStatusSchema } = require("../validators/order.validator");

class OrderController {
  static async getOverview(req, res) {
    try {
      const overview = await OrderService.getOrganizationOrderOverview({
        organizationId: req.user.organizationId,
      });

      return res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Unable to fetch order overview.",
      });
    }
  }

  static async getSalesTrend(req, res) {
    try {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;

      if (Number.isNaN(days) || days < 7 || days > 90) {
        return res.status(400).json({
          success: false,
          message: "Days must be between 7 and 90.",
        });
      }

      const trend = await OrderService.getOrganizationSalesTrend({
        organizationId: req.user.organizationId,
        days,
      });

      return res.status(200).json({
        success: true,
        data: trend,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Unable to fetch sales trend.",
      });
    }
  }

  /**
   * Creates a storefront order for the authenticated customer.
   */
  static async checkout(req, res) {
    try {
      const order = await OrderService.checkout({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId,
      });

      return res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Lists orders for organization users with pagination and status filtering.
   */
  static async listOrders(req, res) {
    try {
      const { error, value } = listOrdersSchema.validate(req.query, {
        abortEarly: false,
        convert: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid order listing filters.",
          errors: error.details.map((detail) => detail.message),
        });
      }

      if (value.organizationId && value.organizationId !== req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      const result = await OrderService.listOrganizationOrders({
        organizationId: req.user.organizationId,
        filters: value,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Unable to list orders.",
      });
    }
  }

  /**
   * Lists customer-owned orders in the storefront area.
   */
  static async getMyOrders(req, res) {
    try {
      const orders = await OrderService.getCustomerOrders({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId,
      });

      return res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Returns one customer-owned order.
   */
  static async getOrder(req, res) {
    try {
      const order = await OrderService.getOrderById({
        orderId: req.params.id,
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId,
      });

      return res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Returns one organization-owned order for the dashboard.
   */
  static async getOrganizationOrder(req, res) {
    try {
      const order = await OrderService.getOrganizationOrderById({
        orderId: req.params.id,
        organizationId: req.user.organizationId,
      });

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Unable to fetch order details.",
      });
    }
  }

  /**
   * Updates an organization order status while enforcing RBAC and lifecycle rules.
   */
  static async updateStatus(req, res) {
    try {
      const { error, value } = updateOrderStatusSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status payload.",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const order = await OrderService.updateOrderStatus({
        orderId: req.params.id,
        organizationId: req.user.organizationId,
        userId: req.user.userId,
        role: req.user.role,
        nextStatus: value.status,
      });

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Unable to update order status.",
      });
    }
  }
}

module.exports = OrderController;
