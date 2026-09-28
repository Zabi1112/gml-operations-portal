
const express = require("express");
const { protect, allowRoles } = require("../middleware/auth.middleware");
const { createInterviewService } = require("../utils/interviews");
function createInterviewRouter(service, authenticate = protect) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); res.set("Referrer-Policy", "no-referrer"); next(); });
  router.use(express.json({ limit: "4mb" }));
  const handle = (fn, status = 200) => async (req, res) => {
    try { res.status(status).json(await fn(req)); }
    catch (error) {
      if (!error.status) console.error("Interview operation failed:", error.code || error.name);
      res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to process assessment. Please try again." });
    }
  };
  router.get("/public/:token", handle(req => service.publicGet(req.params.token)));
  router.post("/public/:token/submit", handle(req => service.submit(req.params.token, req.body || {})));
  router.use(authenticate, allowRoles("ADMIN", "MANAGER"));
  router.get("/", handle(req => service.list(req.query.branchId, req.query.page)));
  router.post("/", handle(req => service.create(req.body || {}, req.user.id), 201));
  router.get("/:id", handle(req => service.detail(req.params.id, req.query.branchId)));
  router.get("/:id/audio/:index", async (req, res) => {
    try { const audio = await service.audio(req.params.id, req.query.branchId, req.params.index); res.type(audio.mimeType).send(Buffer.from(audio.data)); }
    catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to load recording." }); }
  });
  router.post("/:id/review", handle(req => service.review(req.params.id, req.query.branchId, req.body || {}, req.user.id)));
  router.delete("/:id", handle(req => service.remove(req.params.id, req.query.branchId)));
  router.use((error, req, res, next) => {
    if (error.type === "entity.too.large") return res.status(413).json({ message: "Recordings are too large. Please record shorter responses and try again." });
    if (error.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid submission data." });
    next(error);
  });
  return router;
}
module.exports = createInterviewRouter(createInterviewService(require("../utils/prisma")));
module.exports.createInterviewRouter = createInterviewRouter;
