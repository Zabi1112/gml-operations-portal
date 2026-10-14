# Settlement System - Quick Reference

## Database Changes Summary
✅ **New ENUM**: `AmountType` (PERCENTAGE | ABSOLUTE)

✅ **Schema Changes to InvoiceSettlement**:
```
ADDED:
  - totalAmountPKR (Float)           // Base amount
  - amountType (AmountType Enum)     // Type selector
  - dispatcherValue (Float)          // % or PKR
  - accountsValue (Float)            // % or PKR  
  - settlementDate (DateTime)        // When settled

MODIFIED:
  - invoiceId (now optional/nullable)

KEPT (for backward compatibility):
  - invoiceAmountUSD
  - usdRate
  - invoiceAmountPKR
  - dispatcherPercent
  - accountsPercent
```

## Backend API Endpoints

### New Endpoint
- `POST /finance/manual-settlement` - Create manual settlement (not tied to invoice)

### Modified Endpoint  
- `POST /finance/clear-invoice/:invoiceId` - Now accepts `amountType`, `dispatcherValue`, `accountsValue`

### Existing Endpoints
- `GET /finance/settlements?branchId=X` - Get all settlements
- `GET /finance/settings/:branchId` - Get finance settings
- `POST /finance/partners` - Create partner

## Frontend Pages

### New Page
- `/settlements` - Full settlement management (Admin only)
  - Create manual settlements
  - View settlement history
  - Real-time calculations
  - Partner breakdown

### Updated Navigation
- Layout.jsx sidebar now includes "Settlements" link

## Calculation Logic

### PERCENTAGE Mode
```
dispatcherAmount = (totalAmount × dispatcherValue) ÷ 100
accountsAmount = (totalAmount × accountsValue) ÷ 100
partnerProfit = totalAmount - dispatcherAmount - accountsAmount
partner shares are calculated after dispatch; the accounts fee is deducted
from the partner selected for that settlement
```

### ABSOLUTE Mode
```
dispatcherAmount = dispatcherValue (direct use)
accountsAmount = accountsValue (direct use)
partnerProfit = totalAmount - dispatcherAmount - accountsAmount
partner shares are calculated after dispatch; the accounts fee is deducted
from the partner selected for that settlement
```

When exactly one partner has a 70% share, that partner is selected by default.
The selection can be changed when clearing an invoice, creating a manual
settlement, or editing a settlement. If no unique 70% partner exists, select
the accounts-fee partner explicitly. The partner percentages must total 100%
when an accounts-fee partner is selected.

## Files Modified

### Backend
- `backend/prisma/schema.prisma` - Added AmountType enum, updated InvoiceSettlement
- `backend/src/controllers/finance.controller.js` - Added functions & helper
- `backend/src/routes/finance.routes.js` - Added new route

### Frontend
- `frontend/src/Pages/Settlements.jsx` - NEW component
- `frontend/src/Pages/Settlements.css` - NEW styles
- `frontend/src/App.jsx` - Added route import
- `frontend/src/components/Layout.jsx` - Added navigation link

### Database
- `backend/prisma/migrations/add_manual_settlements/migration.sql` - NEW

### Documentation
- `SETTLEMENT_SETUP_GUIDE.md` - Complete guide
- `SETTLEMENT_QUICK_REFERENCE.md` - This file

## Setup Checklist

- [ ] Run `npx prisma migrate deploy` in backend folder
- [ ] Run `npx prisma generate` in backend folder
- [ ] Restart backend service (`npm start`)
- [ ] Clear browser cache
- [ ] Test accessing `/settlements` page
- [ ] Try creating a manual settlement
- [ ] Verify calculations appear correctly

## Common Tasks

### Create Percentage-based Settlement
1. Go to Settlements page
2. Click "Add Manual Settlement"
3. Select "Percentage (%)" mode
4. Enter total amount
5. Enter dispatcher % (e.g., 25)
6. Enter accounts % (e.g., 10)
7. Confirm or change the partner paying the accounts fee
8. Review the partner breakdown and click "Save Settlement"

### Create Absolute-based Settlement
1. Go to Settlements page
2. Click "Add Manual Settlement"
3. Select "Absolute Amount (PKR)" mode
4. Enter total amount
5. Enter fixed dispatcher amount (e.g., 20,000)
6. Enter fixed accounts amount (e.g., 8,000)
7. Confirm or change the partner paying the accounts fee
8. Review the partner breakdown and click "Save Settlement"

### Download a Partner-Only Statement
Open the settlement from History and choose "Download [Partner] Statement".
That PDF contains only the company revenue, total given to dispatch, and that
partner's own net share; it does not include the accounts amount or any other
partner's name or share.

### Record Old Settlement
Same as above, just set the Settlement Date to when it was originally given

## Data Flow

```
Settlement Form
    ↓
Input Validation
    ↓
Calculate Amounts (helper function)
    ↓
Calculate Partner Splits
    ↓
Create Settlement Record (DB)
    ↓
Show in History Table
```

## Benefits

✅ Flexible amount handling (not just percentages)
✅ Support old settlements that were already given
✅ Real-time calculation preview
✅ Automatic partner distribution
✅ Clear audit trail with dates and user info
✅ Works with invoiced and non-invoiced amounts

## Support

For setup issues, refer to `SETTLEMENT_SETUP_GUIDE.md`
For API details, refer to same guide (API Documentation section)
