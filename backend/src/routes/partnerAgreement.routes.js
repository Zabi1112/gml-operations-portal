const express = require('express');
const { protect, allowRoles } = require('../middleware/auth.middleware');
const { createPartnerService } = require('../partners/service');
function createPartnerRouter(service, authenticate = protect) {
 const router = express.Router();
 router.use((req,res,next) => { res.set('Cache-Control','no-store'); res.set('Referrer-Policy','no-referrer'); res.set('X-Content-Type-Options','nosniff'); next(); });
 router.use(express.json({ limit: '3mb' }));
 const handle = (fn, status = 200) => async (req,res) => {
  try { res.status(status).json(await fn(req)); }
  catch(e) { if (!e.status) console.error('Partner agreement failed:',e.code || e.name); res.status(e.status || 500).json({ message: e.status ? e.message : 'Unable to process the partner agreement. Please try again.' }); }
 };
 router.get('/public/:token',handle(req => service.publicGet(req.params.token)));
 router.post('/public/:token/respond',handle(req => service.respond(req.params.token,req.body || {})));
 router.use(authenticate,allowRoles('ADMIN'));
 router.post('/preview',handle(req => service.preview(req.body || {})));
 router.get('/',handle(req => service.list(req.query.branchId)));
 router.post('/',handle(req => service.create(req.body || {},req.user.id),201));
 router.get('/:id',handle(req => service.detail(req.params.id,req.query.branchId)));
 router.post('/:id/cancel',handle(req => service.cancel(req.params.id,req.body?.branchId)));
 router.get('/:id/identity/:role',handle(async req => {
  const p = await service.identity(req.params.id,req.query.branchId,req.params.role);
  return { documentType:p.documentType || 'PASSPORT',number:p.number,country:p.country };
 }));
 router.get('/:id/passport/:role',async (req,res) => {
  try {
   const p = await service.identity(req.params.id,req.query.branchId,req.params.role);
   const extension = { 'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg' }[p.mime];
   res.set('Access-Control-Expose-Headers','Content-Disposition');
   res.set('Content-Type','application/octet-stream');
   res.set('Content-Disposition',`attachment; filename="${p.documentType === 'DRIVING_LICENSE' ? 'driving-licence' : 'passport'}-${req.params.role}.${extension}"`);
   res.send(Buffer.from(p.base64,'base64'));
  } catch(e) { res.status(e.status || 500).json({message:e.status ? e.message : 'Unable to retrieve private identity document.'}); }
 });
 router.use((err,req,res,next) => { if (err.type === 'entity.too.large') return res.status(413).json({message:'Identity document uploads are limited to 2 MB.'}); if(err instanceof SyntaxError) return res.status(400).json({message:'Invalid request.'}); next(err); });
 return router;
}
module.exports = createPartnerRouter(createPartnerService(require('../utils/prisma')));
module.exports.createPartnerRouter = createPartnerRouter;
