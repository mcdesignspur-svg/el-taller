import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'
import { anthropic, DEFAULT_MODEL, logUsage } from '@/lib/anthropic'

const Schema = z.object({
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['reel', 'carousel', 'static']),
  idea: z.string().min(1).max(2000),
  photo: z
    .object({
      data: z.string(),
      media_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    })
    .nullable()
    .optional(),
})

const SYSTEM_PROMPT = `Eres un creative director de contenido para negocios pequeños en Puerto Rico. Tu voz es spanglish cálido y profesional — español con mezcla natural de inglés para términos de tech/business. NO uses slang pesado puertorriqueño en copy cliente-facing. NO suenes corporativo. Suena como un pana que sabe de marketing.

El usuario te dará:
- TIPO: reel, carousel, o static
- IDEA en sus palabras
- Opcionalmente, una FOTO

Genera el contenido para ese tipo como JSON que matchee este schema EXACTO. Si te dan foto, basa el contenido en lo que ves en la foto + la idea.

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
- hashtags: 8-15, mezcla de generales + nicho + Puerto Rico (#PuertoRico, #PR + relevantes)
- manychat_keyword: solo si el post invita a comentar para recurso (ej. "GUIA", "INFO"), si no aplica omítelo
- Carousel: 5-7 slides total — 1 cover + 3-5 body + 1 cta
- Output PURO JSON, sin markdown fences, sin comentarios fuera del JSON`

export async function POST(request: Request) {
  const { user, profile } = await getCurrentProfile()

  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { scheduled_date, type, idea, photo } = parsed.data

  const userContent: Array<
    | { type: 'text'; text: string }
    | {
        type: 'image'
        source: { type: 'base64'; media_type: string; data: string }
      }
  > = []

  if (photo) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: photo.media_type,
        data: photo.data,
      },
    })
  }
  userContent.push({
    type: 'text',
    text: `Tipo: ${type}\nIdea: ${idea}\n\nGenera el contenido como JSON puro.`,
  })

  let response
  try {
    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: 'user', content: userContent as any },
      ],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Anthropic call failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: 'AI no devolvió texto' }, { status: 500 })
  }

  // Strip ```json fences if Claude added them despite instructions.
  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')

  let output: unknown
  try {
    output = JSON.parse(raw)
  } catch {
    return NextResponse.json(
      { error: 'AI devolvió JSON inválido', raw },
      { status: 500 },
    )
  }

  const supabase = await createServerClient()
  const { data: item, error: dbError } = await supabase
    .from('content_items')
    .insert({
      client_id: profile.client_id,
      scheduled_date,
      type,
      idea,
      output,
      status: 'draft',
      created_by: user.id,
    })
    .select('id, scheduled_date, type, idea, output, status')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logUsage({
    clientId: profile.client_id,
    userId: user.id,
    endpoint: 'generate',
    model: DEFAULT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  })

  return NextResponse.json({ item, output })
}
