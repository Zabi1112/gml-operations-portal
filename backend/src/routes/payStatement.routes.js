const express = require("express");
const { protect, allowRoles } = require("../middleware/auth.middleware");
const { createPayStatementService } = require("../utils/payStatements");
function createPayStatementRouter(service, authenticate = protect) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use(authenticate, allowRoles("ADMIN", "MANAGER", "EDITOR"));
  const handle = (fn, status = 200) => async (req, res) => {
    try { res.status(status).json(await fn(req)); }
    catch (error) {
      if (!error.status) console.error("Pay statement operation failed:", error.code || error.name);
      res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to process pay statement. Please try again." });
    }
  };
  router.get("/", handle(req => service.list(req.query.branchId, req.query.page)));
  router.post("/preview", handle(req => service.preview(req.body || {})));
  router.post("/", handle(req => service.save(req.body || {}, req.user.id), 201));
  router.get("/:id", handle(req => service.detail(req.params.id, req.query.branchId)));
  router.patch("/:id", handle(req => service.save(req.body || {}, req.user.id, req.params.id)));
  return router;
}
module.exports = createPayStatementRouter(createPayStatementService(require("../utils/prisma")));
module.exports.createPayStatementRouter = createPayStatementRouter;
