export type ContentType = 'reel' | 'carousel' | 'static'
export type ContentStatus = 'draft' | 'approved' | 'published'
export type UserRole = 'owner' | 'editor' | 'viewer'

export type ContentItem = {
  id: string
  client_id: string
  scheduled_date: string
  type: ContentType
  idea: string | null
  photo_url: string | null
  output: ContentOutput | null
  status: ContentStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type BrandBrief = {
  id: string
  client_id: string
  voice: string | null
  audience: string | null
  products: string | null
  do_dont: string | null
  sample_captions: string | null
  visual_style: string | null
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
  updated_at: string
}

// AI-generated content shapes per type. The `output` jsonb column stores
// one of these depending on `type`.

export type ReelOutput = {
  type: 'reel'
  hooks: string[]
  script: {
    voiceover: string
    on_screen_text: string[]
  }
  caption_short: string
  caption_medium: string
  hashtags: string[]
  manychat_keyword?: string
}

export type CarouselOutput = {
  type: 'carousel'
  slides: Array<{
    headline: string
    subtext: string
    purpose: 'cover' | 'body' | 'cta'
  }>
  caption_short: string
  caption_medium: string
  hashtags: string[]
}

export type StaticOutput = {
  type: 'static'
  caption_short: string
  caption_medium: string
  hashtags: string[]
  visual_direction: string
}

export type ContentOutput = ReelOutput | CarouselOutput | StaticOutput
