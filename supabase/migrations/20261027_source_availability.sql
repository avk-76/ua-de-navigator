-- HTTP checks establish availability, not legal verification.
alter table public.navigator_sources drop constraint if exists navigator_sources_status_check;
update public.navigator_sources set status = 'available_online' where status = 'verified_online';
alter table public.navigator_sources add constraint navigator_sources_status_check
  check (status in ('needs_review', 'available_online', 'temporarily_unavailable'));
update public.navigator_source_checks set status = 'available_online' where status = 'verified_online';
