const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const { uploadLimiter } = require("../../middlewares/rateLimiter/uploadLimiter");
const { applySingleImageUpload } = require("./upload.middleware");
const uploadController = require("./upload.controller");

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles("ADMIN", "MANAGER"));

router.post("/", uploadLimiter, applySingleImageUpload, uploadController.uploadFile);
router.delete("/", uploadLimiter, uploadController.deleteUpload);

module.exports = router;
