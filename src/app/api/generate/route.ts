import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'
import { anthropic, DEFAULT_MODEL, logUsage } from '@/lib/anthropic'
import { buildSystemPrompt, getBrandBrief } from '@/lib/brand-brief'
import { getTenantBySlug, resolveSlugFromHost } from '@/lib/tenant'
import { headers } from 'next/headers'

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

  // Load brand brief + tenant name to build a tenant-aware system prompt.
  const supabase = await createServerClient()
  const brief = await getBrandBrief(supabase, profile.client_id)

  const h = await headers()
  const slug = h.get('x-tenant-slug') ?? resolveSlugFromHost(h.get('host'))
  const tenant = slug ? await getTenantBySlug(slug) : null
  const clientName = tenant?.name ?? 'el negocio'

  const systemPrompt = buildSystemPrompt(brief, clientName, type)

  let response
  try {
    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
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
