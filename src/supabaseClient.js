import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isConfigured(url, key) {
  return typeof url === "string" && /^https:\/\/.+\.supabase\.co\/?$/.test(url) && typeof key === "string" && key.length > 20;
}

export const supabase = isConfigured(supabaseUrl, supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
