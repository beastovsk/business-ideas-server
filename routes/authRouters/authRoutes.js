const express = require("express");
const router = express.Router();
const authController = require("../../contollers/auth.controller");

router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/confirmEmail", authController.confirmEmail);
router.post("/sendResetCode", authController.sendResetCode);
router.post("/resetPassword", authController.resetPassword);
router.post("/supportRequest", authController.supportRequest);


module.exports = router;
