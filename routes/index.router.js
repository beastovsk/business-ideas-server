const express = require("express");
const router = express.Router();
const userRouter = require("./userRoutes/userRoutes")
const authRouter = require("./authRouters/authRoutes")

router.post("/auth", authRouter);
router.post("/user", userRouter);


module.exports = router;
