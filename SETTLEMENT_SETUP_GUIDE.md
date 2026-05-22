# Settlement Management System - Setup & Implementation Guide

## Overview
This implementation adds flexible settlement management to GML Portal with support for:
- **Percentage-based settlements**: Calculate dispatcher & accounts amounts as percentages
- **Absolute-based settlements**: Enter fixed PKR amounts for dispatcher & accounts
- **Manual settlements**: Record old settlements that were already given (not tied to invoices)
- **Automatic partner calculation**: Partners get the remaining profit after dispatcher & accounts

## What Was Changed

### 1. Database Schema Updates (`backend/prisma/schema.prisma`)

#### New ENUM: `AmountType`
```prisma
enum AmountType {
  PERCENTAGE
  ABSOLUTE
}
```

#### Updated `InvoiceSettlement` Model
- Made `invoiceId` optional (nullable) to support manual settlements
- New field `totalAmountPKR`: Base amount for calculations
- New field `amountType`: Specifies if amounts are percentages or absolute values
- Changed `dispatcherPercent` → `dispatcherValue` (can be % or PKR)
- Changed `accountsPercent` → `accountsValue` (can be % or PKR)
- Added `settlementDate`: Track when settlement occurred
- Removed direct USD fields (redundant with flexible PKR system)

### 2. Backend Updates

#### Finance Controller (`backend/src/controllers/finance.controller.js`)
- **New helper function**: `calculateSettlementAmounts()` - Handles both percentage and absolute calculations
- **Updated `clearInvoice()`**: Now supports `amountType` parameter
- **New function**: `createManualSettlement()` - Create settlements without invoices for old records

#### Finance Routes (`backend/src/routes/finance.routes.js`)
- New endpoint: `POST /finance/manual-settlement` - Create manual settlements

### 3. Frontend Implementation

#### New Settlements Page (`frontend/src/Pages/Settlements.jsx`)
Features:
- **Form to create manual settlements** with:
  - Total amount received (PKR)
  - Toggle between percentage and absolute amounts
  - Dispatcher allocation
  - Accounts allocation
  - Real-time calculation preview
  - Partner breakdown
- **Settlement history table** showing all settlements
- **Auto-calculation** of partner amounts

#### Updated Routing
- `App.jsx`: Added Settlements route
- `Layout.jsx`: Added Settlements navigation link (Admin only)

## Setup Instructions

### Step 1: Update Database Schema

#### Option A: Using Prisma Migrations (Recommended)
```bash
cd backend
npx prisma migrate deploy
```

#### Option B: Manual SQL (if migrations don't work)
Run the SQL from `backend/prisma/migrations/add_manual_settlements/migration.sql` directly on your PostgreSQL database.

### Step 2: Regenerate Prisma Client
```bash
cd backend
npx prisma generate
```

### Step 3: Restart Backend Services
```bash
# In backend directory
npm start
```

### Step 4: Verify Frontend Routes
The Settlements page should now be accessible at: `/settlements`

## API Documentation

### Create Manual Settlement
**Endpoint**: `POST /finance/manual-settlement`
**Auth**: Required (Admin)

**Request Body**:
```json
{
  "branchId": 1,
  "totalAmountPKR": 100000,
  "amountType": "PERCENTAGE",  // or "ABSOLUTE"
  "dispatcherValue": 25,       // 25% or 25000 PKR (depends on amountType)
  "accountsValue": 10,         // 10% or 10000 PKR (depends on amountType)
  "companyName": "ABC Company",
  "settlementDate": "2024-01-15",
  "notes": "Old settlement from December"
}
```

**Response**:
```json
{
  "message": "Manual settlement created successfully",
  "settlement": {
    "id": 1,
    "branchId": 1,
    "totalAmountPKR": 100000,
    "amountType": "PERCENTAGE",
    "dispatcherValue": 25,
    "dispatcherAmountPKR": 25000,
    "accountsValue": 10,
    "accountsAmountPKR": 10000,
    "partnerProfitPKR": 65000,
    "partnerSplits": [
      {
        "partnerId": 1,
        "name": "Partner A",
        "percent": 50,
        "amountPKR": 32500
      },
      {
        "partnerId": 2,
        "name": "Partner B",
        "percent": 50,
        "amountPKR": 32500
      }
    ],
    "clearedBy": "admin@example.com",
    "settlementDate": "2024-01-15T00:00:00Z",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

### Get All Settlements
**Endpoint**: `GET /finance/settlements?branchId=1`
**Auth**: Required (Admin)

**Response**: Array of settlement objects

### Update Invoice Settlement (Modified)
**Endpoint**: `POST /finance/clear-invoice/:invoiceId`
**Auth**: Required (Admin)

**Request Body** (now supports both types):
```json
{
  "invoiceAmountUSD": 5000,
  "usdRate": 277,
  "amountType": "PERCENTAGE",  // NEW: option to use ABSOLUTE
  "dispatcherValue": 25,       // NEW: flexible value field
  "accountsValue": 10,         // NEW: flexible value field
  "notes": "Invoice cleared"
}
```

## Usage Examples

### Example 1: Percentage-based Settlement (Traditional)
```json
{
  "branchId": 1,
  "totalAmountPKR": 100000,
  "amountType": "PERCENTAGE",
  "dispatcherValue": 25,       // 25%
  "accountsValue": 10,         // 10%
  "companyName": "XYZ Transport"
}
```
**Results**:
- Dispatcher: 25,000 PKR (25%)
- Accounts: 10,000 PKR (10%)
- Partners: 65,000 PKR (remainder)

### Example 2: Absolute-based Settlement (Fixed Amounts)
```json
{
  "branchId": 1,
  "totalAmountPKR": 100000,
  "amountType": "ABSOLUTE",
  "dispatcherValue": 20000,    // Fixed amount in PKR
  "accountsValue": 8000,       // Fixed amount in PKR
  "companyName": "Old Settlement from Nov"
}
```
**Results**:
- Dispatcher: 20,000 PKR (fixed)
- Accounts: 8,000 PKR (fixed)
- Partners: 72,000 PKR (remainder)

## Features & Calculations

### Percentage Mode
- Input: Percentage values for dispatcher and accounts
- Calculation: `amount = (totalAmount × percentage) ÷ 100`
- Use case: Standard settlements based on percentages

### Absolute Mode
- Input: Fixed PKR amounts for dispatcher and accounts
- Calculation: Direct use of entered values
- Use case: Old settlements, special deals, custom arrangements

### Partner Distribution
- Automatically calculated as: `totalAmount - dispatcher - accounts`
- Split among partners based on their configured percentages
- Shown in real-time preview while entering values

## Field Mapping

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| invoiceAmountPKR | totalAmountPKR | Base amount for calculations |
| dispatcherPercent | dispatcherValue | Now flexible (% or PKR) |
| accountsPercent | accountsValue | Now flexible (% or PKR) |
| — | amountType | NEW: PERCENTAGE or ABSOLUTE |
| — | invoiceId (optional) | Made nullable for manual settlements |
| — | settlementDate | Track settlement date |

## Important Notes

⚠️ **Data Migration**:
- Old settlements will be automatically migrated with `amountType = PERCENTAGE`
- Historical percentages are preserved
- No data loss during migration

✅ **Backward Compatibility**:
- Invoice clearing still works as before
- Existing settlements are unchanged
- Can mix percentage and absolute settlements

🔄 **Calculation Logic**:
- Partner amounts are always calculated as: `totalAmount - dispatcher - accounts`
- No validation that dispatcher + accounts < total (allows negative partner profit if needed)
- All calculations work with decimal precision

## Troubleshooting

### Migration Issues
```bash
# If migration fails, reset and try again
npx prisma migrate reset
# Then run migrations again
npx prisma migrate deploy
```

### Schema Sync Issues
```bash
# Regenerate Prisma client
npx prisma generate
# Verify schema
npx prisma db push --force-reset
```

### Frontend Not Showing Settlements Link
- Clear browser cache
- Check if logged-in user is ADMIN role
- Verify Layout.jsx changes were applied

### Settlement Calculation Not Matching
- Check if amountType is set correctly in the database
- Verify partner percentages sum to 100% (or less if intentional)
- Check console for calculation errors

## Future Enhancements

Consider adding:
- Settlement edit/delete functionality
- Bulk settlement import for old records (CSV)
- Settlement reconciliation reports
- Partner payment status tracking
- Settlement status (pending/paid/verified)
- Audit trail for settlement changes
