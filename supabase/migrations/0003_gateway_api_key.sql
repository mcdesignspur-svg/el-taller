-- El Taller × MC Designs AI Gateway integration
-- Each El Taller client maps to a tenant in mc-dashboard's AI Gateway. The
-- bearer token issued by the Gateway is stored here so the /api/generate
-- route can route AI calls through the Gateway instead of calling Anthropic
-- SDK directly.
--
-- After applying this migration, populate the key for BE:
--   update public.clients
--     set gateway_api_key = '<key from mc-dashboard.tenants where client_slug=be-boutique>'
--     where slug = 'be-boutique';

alter table public.clients
  add column gateway_api_key text;

comment on column public.clients.gateway_api_key is
  'Bearer token for MC Designs AI Gateway. Populated post-tenant-provisioning. Null = AI calls fall back to direct Anthropic SDK (legacy path).';
