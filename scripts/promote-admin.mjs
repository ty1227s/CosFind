import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const username = process.argv[2]?.trim().toLowerCase();
if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) {
  console.error("Usage: npm run admin:promote -- <username>");
  process.exit(1);
}

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) throw new Error(".env.local not found");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase server credentials are not configured");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { "User-Agent": "CosFind-Admin-Bootstrap/1.0" } } });
const found = await db.from("profiles").select("id").eq("username", username).maybeSingle();
if (found.error) throw found.error;
if (!found.data) throw new Error(`User '${username}' was not found. Register the user first.`);
const updated = await db.from("profiles").update({ is_admin: true, status: "active" }).eq("id", found.data.id).select("id").single();
if (updated.error) throw updated.error;
console.log(`Admin role granted to '${username}'.`);
