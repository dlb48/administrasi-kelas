import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Peringatan: URL atau Kunci Supabase belum diatur di file .env")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
