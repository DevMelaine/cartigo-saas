const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")

router.post("/register-organization", authController.registerOrganization)
router.post("/login", authController.login)

module.exports = router