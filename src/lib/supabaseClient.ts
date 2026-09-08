import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://ddigjujidraxoptfncma.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "sb_publishable_ZJGH_4j7GoDQNFXcTMBAnw_8MTr9Q-X";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required to initialize the connection.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
