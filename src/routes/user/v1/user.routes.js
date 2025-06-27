const express = require("express");
const router = express.Router();
const userController = require("../../../controllers/user/v1/user.controller");
const authenticateToken = require("../../../middlewares/auth.middleware");

router.get(
  "/check-username-is-created",
  authenticateToken,
  userController.checkUsernameCreated
);

module.exports = router;
