const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/availability.controller");
const router = require("express").Router();

router.use(auth.verifyToken);

router.get("/:year/:month/all", role.requireChoirAdmin, controller.findAllByMonth);
router.get("/:year/:month", controller.findByMonth);
router.put("/", controller.setAvailability);

module.exports = router;
