const express = require("express")
const router = express.Router()
const authMiddleware = require("../middlewares/authMiddleware")

/**
 * @swagger
 * /api/test/protected:
 *   get:
 *     tags: [Test]
 *     summary: Test protected endpoint for JWT middleware verification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access granted
 *       401:
 *         description: Authentication required
 */
router.get("/protected", authMiddleware, (req, res) => {
  res.json({
    message: "Access granted",
    user: req.user
  })
})

module.exports = router
