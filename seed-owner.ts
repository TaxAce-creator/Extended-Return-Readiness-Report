import "dotenv/config";
import bcrypt from "bcryptjs";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_OWNER_PASSWORD;
const name = process.env.SEED_OWNER_NAME?.trim() || "TaxAce Owner";

if (!databaseUrl || !email || !password || password.length < 14) {
  throw new Error("Set DATABASE_URL, SEED_OWNER_EMAIL, and a SEED_OWNER_PASSWORD of at least 14 characters.");
}

const sql = postgres(databaseUrl, { prepare: false, max: 1 });
const passwordHash = await bcrypt.hash(password, 12);
const openId = `local:${email}`;

await sql`
  insert into users ("openId", name, email, "loginMethod", role, password_hash, must_change_password, "lastSignedIn")
  values (${openId}, ${name}, ${email}, 'local', 'owner', ${passwordHash}, true, now())
  on conflict ("openId") do update set
    name = excluded.name,
    email = excluded.email,
    role = 'owner',
    password_hash = excluded.password_hash,
    must_change_password = true
`;

await sql.end();
console.log("Owner account created or updated. The temporary password must be changed at first login.");
