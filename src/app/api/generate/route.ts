import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile } from '@/lib/dal'
import { getActiveSupabase } from '@/lib/supabase/server'
import { createMessagesClient, DEFAULT_MODEL, logUsage } from '@/lib/anthropic'
import { buildSystemPrompt, getBrandBrief } from '@/lib/brand-brief'
import { getTenantById } from '@/lib/tenant'

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
  // When set, the route updates the existing item instead of inserting a
  // new one — used by the regenerate flow on the studio.
  update_id: z.string().uuid().optional(),
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

  const { scheduled_date, type, idea, photo, update_id } = parsed.data

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
  // Tenant always follows profile.client_id — host-based resolution doesn't
  // belong here because the user might be on a different domain than their
  // own tenant's (e.g. before subdomain provisioning).
  const supabase = await getActiveSupabase(profile)
  const brief = await getBrandBrief(supabase, profile.client_id)
  const tenant = await getTenantById(profile.client_id)
  const clientName = tenant?.name ?? 'el negocio'

  const systemPrompt = buildSystemPrompt(brief, clientName, type)

  let response
  try {
    const messagesClient = await createMessagesClient(profile.client_id)
    response = await messagesClient.messages.create({
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

  const textBlock = response.content.find(
    (b: { type: string }) => b.type === 'text',
  )
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

  // Regenerate path: update existing row, keep its photo_url.
  let item:
    | {
        id: string
        scheduled_date: string
        type: string
        idea: string | null
        output: unknown
        status: string
        photo_url: string | null
      }
    | null = null
  let dbError: { message: string } | null = null

  if (update_id) {
    // Verify the item belongs to this tenant before touching it. Explicit
    // client_id filter is mandatory under super-admin impersonation since
    // RLS is bypassed.
    const { data: existing, error: fetchError } = await supabase
      .from('content_items')
      .select('id, photo_url')
      .eq('id', update_id)
      .eq('client_id', profile.client_id)
      .maybeSingle()
    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'No encontré el contenido a regenerar' },
        { status: 404 },
      )
    }

    const updated = await supabase
      .from('content_items')
      .update({
        scheduled_date,
        type,
        idea,
        output,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update_id)
      .eq('client_id', profile.client_id)
      .select('id, scheduled_date, type, idea, output, status, photo_url')
      .single()
    item = updated.data
    dbError = updated.error
  } else {
    // Fresh generation: best-effort upload of the photo to storage so the
    // user can see it in the calendar later. Failure here does not block
    // saving the generated content.
    let photoPath: string | null = null
    if (photo) {
      const ext = photo.media_type.split('/')[1] ?? 'jpg'
      const path = `${profile.client_id}/${crypto.randomUUID()}.${ext}`
      const buffer = Buffer.from(photo.data, 'base64')
      const { error: uploadError } = await supabase.storage
        .from('content-photos')
        .upload(path, buffer, { contentType: photo.media_type })
      if (uploadError) {
        console.error('[generate] photo upload failed:', uploadError)
      } else {
        photoPath = path
      }
    }

    const inserted = await supabase
      .from('content_items')
      .insert({
        client_id: profile.client_id,
        scheduled_date,
        type,
        idea,
        output,
        photo_url: photoPath,
        status: 'draft',
        created_by: user.id,
      })
      .select('id, scheduled_date, type, idea, output, status, photo_url')
      .single()
    item = inserted.data
    dbError = inserted.error
  }

  if (dbError || !item) {
    return NextResponse.json(
      { error: dbError?.message ?? 'No pude guardar' },
      { status: 500 },
    )
  }

  await logUsage({
    clientId: profile.client_id,
    userId: user.id,
    endpoint: 'generate',
    model: DEFAULT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  })

  // Convert the persisted storage path to a signed URL so the studio can
  // render the photo immediately. Works for both fresh and regen flows.
  let signedPhotoUrl: string | null = null
  if (item.photo_url) {
    const { data: signed } = await supabase.storage
      .from('content-photos')
      .createSignedUrl(item.photo_url, 60 * 60 * 24)
    signedPhotoUrl = signed?.signedUrl ?? null
  }

  return NextResponse.json({
    item: { ...item, photo_url: signedPhotoUrl },
    output,
  })
}
