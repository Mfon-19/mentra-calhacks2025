// Optional: load environment variables from .env if dotenv is installed
try {
  require("dotenv").config();
} catch (_) {
  // dotenv not installed; proceed assuming env vars are set by the environment
}

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[supabase] Missing SUPABASE_URL or SUPABASE_KEY environment variables."
  );
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

module.exports = supabase;
