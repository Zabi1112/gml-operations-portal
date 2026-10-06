const path=require('path');require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
 if(!process.argv.includes('--apply')){console.log('Use --apply after deploying /api/quo/tick. Installs a separate 10-second Quo scheduler.');return;}
 const response=await fetch('https://portal.eastandwestlogistics.com/api/quo/tick',{method:'POST',redirect:'error'});if(response.status!==401)throw new Error('Deploy the protected Quo worker endpoint first.');
 const [vault]=await db.$queryRawUnsafe("SELECT count(*)::integer AS count FROM vault.decrypted_secrets WHERE name='ewl_sales_worker_token'");if(vault.count!==1)throw new Error('Existing background worker authentication must be configured first.');
 await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION public.ewl_quo_tick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 UPDATE public."QuoWorker" SET "schedulerAt"=clock_timestamp() WHERE id='main';
 IF (EXISTS (SELECT 1 FROM public."QuoCampaign" WHERE status='RUNNING') OR EXISTS (SELECT 1 FROM public."QuoRecipient" WHERE status='SENDING' AND "startedAt"<now()-interval '90 seconds')) AND EXISTS (SELECT 1 FROM public."QuoWorker" WHERE id='main' AND ("leaseUntil" IS NULL OR "leaseUntil"<now()) AND ("nextRequestAt" IS NULL OR "nextRequestAt"<=now())) THEN
 PERFORM net.http_post(url:='https://portal.eastandwestlogistics.com/api/quo/tick',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='ewl_sales_worker_token' LIMIT 1)),body:='{}'::jsonb,timeout_milliseconds:=30000);
 END IF; END; $$`);
 await db.$executeRawUnsafe('REVOKE ALL ON FUNCTION public.ewl_quo_tick() FROM PUBLIC,anon,authenticated');
 await db.$queryRawUnsafe("SELECT cron.schedule('ewl-quo-messages','10 seconds','SELECT public.ewl_quo_tick();')");
 await db.$queryRawUnsafe("SELECT cron.schedule('ewl-quo-log-cleanup','23 3 * * *',$$DELETE FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('ewl-quo-messages','ewl-quo-log-cleanup')) AND end_time<now()-interval '2 days'$$)");
 console.log('Separate Quo background scheduler installed. Drafts cannot send; a user must explicitly start a reviewed campaign.');
})().catch(e=>{console.error('Quo scheduler failed:',e.code||e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
