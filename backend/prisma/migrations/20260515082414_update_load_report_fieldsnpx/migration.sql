-- CreateTable
CREATE TABLE "LoadReportReason" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER,
    "truckId" INTEGER,
    "companyName" TEXT,
    "truckNumber" TEXT,
    "reasonDate" DATETIME NOT NULL,
    "reasonType" TEXT NOT NULL,
    "reasonNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Load" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER,
    "truckId" INTEGER,
    "driverId" INTEGER,
    "companyName" TEXT,
    "truckNumber" TEXT,
    "driverName" TEXT,
    "loadDate" DATETIME NOT NULL,
    "pickup" TEXT NOT NULL,
    "dropoff" TEXT NOT NULL,
    "miles" REAL NOT NULL DEFAULT 0,
    "ratePerMile" REAL NOT NULL DEFAULT 0,
    "grossAmount" REAL NOT NULL DEFAULT 0,
    "loadAmount" REAL NOT NULL DEFAULT 0,
    "dispatchPercent" REAL NOT NULL DEFAULT 0,
    "dispatchAmount" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Load" ("companyId", "companyName", "createdAt", "dispatchAmount", "dispatchPercent", "driverId", "driverName", "dropoff", "id", "loadAmount", "loadDate", "pickup", "source", "truckId", "truckNumber", "updatedAt") SELECT "companyId", "companyName", "createdAt", "dispatchAmount", "dispatchPercent", "driverId", "driverName", "dropoff", "id", "loadAmount", "loadDate", "pickup", "source", "truckId", "truckNumber", "updatedAt" FROM "Load";
DROP TABLE "Load";
ALTER TABLE "new_Load" RENAME TO "Load";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
