
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const userController = require("../controllers/userController");

// all routes require authentication
router.use(authMiddleware);

// create user - only ADMIN
router.post("/", authorizeRoles("ADMIN"), userController.createUser);

// list users - ADMIN and MANAGER can view
router.get("/", authorizeRoles("ADMIN", "MANAGER"), userController.listUsers);

// get single user
router.get("/:id", authorizeRoles("ADMIN", "MANAGER"), userController.getUser);

// update user - only ADMIN
router.put("/:id", authorizeRoles("ADMIN"), userController.updateUser);

// delete (soft) user - only ADMIN
router.delete("/:id", authorizeRoles("ADMIN"), userController.deleteUser);

module.exports = router;
