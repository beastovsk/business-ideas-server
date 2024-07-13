const express = require("express");
const router = express.Router();
const userController = require("../../contollers/user.controller");

router.post("/changeEmail", userController.changeEmail);
router.get("/getUser", userController.getUser);
router.post("/changePassword", userController.changePassword);

module.exports = router;
