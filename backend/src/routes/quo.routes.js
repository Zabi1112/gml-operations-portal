const express=require('express');const {createHash,timingSafeEqual}=require('node:crypto');const {protect,allowRoles}=require('../middleware/auth.middleware');const {createQuoService}=require('../quo/service');const {tickQuo}=require('../quo/worker');
function createQuoRouter(db,authenticate=protect,fetcher=fetch){const router=express.Router(),service=createQuoService(db,fetcher);router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});const handle=fn=>async(req,res)=>{try{res.json(await fn(req));}catch(e){if(!e.status)console.error('Quo operation failed:',e.code||e.name);res.status(e.status||500).json({message:e.status?e.message:'Unable to complete the messaging operation. Try again.'});}};
router.post('/tick',async(req,res)=>{try{const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(token))return res.sendStatus(401);const w=await db.salesWorker.findUnique({where:{id:'main'},select:{tokenHash:true}});const expected=Buffer.from(w?.tokenHash||'','hex'),actual=createHash('sha256').update(token).digest();if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return res.sendStatus(401);res.json(await tickQuo(db,fetcher));}catch{res.status(503).json({message:'Message worker temporarily unavailable.'});}});
router.use(authenticate,allowRoles('ADMIN','MANAGER'));
router.get('/',handle(req=>service.dashboard(req.query.branchId,req.query.listPage)));
router.post('/connection',handle(req=>service.connect(req.body||{})));
router.post('/preview',handle(req=>service.preview(req.body||{})));
router.post('/campaigns',handle(req=>service.create(req.body||{},req.user.id)));
router.get('/campaigns/:id',handle(req=>service.detail(req.params.id,req.query.branchId,req.query.page)));
router.post('/campaigns/:id/control',handle(req=>service.control(req.params.id,req.body||{})));
router.get('/campaigns/:id/recipients/:recipientId/messages',handle(req=>service.history(req.params.id,req.params.recipientId,req.query.branchId)));
return router;}
module.exports=createQuoRouter(require('../utils/prisma'));module.exports.createQuoRouter=createQuoRouter;
