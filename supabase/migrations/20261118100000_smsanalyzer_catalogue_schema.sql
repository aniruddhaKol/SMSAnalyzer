create schema if not exists smsanalyzer;
alter table public.smsanalyzer_banks set schema smsanalyzer;
alter table public.smsanalyzer_merchants set schema smsanalyzer;
alter function public.smsanalyzer_catalogue_stamp() set schema smsanalyzer;
alter function public.smsanalyzer_sync_catalogue(text) set schema smsanalyzer;
do $migration$
declare definition text; schemas text;
begin
 select pg_get_functiondef('smsanalyzer.smsanalyzer_sync_catalogue(text)'::regprocedure) into definition;
 definition:=replace(replace(definition,'public.smsanalyzer_banks','smsanalyzer.smsanalyzer_banks'),'public.smsanalyzer_merchants','smsanalyzer.smsanalyzer_merchants');
 execute definition;
 select split_part(setting,'=',2) into schemas from pg_roles r cross join lateral unnest(r.rolconfig) setting where r.rolname='authenticator' and setting like 'pgrst.db_schemas=%';
 schemas:=coalesce(schemas,'public,graphql_public,taskvilla');
 if not 'smsanalyzer'=any(string_to_array(replace(schemas,' ',''),',')) then
  execute format('alter role authenticator set pgrst.db_schemas = %L',schemas||',smsanalyzer');
 end if;
end $migration$;
grant usage on schema smsanalyzer to anon,authenticated;
grant select on smsanalyzer.smsanalyzer_banks,smsanalyzer.smsanalyzer_merchants to anon,authenticated;
revoke all on function smsanalyzer.smsanalyzer_sync_catalogue(text) from public;
grant execute on function smsanalyzer.smsanalyzer_sync_catalogue(text) to anon,authenticated;
notify pgrst,'reload config';
notify pgrst,'reload schema';

