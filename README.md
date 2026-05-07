# El Taller

AI content studio multi-tenant. Producto MC Designs.

> **Estado:** Phase 0 (foundation) completo. Phase 1+ pendiente.

## Qué es

Una app self-serve donde el dueño de un negocio:
1. Sube una foto, escribe la idea del contenido y escoge la fecha
2. Escoge tipo: **Reel** · **Carrusel** · **Static**
3. Claude Vision genera el contenido en su voz de marca
4. Se guarda como draft en el calendar para revisar/aprobar/postear

Cada cliente es un **tenant** aislado: su propio dominio (`studio.beboutiquepr.com`),
su propio brand brief, su propia data, todo bajo Row-Level Security en Supabase.

## Stack

- **Next.js 16** (App Router, src dir, TypeScript)
- **Tailwind 4** (PostCSS, sin config file)
- **Supabase** — Postgres + Auth (magic link) + Storage
- **Anthropic SDK** — Claude Sonnet 4.6 (vision-capable)
- **Zod** — validación
- **Vercel** — hosting

> Ojo: Next 16 renombró `middleware.ts` → `proxy.ts`. `cookies()` y `headers()`
> son async (`await cookies()`). Lee `node_modules/next/dist/docs/` antes de
> escribir patrones nuevos.

## Estructura

```
projects/el-taller/
├── proxy.ts                     # Next 16 proxy: refresh Supabase session + tenant resolution
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql        # Schema multi-tenant + RLS + storage policies
│   └── seed_be_boutique.sql     # BE Boutique como primer tenant + demo
└── src/
    ├── app/
    │   ├── layout.tsx           # Root layout (Geist fonts, metadata)
    │   ├── page.tsx             # Marketing landing (studio.mcdesignspr.com)
    │   │                        # En tenant subdomain redirige a /studio
    │   ├── studio/
    │   │   ├── layout.tsx       # Tenant chrome (header con name, nav)
    │   │   └── page.tsx         # [Phase 2] Prompt box + date + type + upload
    │   ├── calendar/
    │   │   └── page.tsx         # [Phase 3] Month grid de content_items
    │   ├── login/page.tsx       # [Phase 1] Magic link
    │   ├── admin/page.tsx       # [Phase 4] Cross-tenant view (Miguel only)
    │   └── api/
    │       ├── generate/route.ts # [Phase 2] Claude generation
    │       └── content/route.ts  # [Phase 3] CRUD content_items
    └── lib/
        ├── supabase/
        │   ├── client.ts        # Browser client (anon key)
        │   ├── server.ts        # Server client (cookies-bound) + admin client (service role)
        │   └── proxy.ts         # Session refresh used by proxy.ts
        ├── anthropic.ts         # SDK wrapper + cost estimation + logUsage()
        ├── tenant.ts            # Host → slug resolution + getTenantBySlug
        └── types.ts             # ContentType, ReelOutput, CarouselOutput, etc.
```

## Setup

```bash
cd projects/el-taller
cp .env.example .env.local
# Llena .env.local con las credentials (Supabase + Anthropic)
npm install
npm run dev
```

### Supabase

1. Crear proyecto en supabase.com (free tier ok)
2. Ejecutar migraciones desde el dashboard SQL Editor:
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed_be_boutique.sql`
3. Habilitar Email Auth en Authentication → Providers
4. En Authentication → URL Configuration:
   - Site URL: `https://studio.mcdesignspr.com`
   - Redirect URLs: `https://studio.beboutiquepr.com/auth/callback`,
     `https://studio.mcdesignspr.com/auth/callback`,
     `http://localhost:3000/auth/callback`

### Anthropic

Crear API key dedicada (`EL_TALLER_PROD`) en console.anthropic.com.
Pegarla en `.env.local` como `ANTHROPIC_API_KEY`.

### Vercel

1. Crear proyecto, link a este repo
2. Import env vars desde `.env.local`
3. Production domain: `studio.mcdesignspr.com` (CNAME desde GoDaddy)
4. Per cada tenant nuevo: añadir su dominio en Vercel Settings → Domains
   y añadir entrada en `src/lib/tenant.ts` (`TENANT_HOSTS`)

## Multi-tenant: cómo funciona

1. Request llega a (ej.) `studio.beboutiquepr.com/studio`
2. `proxy.ts` lee `host` header → `resolveSlugFromHost()` devuelve `'be-boutique'`
3. Proxy setea `x-tenant-slug: be-boutique` en request + response headers
4. Server components leen `await headers()` → obtienen el slug
5. `getTenantBySlug('be-boutique')` (memoizado por render) → tenant row
6. Queries de Supabase usan el client bound a las cookies del usuario;
   RLS hace que `current_client_id()` resuelva al tenant correcto

Para añadir tenant nuevo:
- Insert en tabla `clients` (slug, name, domain)
- Añadir entrada en `TENANT_HOSTS` en `src/lib/tenant.ts`
- Configurar dominio en Vercel
- DNS del cliente: CNAME → `cname.vercel-dns.com`
- Crear brand_brief vía intake form (Phase 1.5)

## Roadmap

| Phase | Qué se construye | Status |
|-------|------------------|--------|
| 0 | Repo, schema, lib base, proxy, route stubs | ✅ Done |
| 1 | Magic-link login + auth callback + DAL `verifySession` | ⏳ |
| 1.5 | Brand brief intake form (`/setup`) | ⏳ |
| 2 | Studio page UI + `/api/generate` con Claude Vision + save draft | ⏳ |
| 3 | Calendar month grid + edit/delete + status toggle | ⏳ |
| 4 | Admin cross-tenant view (Miguel) | ⏳ |
| 5 | Polish: brand BE aplicado, mobile, empty states, errors | ⏳ |

## Decisión: ¿Por qué multi-tenant desde día 1?

BE Boutique es el primer tenant beta. Pero el producto se diseña para servir a
N clientes futuros sin reescribir. Cada nuevo cliente = una row en `clients`
+ DNS + entrada en `TENANT_HOSTS`. La arquitectura aguanta crecimiento sin
duplicar código.

## Costos

- **Supabase:** free tier (500MB DB, 1GB Storage, 50k MAU)
- **Vercel:** Hobby plan (free, suficiente hasta tracción)
- **Anthropic:** ~$0.01-0.05 por generación (Sonnet 4.6 + vision).
  Para 30 piezas/mes per tenant ≈ $0.30-1.50. Tracking en `usage_logs`.

Defendible facturar **$300-500/mo retainer** por tenant (cuando salga de beta).
