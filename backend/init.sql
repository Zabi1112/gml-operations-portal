-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."BillingType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'VIEWER',
    "employeeId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "cnic" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Driver',
    "salaryType" TEXT NOT NULL DEFAULT 'FIXED',
    "fixedSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Driver" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "companyId" INTEGER,
    "truckId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalarySlip" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "designation" TEXT,
    "cnic" TEXT,
    "salaryType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dispatchCompany" TEXT,
    "dispatchAmountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employeeShareUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usdRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedSalaryPKR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalaryPKR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loanDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalaryPKR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalarySlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER,
    "companyName" TEXT,
    "ownerName" TEXT,
    "mcNumber" TEXT,
    "dotNumber" TEXT,
    "address" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "billingType" "public"."BillingType" NOT NULL DEFAULT 'PERCENTAGE',
    "dispatchPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedMonthlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "truckNumbers" TEXT,
    "driverNames" TEXT,
    "invoiceNumber" TEXT,
    "invoiceStart" TIMESTAMP(3) NOT NULL,
    "invoiceEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "accountNumber" TEXT,
    "accountTitle" TEXT,
    "accountsFeeWeeks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountsFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountsFeeTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLoadAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDispatchAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedBillingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "truckRateBreakdown" JSONB,
    "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fineReason" TEXT,
    "previousInvoiceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "includePreviousInvoiceInNet" BOOLEAN NOT NULL DEFAULT false,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceLoad" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pickup" TEXT NOT NULL,
    "dropoff" TEXT NOT NULL,
    "loadAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "ownerName" TEXT,
    "mcNumber" TEXT,
    "dotNumber" TEXT,
    "address" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "billingType" "public"."BillingType" NOT NULL DEFAULT 'PERCENTAGE',
    "dispatchPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedMonthlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountNumber" TEXT,
    "accountTitle" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Truck" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "truckNumber" TEXT NOT NULL,
    "trailerNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Load" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER,
    "truckId" INTEGER,
    "driverId" INTEGER,
    "companyName" TEXT,
    "truckNumber" TEXT,
    "driverName" TEXT,
    "loadDate" TIMESTAMP(3) NOT NULL,
    "pickupDate" TIMESTAMP(3),
    "dropoffDate" TIMESTAMP(3),
    "pickup" TEXT NOT NULL,
    "dropoff" TEXT NOT NULL,
    "miles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerMile" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loadAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoadReportReason" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER,
    "truckId" INTEGER,
    "companyName" TEXT,
    "truckNumber" TEXT,
    "reasonDate" TIMESTAMP(3) NOT NULL,
    "reasonType" TEXT NOT NULL,
    "reasonNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadReportReason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."Driver" ADD CONSTRAINT "Driver_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Driver" ADD CONSTRAINT "Driver_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "public"."Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceLoad" ADD CONSTRAINT "InvoiceLoad_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Truck" ADD CONSTRAINT "Truck_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

