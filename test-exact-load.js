import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ddigjujidraxoptfncma.supabase.co";
const supabaseAnonKey = "sb_publishable_ZJGH_4j7GoDQNFXcTMBAnw_8MTr9Q-X";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Starting exact load query tests...");

  // 1. Fetch profiles
  try {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) {
      console.error("1. Fetching profiles FAILED:", error);
    } else {
      console.log("1. Fetching profiles SUCCESS:", data.length, "rows.");
    }
  } catch (err) {
    console.error("1. Fetching profiles THREW exception:", err);
  }

  // 2. Fetch clients
  try {
    const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("2. Fetching clients FAILED:", error);
    } else {
      console.log("2. Fetching clients SUCCESS:", data.length, "rows.");
    }
  } catch (err) {
    console.error("2. Fetching clients THREW exception:", err);
  }

  // 3. Fetch projects
  try {
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("3. Fetching projects FAILED:", error);
    } else {
      console.log("3. Fetching projects SUCCESS:", data.length, "rows.");
    }
  } catch (err) {
    console.error("3. Fetching projects THREW exception:", err);
  }

  // 4. Fetch tasks
  try {
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("4. Fetching tasks FAILED:", error);
    } else {
      console.log("4. Fetching tasks SUCCESS:", data.length, "rows.");
    }
  } catch (err) {
    console.error("4. Fetching tasks THREW exception:", err);
  }

  // 5. Fetch transactions
  try {
    const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("5. Fetching transactions FAILED:", error);
    } else {
      console.log("5. Fetching transactions SUCCESS:", data.length, "rows.");
    }
  } catch (err) {
    console.error("5. Fetching transactions THREW exception:", err);
  }

  // 6. Fetch payroll records
  try {
    const { data, error } = await supabase.from("payroll").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("6. Fetching payroll FAILED:", error);
    } else {
      console.log("6. Fetching payroll SUCCESS:", data.length, "rows.");
    }
  } catch (err) {
    console.error("6. Fetching payroll THREW exception:", err);
  }
}

test();
