const express=require('express');
const {createHash,timingSafeEqual}=require('node:crypto');
const {protect,allowRoles}=require('../middleware/auth.middleware');
const db=require('../utils/prisma');
const {createSalesService}=require('../sales/service');
const {tick}=require('../sales/worker');
function createSalesRouter(database=db,authenticate=protect){
 const router=express.Router(),service=createSalesService(database);
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
 const handle=fn=>async(req,res)=>{try{res.json(await fn(req));}catch(e){if(!e.status)console.error('Sales operation failed:',e.code||e.name);res.status(e.status||500).json({message:e.status?e.message:'Unable to complete the sales operation. Please try again.'});}};
 router.post('/tick',async(req,res)=>{try{const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(token))return res.sendStatus(401);const worker=await database.salesWorker.findUnique({where:{id:'main'},select:{tokenHash:true}});const expected=Buffer.from(worker?.tokenHash||'','hex'),actual=createHash('sha256').update(token).digest();if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return res.sendStatus(401);res.json(await tick(database));}catch{res.status(503).json({message:'Worker temporarily unavailable.'});}});
 router.use(authenticate,allowRoles('ADMIN','MANAGER','EDITOR'));
 router.get('/',handle(req=>service.dashboard(req.query.branchId,req.query.jobPage,req.query.listPage)));
 router.post('/jobs',allowRoles('ADMIN','MANAGER'),handle(req=>service.create(req.body,req.user)));
 router.post('/jobs/:id/:action',allowRoles('ADMIN','MANAGER'),handle(req=>service.control(req.params.id,req.query.branchId,req.params.action,req.body)));
 router.get('/jobs/:id/reviews',handle(req=>service.reviews(req.params.id,req.query.branchId,req.query.page)));
 router.get('/lists/:id/leads',handle(req=>service.leads(req.params.id,req.query.branchId,req.query)));
 router.get('/lists/:id/export',async(req,res)=>{try{const result=await service.export(req.params.id,req.query.branchId);res.set('Content-Disposition','attachment; filename="'+result.filename+'"').type('text/csv').send(result.csv);}catch(e){res.status(e.status||500).json({message:e.status?e.message:'Export failed.'});}});
 router.get('/leads/:id',handle(req=>service.detail(req.params.id,req.query.branchId)));
 router.patch('/leads/:id',handle(req=>service.update(req.params.id,req.query.branchId,req.body)));
 router.post('/leads/:id/contact',handle(req=>service.contact(req.params.id,req.query.branchId,req.user,req.body.requestId)));
 router.post('/leads/:id/undo',handle(req=>service.contact(req.params.id,req.query.branchId,req.user,req.body.requestId,true)));
 return router;
}
module.exports=createSalesRouter();module.exports.createSalesRouter=createSalesRouter;
