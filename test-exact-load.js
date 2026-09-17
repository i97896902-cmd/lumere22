import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Starting exact load query tests...");
  let failed = false;

  const tables = [
    "profiles",
    "clients",
    "projects",
    "tasks",
    "transactions",
    "payroll",
    "equipment",
    "notifications",
    "audit_logs"
  ];
  for (const [index, table] of tables.entries()) {
    try {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      if (error) {
        failed = true;
        console.error(`${index + 1}. Fetching ${table} FAILED:`, error.message);
      } else {
        console.log(`${index + 1}. Fetching ${table} SUCCESS:`, data.length, "rows.");
      }
    } catch (err) {
      failed = true;
      console.error(`${index + 1}. Fetching ${table} THREW exception:`, err);
    }
  }

  process.exitCode = failed ? 1 : 0;
}

test();
