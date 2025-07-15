const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/category.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.post("/", wrap(controller.create));
router.get("/", wrap(controller.findAll));

module.exports = router;