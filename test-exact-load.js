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
    { name: "profiles", orderColumn: "created_at" },
    { name: "clients", orderColumn: "created_at" },
    { name: "projects", orderColumn: "created_at" },
    { name: "tasks", orderColumn: "created_at" },
    { name: "transactions", orderColumn: "created_at" },
    { name: "payroll", orderColumn: "created_at" },
    { name: "equipment", orderColumn: "created_at" },
    { name: "notifications", orderColumn: "created_at" },
    { name: "audit_logs", orderColumn: "timestamp" }
  ];
  for (const [index, table] of tables.entries()) {
    try {
      const { data, error } = await supabase.from(table.name).select("*").order(table.orderColumn, { ascending: false });
      if (error) {
        failed = true;
        console.error(`${index + 1}. Fetching ${table.name} FAILED:`, error.message);
      } else {
        console.log(`${index + 1}. Fetching ${table.name} SUCCESS:`, data.length, "rows.");
      }
    } catch (err) {
      failed = true;
      console.error(`${index + 1}. Fetching ${table.name} THREW exception:`, err);
    }
  }

  process.exitCode = failed ? 1 : 0;
}

test();
