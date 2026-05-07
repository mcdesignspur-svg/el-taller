import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

// Pricing snapshot (per million tokens) for cost tracking.
// Update when pricing changes. Source: https://www.anthropic.com/pricing
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = PRICING_PER_MTOK[model] ?? PRICING_PER_MTOK['claude-sonnet-4-6']
  return (
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output
  )
}

type LogUsageInput = {
  clientId: string
  userId: string | null
  endpoint: string
  model: string
  inputTokens: number
  outputTokens: number
}

/**
 * Records one Anthropic API call against a tenant. Uses the service-role
 * client because authenticated users do not have INSERT on usage_logs by RLS.
 */
export async function logUsage(input: LogUsageInput): Promise<void> {
  const admin = createAdminClient()
  await admin.from('usage_logs').insert({
    client_id: input.clientId,
    user_id: input.userId,
    endpoint: input.endpoint,
    model: input.model,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    cost_usd: estimateCostUsd(input.model, input.inputTokens, input.outputTokens),
  })
}
