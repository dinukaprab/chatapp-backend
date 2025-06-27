const express = require("express");
const authRouterV1 = require("./v1/auth.routes");
// const authRouterV2 = require('./v2/auth.routes');

const router = express.Router();

router.use("/v1", authRouterV1);
// router.use('/v2', authRouterV2);

module.exports = router;
