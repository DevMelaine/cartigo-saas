const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const invitationController = require("../controllers/invitation.controller");

const router = express.Router();

router.post("/accept", invitationController.acceptInvitation);

router.use(authMiddleware);
router.use(authorizeRoles("ADMIN", "MANAGER"));

router.post("/", invitationController.createInvitation);
router.get("/", invitationController.listInvitations);

module.exports = router;
