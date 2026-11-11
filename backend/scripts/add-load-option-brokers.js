const fs=require('fs'),path=require('path');require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{if(!process.argv.includes('--apply')){console.log('Use --apply to create the broker directory and insert 20 starter records.');return;}
 const sql=fs.readFileSync(path.join(__dirname,'../prisma/migrations/add_load_option_brokers/migration.sql'),'utf8');
 await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(48291486)');for(const statement of sql.split(';').map(x=>x.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);
 for(const data of require('./load-option-broker-seeds')){const exists=await tx.loadOptionBroker.findFirst({where:{OR:[{name:data.name},{mc:data.mc}]}});if(!exists)await tx.loadOptionBroker.create({data});}
 },{timeout:60000});console.log('Broker directory ready; 20 starter entries checked. Existing records preserved.');
})().catch(e=>{console.error('Broker setup failed:',e.code||e.name);process.exitCode=1;}).finally(()=>db.$disconnect());
