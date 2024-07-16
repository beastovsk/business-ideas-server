const express = require("express");
const router = express.Router();

const authController = require("../contollers/auth.controller");
const userController = require("../contollers/user.controller");
const productController = require("../contollers/product.controller")
const operationController = require("../contollers/operation.controller")

router.post("/auth/login", authController.login);
router.post("/auth/register", authController.register);
router.post("/auth/confirmEmail", authController.confirmEmail);
router.post("/auth/sendResetCode", authController.sendResetCode);
router.post("/auth/resetPassword", authController.resetPassword);
router.post("/auth/supportRequest", authController.supportRequest);
router.post("/user/changeEmail", userController.changeEmail);
router.get("/user/getUser", userController.getUser);
router.post("/user/changePassword", userController.changePassword);
router.get("/user/getUser", userController.getUser);
router.get("/product/getAllProducts", productController.getAllProducts);
router.get("/product/getProductById/:id", productController.getProductById);
router.delete('/product/deleteProductById/:id', productController.deleteProductById);
router.get("/operation/latestOperations", operationController.getAllOperations);

module.exports = router;
