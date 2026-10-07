-- Authorization integration fixtures only. Always rollback; this is not an Auth login simulation.
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('00000000-0000-4000-8000-000000000101','migration-a@orbit.invalid',now()),
 ('00000000-0000-4000-8000-000000000102','migration-b@orbit.invalid',now());
INSERT INTO auth.sessions(id,user_id) VALUES
 ('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000101'),
 ('00000000-0000-4000-8000-000000000112','00000000-0000-4000-8000-000000000102');
INSERT INTO public.users(id,auth_user_id,email,name) VALUES
 ('migration_validation_user_a','00000000-0000-4000-8000-000000000101','migration-a@orbit.invalid','Validation A'),
 ('migration_validation_user_b','00000000-0000-4000-8000-000000000102','migration-b@orbit.invalid','Validation B');
INSERT INTO public.organizations(id,owner_id,name,credits,settings_json) VALUES
 ('migration_validation_org_a','migration_validation_user_a','Validation A',100,'{}'),
 ('migration_validation_org_b','migration_validation_user_b','Validation B',100,'{}');
INSERT INTO public.memberships(id,organization_id,user_id,role) VALUES
 ('migration_validation_member_a','migration_validation_org_a','migration_validation_user_a','owner'),
 ('migration_validation_member_b','migration_validation_org_b','migration_validation_user_b','owner');
INSERT INTO public.businesses(id,organization_id,business_name,category,source,website_status,lead_score,data_json) VALUES
 ('migration_validation_business_a','migration_validation_org_a','Clínica A','Clínicas','osm','not_identified',91,'{"business_name":"Clínica A","is_demo":false}'),
 ('migration_validation_business_b','migration_validation_org_b','Clínica B','Clínicas','osm','not_identified',81,'{}');
INSERT INTO public.crm_stages(id,organization_id,name,position) VALUES ('migration_validation_stage_a','migration_validation_org_a','Descoberto',0);
INSERT INTO public.leads(id,organization_id,business_id,stage_id,stage,notes,tags_json) VALUES
 ('migration_validation_lead_a','migration_validation_org_a','migration_validation_business_a','migration_validation_stage_a','Descoberto','','[]');
INSERT INTO public.generated_websites(id,organization_id,business_id,business_name,slug,status,content_json,engine) VALUES
 ('migration_validation_site_a','migration_validation_org_a','migration_validation_business_a','Clínica A','migration-validation-site-a','draft','{"business_name":"Clínica A"}','local');

SET LOCAL ROLE orbit_backend;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","session_id":"00000000-0000-4000-8000-000000000111","email":"migration-a@orbit.invalid","role":"authenticated"}',true);
DO $test$
DECLARE n integer; profile jsonb;
BEGIN
 IF NOT private.session_valid() THEN RAISE EXCEPTION 'Session validation failed'; END IF;
 SELECT private.bootstrap_profile('00000000-0000-4000-8000-000000000101','migration-a@orbit.invalid','Validation A','{}') INTO profile;
 IF profile->>'organization_id'<>'migration_validation_org_a' THEN RAISE EXCEPTION 'Profile ownership failed'; END IF;
 SELECT count(*) INTO n FROM public.businesses WHERE id LIKE 'migration_validation_business_%';
 IF n<>1 THEN RAISE EXCEPTION 'Backend SELECT isolation failed'; END IF;
 UPDATE public.leads SET stage='Interessado',notes='Observação com acentos',tags_json='["Odontologia"]'
 WHERE id='migration_validation_lead_a';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'CRM persistence failed'; END IF;
 BEGIN
  UPDATE public.leads SET organization_id='migration_validation_org_b' WHERE id='migration_validation_lead_a';
  RAISE EXCEPTION 'Ownership transfer was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  INSERT INTO public.businesses(id,organization_id,business_name,category,source,website_status,lead_score,data_json)
  VALUES('migration_validation_cross_org','migration_validation_org_b','Cross','Clínicas','osm','not_identified',90,'{}');
  RAISE EXCEPTION 'Cross-user INSERT was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
INSERT INTO public.lead_tags(id,organization_id,name,color) VALUES
 ('migration_validation_tag_a','migration_validation_org_a','Odontologia','#6956e8');
INSERT INTO public.lead_tag_links(organization_id,lead_id,tag_id) VALUES
 ('migration_validation_org_a','migration_validation_lead_a','migration_validation_tag_a');
INSERT INTO public.searches(id,organization_id,name,filters_json,center_json,provider,result_count,cached,status)
 VALUES('migration_validation_search_a','migration_validation_org_a','Fortaleza','{}','{"latitude":-3.73,"longitude":-38.52}','osm',1,false,'complete');
INSERT INTO public.search_results(id,organization_id,search_id,business_id,position) VALUES
 ('migration_validation_result_a','migration_validation_org_a','migration_validation_search_a','migration_validation_business_a',0);
UPDATE public.generated_websites SET status='published' WHERE id='migration_validation_site_a';

SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","session_id":"00000000-0000-4000-8000-000000000112","role":"authenticated"}',true);
DO $test$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.leads WHERE id='migration_validation_lead_a';
 IF n<>0 THEN RAISE EXCEPTION 'Cross-user SELECT was allowed'; END IF;
 UPDATE public.leads SET notes='Invalid' WHERE id='migration_validation_lead_a';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Cross-user UPDATE was allowed'; END IF;
 DELETE FROM public.leads WHERE id='migration_validation_lead_a';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Cross-user DELETE was allowed'; END IF;
END $test$;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.leads WHERE id='migration_validation_lead_a';
 IF n<>0 THEN RAISE EXCEPTION 'Data API SELECT was allowed'; END IF;
 UPDATE public.leads SET notes='Invalid' WHERE id='migration_validation_lead_a';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Data API UPDATE was allowed'; END IF;
 DELETE FROM public.leads WHERE id='migration_validation_lead_a';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Data API DELETE was allowed'; END IF;
 BEGIN
  UPDATE public.organizations SET credits=999 WHERE id='migration_validation_org_b';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Client credit manipulation was allowed'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
RESET ROLE;
DELETE FROM auth.sessions WHERE id='00000000-0000-4000-8000-000000000111';
SET LOCAL ROLE orbit_backend;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","session_id":"00000000-0000-4000-8000-000000000111","role":"authenticated"}',true);
DO $test$
DECLARE n integer;
BEGIN
 IF private.session_valid() THEN RAISE EXCEPTION 'Revoked session accepted'; END IF;
 SELECT count(*) INTO n FROM public.leads WHERE id='migration_validation_lead_a';
 IF n<>0 THEN RAISE EXCEPTION 'Revoked session read allowed'; END IF;
 SELECT count(*) INTO n FROM private.published_website('migration-validation-site-a');
 IF n<>1 THEN RAISE EXCEPTION 'Published demonstration lookup failed'; END IF;
 SELECT count(*) INTO n FROM private.published_website('migration_validation_missing');
 IF n<>0 THEN RAISE EXCEPTION 'Private demonstration leaked'; END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS' AS authorization_validation,
 (SELECT count(*) FROM public.users WHERE id LIKE 'migration_validation_%') AS residual_fixture_rows;
