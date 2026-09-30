// Install only after /api/sales/tick has been deployed. Never print the worker secret.
const path=require('node:path');
const {randomBytes,createHash}=require('node:crypto');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
async function main(){
 if(!process.argv.includes('--apply')){console.log('Dry run: --apply installs Supabase pg_cron/pg_net, a Vault secret and a 2-second scheduler. Deploy the sales endpoint first.');return;}
 const url='https://portal.eastandwestlogistics.com/api/sales/tick';
 const response=await fetch(url,{method:'POST',redirect:'error'});if(response.status!==401)throw new Error('Deploy the protected Sales endpoint before installing the scheduler.');
 await db.$transaction(async tx=>{
 await tx.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_cron');
 await tx.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_net');
 await tx.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE');
 const saved=await tx.$queryRawUnsafe("SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='ewl_sales_worker_token' LIMIT 1");
 const token=saved[0]?.decrypted_secret||randomBytes(32).toString('hex');
 if(!saved.length)await tx.$queryRawUnsafe("SELECT vault.create_secret($1, 'ewl_sales_worker_token', 'Sales scheduler authentication')",token);
 await tx.salesWorker.update({where:{id:'main'},data:{tokenHash:createHash('sha256').update(token).digest('hex'),hosted:true}});
 await tx.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION public.ewl_sales_tick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
 BEGIN
 UPDATE public."SalesWorker" SET "schedulerAt"=CURRENT_TIMESTAMP WHERE id='main';
 IF EXISTS (SELECT 1 FROM public."SalesJob" WHERE status IN ('QUEUED','RUNNING') AND "availableAt"<=CURRENT_TIMESTAMP)
 AND EXISTS (SELECT 1 FROM public."SalesWorker" WHERE id='main' AND ("leaseUntil" IS NULL OR "leaseUntil"<CURRENT_TIMESTAMP) AND ("nextRequestAt" IS NULL OR "nextRequestAt"<=CURRENT_TIMESTAMP)) THEN
 PERFORM net.http_post(url := '${url}', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='ewl_sales_worker_token' LIMIT 1)), body := '{}'::jsonb, timeout_milliseconds := 30000);
 END IF;
 END; $$`);
 await tx.$executeRawUnsafe('REVOKE ALL ON FUNCTION public.ewl_sales_tick() FROM PUBLIC, anon, authenticated');
 await tx.$queryRawUnsafe("SELECT cron.schedule('ewl-sales-fetch', '2 seconds', 'SELECT public.ewl_sales_tick();')");
 await tx.$queryRawUnsafe("SELECT cron.schedule('ewl-sales-log-cleanup', '17 3 * * *', $$DELETE FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('ewl-sales-fetch','ewl-sales-log-cleanup')) AND end_time < now() - interval '2 days'$$)");
 },{timeout:30000});
 console.log('Sales background scheduler installed. No provider requests run until a range is started.');
}
main().catch(e=>{console.error('Scheduler installation failed:',e.code||e.name);process.exitCode=1;}).finally(()=>db.$disconnect());
