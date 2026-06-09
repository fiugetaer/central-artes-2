const SUPABASE_URL =
"https://ztytxwpldisxfhznxiiv.supabase.co";

const SUPABASE_KEY =
"sb_publishable_emnbYWibteWKRDKwPevaIA_Pz0xWuXB";

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Supabase conectado!");