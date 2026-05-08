import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import { getGatewayKeyForClient } from './gateway-key'

// ─── Configuration ───────────────────────────────────────────────────────────

const USE_AI_GATEWAY = process.env.USE_AI_GATEWAY === 'true'

// Default to deployed Gateway. For local-against-local testing, override in
// .env.local with: AI_GATEWAY_URL=http://localhost:3000
const GATEWAY_URL =
  process.env.AI_GATEWAY_URL ?? 'https://ops.mcdesignspr.com'

// V3.5 default — Haiku 4.5 for cliente-facing. If BE notices regression vs
// Sonnet 4.6 (the prior default), flip via env: ANTHROPIC_MODEL=claude-sonnet-4-6
export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'

// ─── Legacy direct Anthropic SDK (fallback path) ─────────────────────────────

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ─── Gateway-routed client (when USE_AI_GATEWAY=true) ────────────────────────

interface MessagesClient {
  messages: {
    // The SDK and the Gateway both accept Anthropic Messages API params and
    // return Anthropic Messages API responses. Typed as `any` at this seam to
    // avoid SDK version drift; route handlers use the shape they always have.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create(params: any): Promise<any>
  }
}

function buildGatewayClient(gatewayKey: string): MessagesClient {
  return {
    messages: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async create(params: any) {
        const res = await fetch(`${GATEWAY_URL}/api/ai-gateway/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${gatewayKey}`,
          },
          body: JSON.stringify({
            ...params,
            source_platform: 'el-taller',
            flow: 'generate',
          }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          const message =
            json?.error?.message ?? `gateway_${res.status}`
          throw new Error(`AI Gateway: ${message}`)
        }
        return json
      },
    },
  }
}

/**
 * Returns a tenant-scoped Messages client. When USE_AI_GATEWAY=true and the
 * client has a gateway_api_key provisioned, calls route through MC Designs AI
 * Gateway (centralized auth, logging, model routing). Otherwise falls back to
 * the direct Anthropic SDK.
 *
 * Pass profile.client_id from the request handler.
 */
export async function createMessagesClient(
  clientId: string,
): Promise<MessagesClient> {
  if (!USE_AI_GATEWAY) return anthropic
  const key = await getGatewayKeyForClient(clientId)
  if (!key) {
    console.warn(
      `[anthropic] USE_AI_GATEWAY=true but client ${clientId} has no gateway_api_key — falling back to direct SDK`,
    )
    return anthropic
  }
  return buildGatewayClient(key)
}

// ─── Local usage logging (belt-and-suspenders during 2-week transition) ──────
// Keep writing to El Taller's own usage_logs even when going through the
// Gateway. Deprecate after 2 weeks once Gateway logs are validated.

interface ModelPrice {
  input: number
  output: number
}

const PRICING_PER_MTOK: Record<string, ModelPrice> = {
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-7': { input: 5, output: 25 },
}

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  // Strip "anthropic/" prefix and dot-format the version when matching.
  const key = model
    .replace(/^anthropic\//, '')
    .replace(/-(\d)\.(\d)(?=$|-)/, '-$1-$2')
  const price = PRICING_PER_MTOK[key] ?? PRICING_PER_MTOK['claude-haiku-4-5']
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
