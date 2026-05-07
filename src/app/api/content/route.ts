import { NextResponse } from 'next/server'

// CRUD for content_items, scoped to the tenant via RLS:
//   GET    /api/content?from=YYYY-MM-DD&to=YYYY-MM-DD
//   PATCH  /api/content/:id  → status, notes, scheduled_date, output edits
//   DELETE /api/content/:id

export async function GET() {
  return NextResponse.json(
    { error: 'Not implemented yet — Phase 3.' },
    { status: 501 },
  )
}
