const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/collection.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);
router.post("/", controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.post("/:id/addToChoir", controller.addToChoir); // Crucial endpoint
module.exports = router;