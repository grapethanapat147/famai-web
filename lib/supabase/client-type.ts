import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Supabase client ที่ผูกชนิดกับ schema จริงของเรา (public + pub) */
export type TypedSupabaseClient = SupabaseClient<Database>;
