-- CreateTable
CREATE TABLE "Load" (
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
    "loadAmount" REAL NOT NULL DEFAULT 0,
    "dispatchPercent" REAL NOT NULL DEFAULT 0,
    "dispatchAmount" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
