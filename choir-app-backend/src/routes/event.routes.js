const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/event.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/last", controller.findLast);
router.post("/", controller.create); 
// Later you will add POST for creation: router.post("/", controller.create);

module.exports = router;