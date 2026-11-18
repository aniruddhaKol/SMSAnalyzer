create table public.smsanalyzer_banks (
 id text primary key, code text unique not null, name text not null,
 source_key text not null, registered_name text not null,
 aliases text[] not null default '{}', category text not null default '', domain text not null default '',
 icon bytea not null, icon_mime text not null, official_icon boolean not null default false,
 last_updated timestamptz not null default clock_timestamp()
);
create table public.smsanalyzer_merchants (
 id text primary key, name text not null, aliases text[] not null default '{}',
 category text not null default '', domain text not null default '',
 icon bytea not null, icon_mime text not null,
 last_updated timestamptz not null default clock_timestamp()
);
create index smsanalyzer_banks_updated_idx on public.smsanalyzer_banks(last_updated);
create index smsanalyzer_merchants_updated_idx on public.smsanalyzer_merchants(last_updated);
alter table public.smsanalyzer_banks enable row level security;
alter table public.smsanalyzer_merchants enable row level security;
revoke all on public.smsanalyzer_banks,public.smsanalyzer_merchants from anon,authenticated;
grant select on public.smsanalyzer_banks,public.smsanalyzer_merchants to anon,authenticated;
create policy smsanalyzer_banks_catalogue_read on public.smsanalyzer_banks for select to anon,authenticated using (true);
create policy smsanalyzer_merchants_catalogue_read on public.smsanalyzer_merchants for select to anon,authenticated using (true);
create function public.smsanalyzer_catalogue_stamp() returns trigger language plpgsql set search_path='' as $$
begin new.last_updated:=clock_timestamp(); return new; end $$;
revoke all on function public.smsanalyzer_catalogue_stamp() from public;
create trigger smsanalyzer_banks_stamp before update on public.smsanalyzer_banks for each row execute function public.smsanalyzer_catalogue_stamp();
create trigger smsanalyzer_merchants_stamp before update on public.smsanalyzer_merchants for each row execute function public.smsanalyzer_catalogue_stamp();
-- Epoch milliseconds. Missing, malformed, negative and future values yield {}.
create function public.smsanalyzer_sync_catalogue(last_updated text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare since_time timestamptz; until_time timestamptz:=statement_timestamp(); banks jsonb; merchants jsonb;
begin
 if last_updated is null or last_updated !~ '^[0-9]{1,16}$' then return '{}'::jsonb; end if;
 begin since_time:=to_timestamp(last_updated::numeric/1000); exception when others then return '{}'::jsonb; end;
 if since_time>until_time then return '{}'::jsonb; end if;
 -- Include the last millisecond again so sub-millisecond writes cannot be skipped.
 select coalesce(jsonb_agg(to_jsonb(b)-'icon'||jsonb_build_object('icon',replace(encode(b.icon,'base64'),E'\n','')) order by b.id),'[]'::jsonb) into banks
 from public.smsanalyzer_banks b where b.last_updated>=since_time and b.last_updated<=until_time;
 select coalesce(jsonb_agg(to_jsonb(m)-'icon'||jsonb_build_object('icon',replace(encode(m.icon,'base64'),E'\n','')) order by m.id),'[]'::jsonb) into merchants
 from public.smsanalyzer_merchants m where m.last_updated>=since_time and m.last_updated<=until_time;
 if jsonb_array_length(banks)=0 and jsonb_array_length(merchants)=0 then return '{}'::jsonb; end if;
 return jsonb_build_object('last_updated',floor(extract(epoch from until_time)*1000)::bigint,'banks',banks,'merchants',merchants);
end $$;
revoke all on function public.smsanalyzer_sync_catalogue(text) from public;
grant execute on function public.smsanalyzer_sync_catalogue(text) to anon,authenticated;
