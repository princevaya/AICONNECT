export async function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, anonKey);
  } catch {
    return null;
  }
}
