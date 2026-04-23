/**
 * scripts/seed-owner.js
 *
 * Creates the first OWNER account in the database.
 * Run from the repo root:
 *   node scripts/seed-owner.js
 *
 * Requires DATABASE_URL in .env (or environment).
 */

import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

// Load .env from repo root regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log("=== Seed first OWNER account ===\n");

  const name = (await ask("Name: ")).trim();
  const email = (await ask("Email: ")).trim().toLowerCase();
  const password = (await ask("Password (min 8 chars): ")).trim();
  rl.close();

  if (!name || !email || password.length < 8) {
    console.error("❌ Invalid input. Name and email required; password must be ≥ 8 chars.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`❌ A user with email "${email}" already exists.`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "OWNER" },
  });

  console.log(`\n✅ OWNER account created: ${user.name} <${user.email}> (id: ${user.id})`);
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
