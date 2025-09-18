const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/category.controller");
const router = require("express").Router();
const role = require("../middleware/role.middleware");
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.post("/", role.requireNonDemo, wrap(controller.create));
router.get("/", wrap(controller.findAll));

module.exports = router;