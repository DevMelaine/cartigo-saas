const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const organizationController = require("../controllers/organizationController");

const router = express.Router();

router.use(authMiddleware);
router.get("/me", authorizeRoles("ADMIN", "MANAGER"), organizationController.getMyOrganization);
router.put("/me", authorizeRoles("ADMIN", "MANAGER"), organizationController.updateMyOrganization);

module.exports = router;
