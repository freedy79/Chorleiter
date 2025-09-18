const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/publisher.controller");
const router = require("express").Router();
const role = require("../middleware/role.middleware");
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.post("/", role.requireNonDemo, wrap(controller.create));
router.get("/", wrap(controller.findAll));
router.put("/:id", role.requireNonDemo, wrap(controller.update));
router.delete("/:id", role.requireNonDemo, wrap(controller.delete));

module.exports = router;
