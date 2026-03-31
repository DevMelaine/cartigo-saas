/*
  Warnings:

  - You are about to drop the column `customerRole` on the `Customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "customerRole";

-- DropEnum
DROP TYPE "CustomerRole";
