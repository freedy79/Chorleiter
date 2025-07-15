const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/stats.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.get('/', wrap(controller.overview));

module.exports = router;
