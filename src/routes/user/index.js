const express = require("express");
const userRouterV1 = require("./v1/user.routes");
// const userRouterV2 = require('./v2/user.routes');

const router = express.Router();

router.use("/v1", userRouterV1);
// router.use('/v2', userRouterV2);

module.exports = router;
