-- CreateTable
CREATE TABLE "SalarySlip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "designation" TEXT,
    "salaryType" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "dispatchCompany" TEXT,
    "dispatchAmountUSD" REAL NOT NULL DEFAULT 0,
    "commissionPercent" REAL NOT NULL DEFAULT 0,
    "employeeShareUSD" REAL NOT NULL DEFAULT 0,
    "usdRate" REAL NOT NULL DEFAULT 0,
    "fixedSalaryPKR" REAL NOT NULL DEFAULT 0,
    "grossSalaryPKR" REAL NOT NULL DEFAULT 0,
    "loanDeduction" REAL NOT NULL DEFAULT 0,
    "advanceDeduction" REAL NOT NULL DEFAULT 0,
    "otherDeduction" REAL NOT NULL DEFAULT 0,
    "netSalaryPKR" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
