const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/repertoire-filter.controller");
const router = require("express").Router();
const role = require("../middleware/role.middleware");
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.get("/", wrap(controller.list));
router.post("/", role.requireNonDemo, wrap(controller.save));
router.delete("/:id", role.requireNonDemo, wrap(controller.delete));

module.exports = router;
