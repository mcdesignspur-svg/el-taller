-- Extra brand-brief fields used by the system-prompt builder.
alter table public.brand_briefs
  add column if not exists default_hashtags text,
  add column if not exists manychat_keywords text,
  add column if not exists location text;
