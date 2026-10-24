import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "President";

  if (!email || !password) {
    console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("❌ ADMIN_PASSWORD must be at least 12 characters");
    process.exit(1);
  }

  const existing = await prisma.user.findFirst({
    where: { is_super_admin: true },
  });

  if (existing) {
    console.log("✅ Super admin already exists — skipping seed");
    console.log(`   Email: ${existing.email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      name,
      reg_no: "ADMIN001",
      year: "2024",
      domain: "admin",
      ref_code: "SC-ADMIN001",
      status: "approved",
      role: "admin",
      is_super_admin: true,
      password_hash: hashedPassword,
      email_verified: true,
    },
  });

  console.log("✅ Super admin seeded successfully");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Name: ${admin.name}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
