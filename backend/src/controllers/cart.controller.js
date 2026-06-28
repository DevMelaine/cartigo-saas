const CartService = require("../services/cart.service");

class CartController {

  static async addItem(req, res) {
    try {

      const { productId, quantity } = req.body;

      const result = await CartService.addToCart({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId,
        productId,
        quantity
      });

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getCart(req, res) {
    try {

      const cart = await CartService.getCart({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId
      });

      return res.json({
        success: true,
        data: cart
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateItem(req, res) {
    try {

      const { quantity } = req.body;

      const result = await CartService.updateCartItem({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId,
        itemId: req.params.id,
        quantity
      });

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async removeItem(req, res) {
    try {

      await CartService.removeCartItem({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId,
        itemId: req.params.id
      });

      return res.json({
        success: true,
        message: "item removed"
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async clearCart(req, res) {
    try {

      await CartService.clearCart({
        customerId: req.customer.customerId,
        organizationId: req.customer.organizationId
      });

      return res.json({
        success: true,
        message: "cart cleared"
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

}

module.exports = CartController;
