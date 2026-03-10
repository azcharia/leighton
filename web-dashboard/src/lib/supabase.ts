// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface Defect {
  id: string
  created_at: string
  image_url: string
  audio_transcript: string
  defect_type: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | null
  responsible_trade: string | null
  suggested_action: string | null
  status: 'Pending AI' | 'Processed' | 'Resolved'
}
