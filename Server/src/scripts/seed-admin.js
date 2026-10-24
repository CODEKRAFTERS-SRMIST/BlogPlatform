/**
 * Seed Admin User Script
 * Creates an admin user for testing and development
 * 
 * Usage: node src/scripts/seed-admin.js
 */

import bcrypt from "bcrypt";
import prisma from "../db/db.js";
import dotenv from "dotenv";

dotenv.config();

async function createAdminUser() {
  try {
    console.log("Seeding admin user...\n");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log("Admin user already exists!");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Status: ${existingAdmin.status}\n`);
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
      data: {
        name: "Admin User",
        email: adminEmail,
        reg_no: "ADMIN001",
        year: "Staff",
        domain: "Administration",
        ref_code: "ADMIN-REF-001",
        status: "approved",
        password_hash: passwordHash,
        role: "admin"
      }
    });

    console.log("Admin user created successfully!");
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);

  } catch (error) {
    console.error("Error creating admin user:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
