const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/monthlyPlan.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(auth.verifyToken);

// Specific ID-based routes must be defined before the year/month route to
// avoid conflicts like GET /1/pdf being handled as year=1, month='pdf'.
router.get("/:id/pdf", wrap(controller.downloadPdf));
router.post("/:id/email", role.requireChoirAdmin, wrap(controller.emailPdf));
router.post("/:id/request-availability", role.requireChoirAdmin, wrap(controller.requestAvailability));
router.get("/:year/:month", wrap(controller.findByMonth));
router.post("/", role.requireChoirAdmin, wrap(controller.create));
router.put("/:id/finalize", role.requireChoirAdmin, wrap(controller.finalize));
router.put("/:id/reopen", role.requireChoirAdmin, wrap(controller.reopen));

module.exports = router;
