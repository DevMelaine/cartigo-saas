const express = require("express");
const publicController = require("../controllers/public.controller");

const router = express.Router();

router.get("/categories", publicController.listCategories);
router.get("/organizations", publicController.listOrganizations);
router.get("/organizations/:organizationId", publicController.getOrganization);
router.get("/organizations/:organizationId/products", publicController.listOrganizationProducts);
router.get("/products/:productId", publicController.getProduct);

module.exports = router;
