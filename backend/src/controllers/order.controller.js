const OrderService = require("../services/order.service");

class OrderController {

  static async checkout(req, res) {
    try {

      const order = await OrderService.checkout({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId
      });

      return res.json({
        success: true,
        data: order
      });

    } catch (error) {

      return res.status(400).json({
        success: false,
        message: error.message
      });

    }
  }

  static async getMyOrders(req, res) {
    try {

      const orders = await OrderService.getCustomerOrders({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId
      });

      return res.json({
        success: true,
        data: orders
      });

    } catch (error) {

      return res.status(400).json({
        success: false,
        message: error.message
      });

    }
  }

  static async getOrder(req, res) {
    try {

      const order = await OrderService.getOrderById({
        orderId: req.params.id,
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId
      });

      return res.json({
        success: true,
        data: order
      });

    } catch (error) {

      return res.status(404).json({
        success: false,
        message: error.message
      });

    }
  }

}

module.exports = OrderController;
