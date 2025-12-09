/**
 * Get Supabase environment variables with validation
 */
export function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    throw new Error(
      `Missing Supabase environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.\n' +
      'After updating .env.local, restart your development server.'
    )
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  }
}

