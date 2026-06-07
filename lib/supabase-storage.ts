import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase storage credentials not configured");
}

export const supabaseStorage = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : null;

export function getPublicUrl(bucket: string, filePath: string): string {
  if (!supabaseStorage || !supabaseUrl) {
    throw new Error("Supabase storage not configured");
  }
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}
