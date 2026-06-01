# Load Duplication Fix - Complete Guide

## ✅ SMART DEDUPLICATION SYSTEM IMPLEMENTED

### Problem Summary

Loads were being duplicated in the database from the following sources:

#### Three Entry Points:
1. **Daily Reports** → Creates loads with `source="DAILY_REPORT"` 
2. **Load Reports** → Only saves report metadata, NOT loads
3. **Invoices** → Was creating loads with `source="INVOICE"` (DUPLICATE)

### The Issue Flow:
```
1. User creates Daily Report → Saves loads to Load table (source="DAILY_REPORT")
2. User fetches loads in Invoice creation form → Gets loads from Load table
3. User saves Invoice → Loads get saved AGAIN
4. If user creates another invoice from same loads → Gets duplicate loads again
```

## Solution: Smart Deduplication

Now implements **intelligent duplicate detection**:

### How It Works

A load is considered a **duplicate** if it has the same:
- ✅ branchId
- ✅ companyId (if provided)
- ✅ truckId (if provided)
- ✅ pickup location
- ✅ dropoff location
- ✅ load date (same day)
- ✅ grossAmount/loadAmount (similar values)

### Behavior

#### For Daily Reports:
```
New load → Check if exists → 
  YES (duplicate) → Return 409 Conflict (skip save)
  NO → Save with source="DAILY_REPORT"
```

#### For Invoices:
```
Manual load in invoice → Check if exists →
  YES (duplicate) → Skip saving to Load table
  NO → Save to Load table with source="MANUAL"
```

## Files Modified/Created

### 1. **NEW: Load Deduplication Utility**
**File**: `backend/src/utils/loadDedup.js`

Three utility functions:
- `findDuplicateLoad(loadData)` - Check if load exists
- `createLoadSafely(loadData)` - Create load with dedup check
- `createLoadsSafely(loadsData)` - Batch create with dedup

Returns:
```javascript
{
  success: boolean,
  load: LoadObject,
  isDuplicate: boolean,
  message: string
}
```

### 2. **UPDATED: Load Controller**
**File**: `backend/src/controllers/load.controller.js`

Now uses `createLoadSafely()` for all load creation:
- Returns 409 if duplicate found
- Returns 201 if new load created
- Includes deduplication info in response

### 3. **UPDATED: Invoice Controller**
**File**: `backend/src/controllers/invoice.controller.js`

Now:
1. Creates InvoiceLoad (for invoice tracking) ✅
2. Uses `createLoadsSafely()` to save manual loads ✅
3. Returns deduplication results:
```javascript
{
  message: "Invoice created successfully",
  invoice: {...},
  loadsSaved: {
    created: 5,      // New loads saved
    duplicates: 3,   // Existing loads skipped
    errors: 0,       // Failed saves
    details: {...}
  }
}
```

### 4. **Migration to Clean Old Duplicates**
**File**: `backend/prisma/migrations/cleanup_duplicate_invoice_loads/migration.sql`

Removes loads with `source='INVOICE'` from production database.

## Implementation

### Step 1: Code Changes (Already Applied)
✅ Load deduplication utility created
✅ Load controller updated
✅ Invoice controller updated

### Step 2: Clean Production Database

Run this once to remove existing duplicates:

```bash
cd backend

# Option A: Using Prisma migrations (RECOMMENDED)
npx prisma migrate deploy

# Option B: Direct SQL
psql -d your_database_url < cleanup_duplicate_loads.sql
```

## API Response Examples

### Loading the same load twice (Duplicate)

**Request 1:**
```bash
POST /loads
{
  "branchId": 1,
  "companyId": 1,
  "truckId": 5,
  "pickup": "New York",
  "dropoff": "Boston",
  "loadDate": "2024-06-01",
  "grossAmount": 500,
  "source": "DAILY_REPORT"
}
```

**Response 1 (Status 201):**
```json
{
  "message": "Load created successfully",
  "load": {
    "id": 42,
    "branchId": 1,
    "pickup": "New York",
    "dropoff": "Boston",
    "source": "DAILY_REPORT"
  }
}
```

**Request 2 (Same load):**
```bash
POST /loads
{
  "branchId": 1,
  "companyId": 1,
  "truckId": 5,
  "pickup": "New York",
  "dropoff": "Boston",
  "loadDate": "2024-06-01",
  "grossAmount": 500,
  "source": "DAILY_REPORT"
}
```

**Response 2 (Status 409):**
```json
{
  "message": "Load already exists (ID: 42). Skipped to prevent duplication.",
  "isDuplicate": true,
  "load": {
    "id": 42,
    "branchId": 1,
    "pickup": "New York",
    "dropoff": "Boston",
    "source": "DAILY_REPORT"
  }
}
```

### Creating Invoice with Manual Loads

**Request:**
```bash
POST /invoices
{
  "branchId": 1,
  "companyId": 1,
  "loads": [
    { "date": "2024-06-01", "pickup": "NY", "dropoff": "BOS", "loadAmount": 500 },
    { "date": "2024-06-02", "pickup": "LA", "dropoff": "SD", "loadAmount": 600 }
  ]
}
```

**Response (Status 201):**
```json
{
  "message": "Invoice created successfully",
  "invoice": {
    "id": 10,
    "invoiceNumber": "INV-00010",
    "totalLoadAmount": 1100,
    "loads": [...]
  },
  "loadsSaved": {
    "created": 1,
    "duplicates": 1,
    "errors": 0,
    "details": {
      "created": [
        { "id": 99, "pickup": "LA", "dropoff": "SD", "source": "MANUAL" }
      ],
      "duplicates": [
        {
          "load": { "id": 42, "pickup": "NY", "dropoff": "BOS" },
          "message": "Load already exists (ID: 42). Skipped to prevent duplication."
        }
      ],
      "errors": []
    }
  }
}
```

## Verification

```sql
-- Should show all load sources
SELECT source, COUNT(*) as count FROM "Load" GROUP BY source;

-- Should return 0 or very small number (old duplicates)
SELECT COUNT(*) FROM "Load" WHERE source = 'INVOICE';

-- Check invoice loads are intact
SELECT COUNT(*) FROM "InvoiceLoad";
```

## Benefits

✅ **No Duplicates** - Same load not saved twice
✅ **All Loads Tracked** - New loads saved, existing loads skipped
✅ **Works Everywhere** - Daily Reports, Invoices, Batch imports
✅ **Smart Detection** - Checks actual load data, not just IDs
✅ **User Feedback** - API tells you what was saved vs skipped
✅ **Backward Compatible** - Works with existing data

## Future Prevention

- ✅ Daily Reports: Check dedup on save
- ✅ Invoices: Check dedup for manual loads
- ✅ Batch Imports: Use `createLoadsSafely()`
- ✅ No more source='INVOICE' duplicates

---

## How to Test

### Test 1: Add same load twice
```bash
# First time - should work
curl -X POST http://localhost:5000/loads \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": 1,
    "companyId": 1,
    "truckId": 5,
    "pickup": "NYC",
    "dropoff": "Boston",
    "loadDate": "2024-06-01",
    "grossAmount": 500
  }'

# Second time - should return 409 conflict
curl -X POST http://localhost:5000/loads \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": 1,
    "companyId": 1,
    "truckId": 5,
    "pickup": "NYC",
    "dropoff": "Boston",
    "loadDate": "2024-06-01",
    "grossAmount": 500
  }'
```

### Test 2: Add manual load in invoice that already exists
1. Create Daily Report with a load
2. Create Invoice with that same load as manual entry
3. System should skip saving duplicate to Load table
4. Response should show "duplicates: 1"
