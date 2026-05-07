import { NextResponse } from 'next/server'

// POST /api/generate — Phase 2 implementation:
//   1. Auth check (verifySession)
//   2. Validate body (type, idea, scheduled_date, optional photo)
//   3. Load brand_brief for the tenant
//   4. Call Claude (Sonnet 4.6, vision if photo) with system prompt = brand_brief
//   5. Parse output JSON, persist content_items row (status = draft)
//   6. logUsage(...) → usage_logs
//   7. Return { id, output }

export async function POST() {
  return NextResponse.json(
    { error: 'Not implemented yet — Phase 2.' },
    { status: 501 },
  )
}
