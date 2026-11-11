import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

// The anon key is designed to be public: the database's security rules
// (see supabase/schema.sql) decide what each signed-in user can access.
export const supabase = createClient(url || "http://localhost", key || "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true },
});
