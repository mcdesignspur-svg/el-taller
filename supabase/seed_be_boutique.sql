-- Seed: BE Boutique as the first tenant of El Taller.
-- Run after 0001_init.sql. Brand brief fields will be filled in Phase 1.5
-- via the in-app intake form.

insert into public.clients (slug, name, domain, plan_tier)
values ('be-boutique', 'BE Boutique', 'studio.beboutiquepr.com', 'beta')
on conflict (slug) do update
  set name = excluded.name,
      domain = excluded.domain;

-- Empty brand brief shell so the intake form has a row to update.
insert into public.brand_briefs (client_id)
select id from public.clients where slug = 'be-boutique'
on conflict (client_id) do nothing;

-- Optional: a "demo" tenant for the public marketing site (studio.mcdesignspr.com)
insert into public.clients (slug, name, domain, plan_tier)
values ('demo', 'El Taller — Demo', 'studio.mcdesignspr.com', 'beta')
on conflict (slug) do update
  set name = excluded.name,
      domain = excluded.domain;

insert into public.brand_briefs (client_id, voice, audience, products)
select id, 'Tono pana-chévere PR. Mix español + inglés natural.',
       'Dueños de negocio en Puerto Rico que quieren vender más online.',
       'Demo content para mostrar capacidades de El Taller.'
from public.clients where slug = 'demo'
on conflict (client_id) do nothing;
