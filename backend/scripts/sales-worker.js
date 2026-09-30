const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const {PrismaClient}=require('@prisma/client');
const {tick}=require('../src/sales/worker');
const db=new PrismaClient();let stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
(async()=>{console.log('Local Sales worker started. Close this process to stop local fetching.');while(!stopping){try{await db.salesWorker.update({where:{id:'main'},data:{schedulerAt:new Date()}});await tick(db);}catch(e){console.error('Sales worker temporarily unavailable:',e.code||e.name);}await new Promise(resolve=>setTimeout(resolve,2000));}await db.$disconnect();})().catch(()=>{process.exitCode=1;});
