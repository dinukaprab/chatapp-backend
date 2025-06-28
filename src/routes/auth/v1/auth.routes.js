const express = require("express");
const router = express.Router();
const authController = require("../../../controllers/auth/v1/auth.controller");

router.post("/register", authController.register);
router.get("/check-username", authController.checkUsername);
router.post("/create-username", authController.createUsername);
router.post("/login", authController.login);
router.post("/send-login-otp", authController.sendLoginOtp);
router.post("/verify-login-otp", authController.verifyLoginOtp);
router.get("/check-auth", authController.checkAuth);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post(
  "/verify-forgot-password-otp",
  authController.verifyForgotPasswordOtp
);
router.post("/create-new-password", authController.createNewPassword);

module.exports = router;
