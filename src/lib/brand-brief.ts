import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrandBrief, ContentType } from '@/lib/types'

export async function getBrandBrief(
  supabase: SupabaseClient,
  clientId: string,
): Promise<BrandBrief | null> {
  const { data, error } = await supabase
    .from('brand_briefs')
    .select(
      'id, client_id, voice, audience, products, do_dont, sample_captions, visual_style, primary_color, secondary_color, logo_url, default_hashtags, manychat_keywords, location, updated_at',
    )
    .eq('client_id', clientId)
    .maybeSingle()
  if (error || !data) return null
  return data as BrandBrief
}

/**
 * True if the brief has enough filled-in for the AI to produce output that
 * actually sounds like the brand. Drives the empty-state banner on /studio.
 */
export function isBriefMeaningful(brief: BrandBrief | null): boolean {
  if (!brief) return false
  const richFields = [brief.products, brief.audience, brief.voice]
  return richFields.some((f) => (f?.trim().length ?? 0) >= 30)
}

const SCHEMA_BLOCK = `Genera el contenido para ese tipo como JSON que matchee este schema EXACTO.

REEL:
{
  "type": "reel",
  "hooks": [string, string, string],
  "script": {
    "voiceover": string,
    "on_screen_text": [string]
  },
  "caption_short": string,
  "caption_medium": string,
  "hashtags": [string],
  "manychat_keyword": string
}

CAROUSEL:
{
  "type": "carousel",
  "slides": [
    { "headline": string, "subtext": string, "purpose": "cover" | "body" | "cta" }
  ],
  "caption_short": string,
  "caption_medium": string,
  "hashtags": [string]
}

STATIC:
{
  "type": "static",
  "caption_short": string,
  "caption_medium": string,
  "hashtags": [string],
  "visual_direction": string
}

REGLAS:
- hooks: 3 opciones distintas, primeras 2 segundos del reel
- script.voiceover: lo que dice la persona en cámara
- script.on_screen_text: 3-5 frases cortas que aparecen overlay
- caption_short: máximo 100 caracteres
- caption_medium: 200-400 caracteres, incluye CTA claro
- hashtags: 8-15
- Carousel: 5-7 slides total — 1 cover + 3-5 body + 1 cta
- Output PURO JSON, sin markdown fences, sin comentarios fuera del JSON`

function section(title: string, value: string | null | undefined): string {
  const v = value?.trim()
  if (!v) return ''
  return `\n\n${title.toUpperCase()}\n${v}`
}

export function buildSystemPrompt(
  brief: BrandBrief | null,
  clientName: string,
  type: ContentType,
): string {
  const intro = brief
    ? `Eres el copywriter interno de ${clientName}. Conoces el negocio a fondo y escribes en su voz exacta. Tu output se publica directamente — no debe sonar genérico ni AI.`
    : `Eres un creative director de contenido para ${clientName}, un negocio en Puerto Rico. Tu voz es spanglish cálido y profesional — español con mezcla natural de inglés para términos de tech/business. NO uses slang pesado puertorriqueño en copy cliente-facing. NO suenes corporativo.`

  const briefBlock = brief
    ? [
        section('Negocio', brief.products),
        section('Ubicación', brief.location),
        section('Audiencia objetivo', brief.audience),
        section('Voz y tono', brief.voice),
        section(
          'Ejemplos de captions que han funcionado (úsalos como referencia de estilo, NO los copies)',
          brief.sample_captions,
        ),
        section(
          'Hashtags base (incluye estos cuando apliquen al tema)',
          brief.default_hashtags,
        ),
        section(
          'ManyChat keywords activas (úsalas en CTAs cuando el post invite a comentar)',
          brief.manychat_keywords,
        ),
        section('Estilo visual de la marca', brief.visual_style),
        section('Colores principales', joinColors(brief)),
        section('Cosas a evitar', brief.do_dont),
      ]
        .filter(Boolean)
        .join('')
    : ''

  const typeContext = `\n\nTIPO DE CONTENIDO\nEl usuario está pidiendo un ${type === 'reel' ? 'Reel' : type === 'carousel' ? 'Carrusel' : 'Static post'}. Si te dan foto, basa el contenido en lo que ves en la foto + la idea.`

  return `${intro}${briefBlock}${typeContext}\n\n${SCHEMA_BLOCK}`
}

function joinColors(brief: BrandBrief): string {
  const parts = [brief.primary_color, brief.secondary_color]
    .map((c) => c?.trim())
    .filter(Boolean)
  return parts.join(', ')
}
