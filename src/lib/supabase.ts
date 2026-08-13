import { createClient } from "@supabase/supabase-js";
import {
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/env";

export function supabaseAnon() {
  return createClient(supabaseUrl(), supabaseAnonKey());
}

export function supabaseAdmin() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey());
}
