const controller = require("../controllers/paypal.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

// Public route - no authentication required
// This is called when PayPal redirects back after a donation
router.get('/pdt', wrap(controller.verifyPDT));
router.get('/donations/summary', wrap(controller.getDonationSummary));

module.exports = router;
