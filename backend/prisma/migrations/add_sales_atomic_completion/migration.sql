CREATE OR REPLACE FUNCTION public.ewl_sales_finish(p_job integer, p_mc integer, p_owner text, p_result jsonb)
RETURNS boolean LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
 w public."SalesWorker"%ROWTYPE;
 j public."SalesJob"%ROWTYPE;
 l public."SalesList"%ROWTYPE;
 outcome text := p_result->>'outcome';
 reason text := p_result->>'reason';
 d jsonb := p_result->'details';
 bucket integer;
 counts jsonb;
 stamp timestamp := clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
 SELECT * INTO w FROM public."SalesWorker" WHERE id='main' FOR UPDATE;
 IF NOT FOUND OR w.owner IS DISTINCT FROM p_owner OR w."leaseUntil" IS NULL OR w."leaseUntil" < (clock_timestamp() AT TIME ZONE 'UTC') THEN RETURN false; END IF;
 SELECT * INTO j FROM public."SalesJob" WHERE id=p_job FOR UPDATE;
 IF NOT FOUND OR j.status NOT IN ('QUEUED','RUNNING') OR j."nextMc"<>p_mc THEN RETURN false; END IF;
 IF NOT EXISTS (SELECT 1 FROM public."Branch" WHERE id=j."branchId" AND "isActive") THEN
 UPDATE public."SalesJob" SET status='PAUSED', "lastError"='Branch is archived.', "updatedAt"=stamp WHERE id=p_job;
 RETURN false;
 END IF;
 IF outcome='ACCEPTED' THEN
 IF EXISTS (SELECT 1 FROM public."SalesLead" WHERE "branchId"=j."branchId" AND mc=p_mc) THEN outcome:='DUPLICATE';
 ELSE
 bucket := j.accepted / 1000 + 1;
 INSERT INTO public."SalesList" ("jobId",ordinal,"startMc","endMc") VALUES (p_job,bucket,p_mc,p_mc) ON CONFLICT ("jobId",ordinal) DO NOTHING;
 SELECT * INTO l FROM public."SalesList" WHERE "jobId"=p_job AND ordinal=bucket FOR UPDATE;
 INSERT INTO public."SalesLead" ("branchId","listId",mc,usdot,name,phone,email,address,details)
 VALUES (j."branchId",l.id,p_mc,d->>'usdot',d->>'name',NULLIF(d->>'phone',''),NULLIF(d->>'email',''),d->>'address',d);
 UPDATE public."SalesList" SET count=count+1,"endMc"=p_mc WHERE id=l.id;
 END IF;
 ELSIF outcome='REVIEW' THEN
 INSERT INTO public."SalesReview" ("jobId",mc,reason,details) VALUES (p_job,p_mc,reason,d);
 END IF;
 IF outcome NOT IN ('ACCEPTED','DUPLICATE','REVIEW','EXCLUDED','MISSING') OR outcome IS NULL THEN RAISE EXCEPTION 'Unknown carrier outcome'; END IF;
 counts:=j.reasons;
 IF reason IS NOT NULL AND reason<>'' THEN counts:=jsonb_set(counts,ARRAY[reason],to_jsonb(COALESCE((counts->>reason)::integer,0)+1)); END IF;
 UPDATE public."SalesJob" SET
 accepted=accepted+CASE WHEN outcome='ACCEPTED' THEN 1 ELSE 0 END,
 duplicates=duplicates+CASE WHEN outcome='DUPLICATE' THEN 1 ELSE 0 END,
 "needsReview"="needsReview"+CASE WHEN outcome='REVIEW' THEN 1 ELSE 0 END,
 excluded=excluded+CASE WHEN outcome='EXCLUDED' THEN 1 ELSE 0 END,
 missing=missing+CASE WHEN outcome='MISSING' THEN 1 ELSE 0 END,
 processed=processed+1,"nextMc"=p_mc+1,
 status=CASE WHEN p_mc=j."endMc" THEN 'COMPLETED' ELSE 'RUNNING' END,
 "encryptedKey"=CASE WHEN p_mc=j."endMc" THEN NULL ELSE "encryptedKey" END,
 "retryCount"=0,"lastError"=NULL,reasons=counts,"availableAt"=stamp,"updatedAt"=stamp
 WHERE id=p_job;
 RETURN true;
END;
$$;
