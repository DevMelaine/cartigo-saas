const express = require("express");
const CartController = require("../controllers/cart.controller");
const validate = require("../middlewares/validate");
const customerAuth = require("../middlewares/customerAuth.middleware");

const {
  addItemSchema,
  updateCartItemSchema
} = require("../validators/cart.validator");

const router = express.Router();

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add a product to the authenticated customer's cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Invalid request or cart rule violation
 *       401:
 *         description: Customer authentication required
 */
router.post(
  "/items",
  customerAuth,
  validate(addItemSchema),
  CartController.addItem
);

/**
 * @swagger
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the authenticated customer's cart for the current organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *       401:
 *         description: Customer authentication required
 */
router.get(
  "/",
  customerAuth,
  CartController.getCart
);

/**
 * @swagger
 * /api/cart/items/{id}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update the quantity of a cart item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart item updated
 *       400:
 *         description: Invalid quantity or business rule violation
 *       401:
 *         description: Customer authentication required
 *       404:
 *         description: Cart item not found
 */
router.patch(
  "/items/:id",
  customerAuth,
  validate(updateCartItemSchema),
  CartController.updateItem
);

/**
 * @swagger
 * /api/cart/items/{id}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove one item from the authenticated customer's cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cart item removed
 *       401:
 *         description: Customer authentication required
 *       404:
 *         description: Cart item not found
 */
router.delete(
  "/items/:id",
  customerAuth,
  CartController.removeItem
);

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear the authenticated customer's cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Customer authentication required
 */
router.delete(
  "/",
  customerAuth,
  CartController.clearCart
);

module.exports = router;
