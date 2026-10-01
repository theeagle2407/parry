-- Run once in the Supabase SQL Editor. No public read/write policies.
begin;
create table if not exists public.parry_records (
  seq bigint generated always as identity primary key,
  kind text not null check (kind in ('studies','reviews')),
  id text not null check (length(id) between 1 and 100),
  payload text not null check (octet_length(payload) <= 9500000),
  unique(kind,id)
);
alter table public.parry_records enable row level security;
revoke all on public.parry_records from public, anon, authenticated;
grant select, insert on public.parry_records to service_role;
grant usage, select on sequence public.parry_records_seq_seq to service_role;
-- Text preserves JSON property order used in existing onchain commitments.
create or replace function public.parry_append(p_kind text,p_id text,p_payload text)
returns void language plpgsql security invoker set search_path = '' as $$
declare previous text; size_total bigint; rows_total bigint; parsed json;
begin
  if p_kind is null or p_kind not in ('studies','reviews') or p_id is null or length(p_id) not between 1 and 100 or p_payload is null or octet_length(p_payload)>9500000 then
    raise exception 'Invalid record';
  end if;
  parsed := p_payload::json;
  if json_typeof(parsed) <> 'object' or (parsed->>'id') is distinct from p_id then raise exception 'Invalid record'; end if;
  perform pg_advisory_xact_lock(724193822);
  select payload into previous from public.parry_records where kind=p_kind and id=p_id;
  if found then
    if previous<>p_payload then raise exception 'Published records cannot be overwritten'; end if;
    return;
  end if;
  select count(*) into rows_total from public.parry_records where kind=p_kind;
  if rows_total>=500 then raise exception 'Workspace capacity reached'; end if;
  select coalesce(sum(octet_length(payload)),0) into size_total from public.parry_records;
  if size_total+octet_length(p_payload)>64000000 then raise exception 'Workspace storage capacity reached'; end if;
  insert into public.parry_records(kind,id,payload) values(p_kind,p_id,p_payload);
end $$;
revoke all on function public.parry_append(text,text,text) from public,anon,authenticated;
grant execute on function public.parry_append(text,text,text) to service_role;
commit;
