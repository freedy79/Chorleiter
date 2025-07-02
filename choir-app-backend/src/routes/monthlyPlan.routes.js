const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/monthlyPlan.controller");
const router = require("express").Router();

router.use(auth.verifyToken);

router.get(":year/:month", controller.findByMonth);
router.post("/", auth.isChoirAdminOrAdmin, controller.create);
router.put(":id/finalize", auth.isChoirAdminOrAdmin, controller.finalize);
router.put(":id/reopen", auth.isChoirAdminOrAdmin, controller.reopen);

module.exports = router;
