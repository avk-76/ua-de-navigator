-- Apply only in the ua-de-navigator project. Replace __PUBLIC_ANON_KEY__
-- with the project's public legacy anon key when running this SQL.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'navigator-source-refresh',
  '0 * * * *',
  $job$
    select net.http_post(
      url := 'https://ryqccibdsludqzvfjotz.supabase.co/functions/v1/navigator-assist',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Origin', 'https://avk-76.github.io',
        'apikey', '__PUBLIC_ANON_KEY__',
        'Authorization', 'Bearer __PUBLIC_ANON_KEY__'
      ),
      body := '{"action":"sources"}'::jsonb
    )
    where not exists (
      select 1 from public.navigator_sources
      where checked_at > now() - interval '72 hours'
    );
  $job$
);
