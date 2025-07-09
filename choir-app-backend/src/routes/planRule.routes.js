const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/planRule.controller");
const router = require("express").Router();

router.use(auth.verifyToken);

router.get("/", controller.findAll);
router.post("/", role.requireChoirAdmin, controller.create);
router.put("/:id", role.requireChoirAdmin, controller.update);
router.delete("/:id", role.requireChoirAdmin, controller.delete);

module.exports = router;
