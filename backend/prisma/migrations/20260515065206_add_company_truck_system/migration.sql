/*
  Warnings:

  - You are about to drop the column `carrierName` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `dotNumber` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `mcNumber` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `ratePercent` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `trailer` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `truckNumber` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `carrierName` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `driverId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `driverName` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `trailer` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `truckNumber` on the `Invoice` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyName" TEXT NOT NULL,
    "ownerName" TEXT,
    "mcNumber" TEXT,
    "dotNumber" TEXT,
    "address" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "billingType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "dispatchPercent" REAL NOT NULL DEFAULT 0,
    "fixedMonthlyRate" REAL NOT NULL DEFAULT 0,
    "accountNumber" TEXT,
    "accountTitle" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "truckNumber" TEXT NOT NULL,
    "trailerNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Truck_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Driver" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "companyId" INTEGER,
    "truckId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Driver_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Driver_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Driver" ("createdAt", "email", "id", "isActive", "name", "phone", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "name", "phone", "updatedAt" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE TABLE "new_Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER,
    "companyName" TEXT,
    "ownerName" TEXT,
    "mcNumber" TEXT,
    "dotNumber" TEXT,
    "address" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "billingType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "dispatchPercent" REAL NOT NULL DEFAULT 0,
    "fixedMonthlyRate" REAL NOT NULL DEFAULT 0,
    "truckNumbers" TEXT,
    "driverNames" TEXT,
    "invoiceNumber" TEXT,
    "invoiceStart" DATETIME NOT NULL,
    "invoiceEnd" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "accountNumber" TEXT,
    "accountTitle" TEXT,
    "accountsFeeWeeks" REAL NOT NULL DEFAULT 0,
    "accountsFeeRate" REAL NOT NULL DEFAULT 0,
    "accountsFeeTotal" REAL NOT NULL DEFAULT 0,
    "totalLoadAmount" REAL NOT NULL DEFAULT 0,
    "totalDispatchAmount" REAL NOT NULL DEFAULT 0,
    "fixedBillingAmount" REAL NOT NULL DEFAULT 0,
    "grossAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "referralBonus" REAL NOT NULL DEFAULT 0,
    "fineAmount" REAL NOT NULL DEFAULT 0,
    "fineReason" TEXT,
    "previousInvoiceAmount" REAL NOT NULL DEFAULT 0,
    "includePreviousInvoiceInNet" BOOLEAN NOT NULL DEFAULT false,
    "netPayable" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Invoice" ("accountNumber", "accountTitle", "accountsFeeRate", "accountsFeeTotal", "accountsFeeWeeks", "address", "companyName", "contactNumber", "createdAt", "discountAmount", "dispatchPercent", "dotNumber", "dueDate", "fineAmount", "fineReason", "grossAmount", "id", "includePreviousInvoiceInNet", "invoiceEnd", "invoiceNumber", "invoiceStart", "mcNumber", "netPayable", "notes", "ownerName", "previousInvoiceAmount", "referralBonus", "totalDispatchAmount", "totalLoadAmount", "updatedAt") SELECT "accountNumber", "accountTitle", "accountsFeeRate", "accountsFeeTotal", "accountsFeeWeeks", "address", "companyName", "contactNumber", "createdAt", "discountAmount", "dispatchPercent", "dotNumber", "dueDate", "fineAmount", "fineReason", "grossAmount", "id", "includePreviousInvoiceInNet", "invoiceEnd", "invoiceNumber", "invoiceStart", "mcNumber", "netPayable", "notes", "ownerName", "previousInvoiceAmount", "referralBonus", "totalDispatchAmount", "totalLoadAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
