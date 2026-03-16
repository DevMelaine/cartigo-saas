const express = require("express");
const actorAuth = require("../middlewares/actorAuth.middleware");
const organizationCategoryController = require("../controllers/organizationCategory.controller");

const router = express.Router();

router.use(actorAuth);

/**
 * @swagger
 * /api/organization-categories:
 *   get:
 *     tags: [OrganizationCategories]
 *     summary: List predefined organization categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization categories returned successfully
 *       401:
 *         description: Authentication required
 */
router.get("/", organizationCategoryController.listCategories);

module.exports = router;
