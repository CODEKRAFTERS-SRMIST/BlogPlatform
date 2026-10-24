-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('member', 'admin', 'reviewer');

-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reg_no" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "ref_code" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "set_password_token" TEXT,
    "set_password_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "links" TEXT,
    "status" "BlogStatus" NOT NULL DEFAULT 'draft',
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_reg_no_key" ON "User"("reg_no");

-- CreateIndex
CREATE UNIQUE INDEX "User_ref_code_key" ON "User"("ref_code");

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
