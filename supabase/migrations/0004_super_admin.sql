-- Super-admin role for cross-tenant access (MC Designs as platform owner).
-- A super admin keeps a single primary profile in their own tenant; access
-- to other tenants is granted via service-role queries gated by the
-- el_taller_acting_as cookie + this flag.
--
-- Schema impact: minimal — just a boolean column on profiles.
-- Tenant isolation for normal users is unchanged (RLS still applies).

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

comment on column public.profiles.is_super_admin is
  'When true, this user can switch between any tenant via the /admin view. Service-role bypass enforces access — RLS does not change for normal users.';
