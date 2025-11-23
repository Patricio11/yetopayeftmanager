# 🏦 Bank Ordering Feature - Complete Implementation

## Overview

This feature allows administrators to manually arrange the display order of banks in the admin dashboard. The order set by admins will be reflected in the payment page (`/pay/[token]`) where customers select their bank for EFT payments.

---

## ✅ Implementation Summary

### 1. **Database Schema Update**

Added `displayOrder` field to `eftBanks` table:

```typescript
// lib/db/schema/eft.ts
export const eftBanks = pgTable("eft_banks", {
  // ... existing fields
  displayOrder: integer("display_order").default(0), // Order for display in payment page
  // ... existing fields
}, (table) => ({
  displayOrderIdx: index("eft_banks_display_order_idx").on(table.displayOrder),
}));
```

**Migration:**
- Generated: `lib/db/migrations/0001_boring_peter_quill.sql`
- Applied: ✅ Successfully pushed to database

---

### 2. **API Endpoint**

Created new endpoint for reordering banks:

**`PATCH /api/admin/banks/reorder`**

**Request Body:**
```json
{
  "bankOrders": [
    { "id": "uuid-1", "displayOrder": 0 },
    { "id": "uuid-2", "displayOrder": 1 },
    { "id": "uuid-3", "displayOrder": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bank order updated successfully"
}
```

**Authorization:** Admin only

**File:** `app/api/admin/banks/reorder/route.ts`

---

### 3. **Frontend Implementation**

#### **Drag-and-Drop UI**

Updated `components/dashboard/BanksManagementClient.tsx`:

**Features:**
- ✅ HTML5 drag-and-drop API
- ✅ Drag handle icon (GripVertical) on each row
- ✅ Visual feedback during drag (opacity change)
- ✅ "Save Order" button appears when order changes
- ✅ Real-time reordering in the UI
- ✅ Persists order to database

**User Experience:**
1. Admin drags bank rows up/down using the grip handle
2. Order updates instantly in the UI
3. "Save Order" button appears when changes are made
4. Click "Save Order" to persist changes
5. Success message confirms save

**Visual Indicators:**
- 🔵 Blue "Save Order" button when order changed
- 🟢 Grip handle icon for drag affordance
- 👻 Dragged row becomes semi-transparent

---

### 4. **Backend Updates**

#### **Banks Page Query**
Updated `app/dashboard/banks/page.tsx` to fetch banks ordered by `displayOrder`:

```typescript
const banks = await db
  .select({ /* ... */ })
  .from(eftBanks)
  .orderBy(eftBanks.displayOrder, desc(eftBanks.createdAt));
```

#### **Payment Init Route**
Updated `app/api/eft/transactions/[token]/init/route.ts` to return banks in display order:

```typescript
const enabledBanks = await db.query.eftBanks.findMany({
  where: eq(eftBanks.enabled, true),
  orderBy: [asc(eftBanks.displayOrder)],
});
```

This ensures the payment page shows banks in the admin-configured order.

---

## 🎯 How It Works

### Admin Workflow

1. **Login as Admin**
   - Navigate to `/dashboard/banks`

2. **Reorder Banks**
   - Hover over a bank row
   - Grab the grip handle (⋮⋮) on the left
   - Drag the row up or down
   - Release to drop in new position

3. **Save Changes**
   - Click the blue "Save Order" button
   - Confirm success message
   - Order is now saved

### Customer Experience

1. **Payment Link**
   - Customer opens payment link (`/pay/[token]`)

2. **Bank Selection**
   - Banks appear in the order set by admin
   - Priority banks appear first
   - Customer selects their bank

---

## 🔧 Technical Details

### Drag-and-Drop Implementation

```typescript
// State management
const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
const [hasOrderChanged, setHasOrderChanged] = useState(false);

// Drag handlers
const handleDragStart = (index: number) => {
  setDraggedIndex(index);
};

const handleDragOver = (e: React.DragEvent, index: number) => {
  e.preventDefault();
  if (draggedIndex === null || draggedIndex === index) return;

  // Reorder array
  const newBanks = [...banks];
  const draggedBank = newBanks[draggedIndex];
  newBanks.splice(draggedIndex, 1);
  newBanks.splice(index, 0, draggedBank);

  setBanks(newBanks);
  setDraggedIndex(index);
  setHasOrderChanged(true);
};

const handleDragEnd = () => {
  setDraggedIndex(null);
};
```

### Save Operation

```typescript
const handleSaveOrder = async () => {
  const bankOrders = banks.map((bank, index) => ({
    id: bank.bank.id,
    displayOrder: index,
  }));

  const response = await fetch("/api/admin/banks/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bankOrders }),
  });

  // Handle response...
};
```

---

## 📊 Database Migration

### Initial Setup Script

For existing banks, run the one-time setup script:

```bash
npx tsx lib/db/update-bank-order.ts
```

**Output:**
```
🔄 Updating bank display order...
📊 Found 6 banks
✅ Updated African Bank - Order: 0
✅ Updated CapitecPay - Order: 1
✅ Updated Nedbank - Order: 2
✅ Updated ABSA - Order: 3
✅ Updated Standard Bank - Order: 4
✅ Updated FNB - Order: 5
✨ Bank order update complete!
```

---

## 🎨 UI Components

### Table Header
- Added empty column for grip handle
- Updated colspan for empty state

### Table Row
- Added `draggable` attribute
- Added drag event handlers
- Added grip icon in first cell
- Added conditional opacity for dragged row

### Save Button
- Conditional rendering (only when order changes)
- Blue gradient styling
- Disabled during save operation

---

## 🚀 Benefits

1. **Better UX for Merchants**
   - Popular/preferred banks can be shown first
   - Reduces customer scroll time
   - Improves conversion rates

2. **Admin Control**
   - Easy to prioritize partner banks
   - No code changes needed
   - Instant visual feedback

3. **Performance**
   - Indexed `displayOrder` column
   - Efficient queries with `ORDER BY`
   - No additional database hits

---

## 🧪 Testing Checklist

### Manual Testing

- [x] Can drag banks up and down
- [x] Visual feedback during drag
- [x] Save button appears on change
- [x] Order persists after save
- [x] Order reflected in payment page
- [x] Only admins can reorder
- [x] Database updated correctly
- [x] Page refresh maintains order

### Edge Cases

- [x] Single bank (no reordering needed)
- [x] No banks (empty state)
- [x] Network error during save
- [x] Concurrent admin edits
- [x] Disabled banks still orderable

---

## 🔐 Security

- ✅ Admin-only endpoint (`requireAuth` + role check)
- ✅ Input validation with Zod schema
- ✅ UUID validation for bank IDs
- ✅ Transaction-safe updates
- ✅ No SQL injection risks

---

## 📝 Future Enhancements

Potential improvements:

1. **Undo/Redo**
   - Add ability to revert changes before save

2. **Bulk Actions**
   - Move to top/bottom with one click
   - Sort alphabetically

3. **Per-Merchant Order**
   - Allow merchants to customize their own bank order
   - Override admin default

4. **Analytics**
   - Track which banks are most used
   - Auto-suggest optimal ordering

5. **Keyboard Navigation**
   - Arrow keys to reorder
   - Better accessibility

---

## 📚 Related Files

### Schema
- `lib/db/schema/eft.ts` - Database schema

### API Routes
- `app/api/admin/banks/reorder/route.ts` - Reorder endpoint
- `app/api/eft/transactions/[token]/init/route.ts` - Payment init

### Components
- `components/dashboard/BanksManagementClient.tsx` - Admin UI

### Pages
- `app/dashboard/banks/page.tsx` - Banks management page

### Migrations
- `lib/db/migrations/0001_boring_peter_quill.sql` - Add displayOrder column
- `lib/db/update-bank-order.ts` - One-time setup script

---

## 🎉 Deployment

### Vercel Deployment

The feature is production-ready:

1. ✅ TypeScript compilation passes
2. ✅ Build succeeds
3. ✅ Database migration applied
4. ✅ All routes registered

**Deploy to Vercel:**
```bash
git add .
git commit -m "feat: Add bank ordering with drag-and-drop"
git push
```

Vercel will automatically:
- Build the application
- Deploy the new API endpoint
- Update the frontend

**Post-Deployment:**
- Run migration on production database
- Run `update-bank-order.ts` to initialize existing banks

---

## 💡 Usage Tips

### For Admins

1. **Strategic Ordering**
   - Place most popular banks first
   - Consider regional preferences
   - Partner banks get priority

2. **Regular Updates**
   - Review order monthly
   - Adjust based on usage analytics
   - Test customer feedback

3. **Best Practices**
   - Keep top 3-5 banks easily accessible
   - Group similar banks together
   - Disable unused banks instead of deleting

---

## ✨ Summary

This feature provides a complete drag-and-drop bank ordering system that:
- ✅ Works seamlessly in the admin dashboard
- ✅ Reflects immediately on payment pages
- ✅ Persists across sessions
- ✅ Follows security best practices
- ✅ Provides excellent UX for admins
- ✅ Improves customer experience

**Status:** ✅ FULLY IMPLEMENTED & TESTED
