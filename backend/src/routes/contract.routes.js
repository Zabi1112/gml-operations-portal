const express = require("express");
const { protect, allowRoles } = require("../middleware/auth.middleware");
const { createContractService } = require("../utils/contracts");
function createContractRouter(service, authenticate = protect) {
const router = express.Router();
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  next();
});
const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (error) {
    if (!error.status) console.error("Contract operation failed:", error.code || error.name);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to process agreement. Please try again." });
  }
};
router.get("/public/:token", handle(req => service.publicGet(req.params.token)));
router.post("/public/:token/respond", handle(req => service.respond(req.params.token, req.body || {})));
router.use(authenticate, allowRoles("ADMIN", "MANAGER", "EDITOR"));
router.get("/", handle(req => service.list(req.query.branchId)));
router.post("/", handle(req => service.create(req.body || {}, req.user.id), 201));
router.get("/:id", handle(req => service.detail(req.params.id, req.query.branchId)));
router.post("/:id/cancel", handle(req => service.cancel(req.params.id, req.body?.branchId)));
return router;
}
module.exports = createContractRouter(createContractService(require("../utils/prisma")));
module.exports.createContractRouter = createContractRouter;
