const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/composer.controller");
const router = require("express").Router();
const role = require("../middleware/role.middleware");
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.post("/", role.requireNonDemo, wrap(controller.create));
router.get("/", wrap(controller.findAll));
router.get("/duplicates", wrap(controller.findDuplicates));
router.post("/migrate", role.requireNonDemo, wrap(controller.migrate));
router.put("/:id", role.requireNonDemo, wrap(controller.update));
router.delete("/:id", role.requireNonDemo, wrap(controller.delete));
router.post("/:id/enrich", role.requireNonDemo, wrap(controller.enrich));

module.exports = router;