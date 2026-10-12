# SellMate UAE - Deployment & Architecture Guide

## Overview
SellMate UAE is a merchant companion application built for UAE retail commerce (Instagram, WhatsApp, TikTok, and direct sales in Dubai, Abu Dhabi, Sharjah, and all 7 Emirates).

---

## Phase 1: Local Prototype & Consistency Improvements
1. **Atomic Inventory Accounting & Double-Deduction Prevention**:
   - Order reservation deducts product stock once upon placement.
   - Advancing status (`pending` -> `confirmed` -> `shipped` -> `delivered`) maintains existing reservation without repeated deduction.
   - Order cancellation or returns automatically restock inventory via an immutable ledger entry.
   - Duplicate cancellation calls inspect the movement ledger and never double-restock.
   - Reactivating a cancelled order validates stock availability before re-deducting.
2. **Arabic Right-to-Left (RTL) & English Mobile UI**:
   - Full bilingual switcher toggling `dir="rtl"` and `dir="ltr"`.
   - Typography powered by Cairo (Arabic) and Plus Jakarta Sans (English).
   - Mobile-first responsive app bar and touch targets (≥ 44px).
3. **Automated Verification Test Suite**:
   - Built-in test suite running 5 automated suites:
     - Suite 1: Profit & Net Margin (Revenue, COGS, Shipping, COD surcharge, UAE VAT 5%).
     - Suite 2: Zero Revenue & Loss handling (Division-by-zero protection, negative margins).
     - Suite 3: Lifecycle Stock Guard (Zero double-deduction across status changes).
     - Suite 4: Cancellation Restocking & Double-Restock Prevention.
     - Suite 5: Stock Sufficiency & Atomic Rollback Guard.

---

## Phase 2: Supabase PostgreSQL Backend & RLS
The database migration script is located in:
`supabase/migrations/20261010_sellmate_schema.sql`

### Tables:
- `public.profiles`: Business accounts (TRN number, currency AED, VAT registration, default Emirate).
- `public.products`: Catalog items (SKU, cost price, selling price, current stock, reorder point).
- `public.orders`: Customer orders (Emirate, channel, payment method, fees, VAT, net profit).
- `public.order_items`: Order line items with historical snapshot of unit prices and costs.
- `public.inventory_movements`: Immutable stock ledger tracking every deduction, restock, and adjustment.

### Security & ACID Procedures:
- **Row-Level Security (RLS)**: Enforced across all tables so merchants can only access records belonging to `auth.uid()`.
- **`create_order_atomic`**: Locks rows (`FOR UPDATE`), validates stock sufficiency, inserts order and line items, deducts stock, and records ledger entry in a single atomic transaction.
- **`update_order_status_atomic`**: Inspects prior movement history to prevent duplicate restocks when orders are cancelled or returned.

### Migration from Prototype:
- Click **Cloud & Settings** in the app.
- Click **"Export Local Data as Supabase SQL Migration"** to copy complete `INSERT` statements populated with current local data.
- Run the SQL in Supabase SQL Editor.

---

## Phase 3: Server-Side AI Customer Reply Generator
- **Server Endpoint**: `POST /api/generate-reply` running in Express (`server.ts`).
- **AI Model**: `@google/genai` using `gemini-3.8-flash`.
- **Security & Privacy**:
  - API keys are accessed solely on the server via `process.env.GEMINI_API_KEY`.
  - Only non-sensitive parameters are passed (Name, Order #, items summary, Emirate, COD amount).
- **Tone Presets**:
  - Emirati / Khaleeji Retail (لهجة إماراتية خليجية)
  - Warm & Friendly
  - Professional Business
  - Short & Direct
- **Rate-Limit Resilience & AED 0 Budget**:
  - If Gemini API quota is reached or offline, the server instantly serves a crafted fallback template at AED 0 cost.
  - Messages are always drafts that the merchant can review and edit before sending.
  - 1-click "Send via WhatsApp" (`https://wa.me/971...`) and "Copy Message".

---

## Step-by-Step Verification Instructions

1. **Verify Profit Calculations**:
   - Navigate to **Profit Calc** tab.
   - Adjust Selling Price to 250 AED, COGS to 80 AED, Courier Cost to 18 AED (Dubai), COD fee to 8 AED.
   - Observe live Net Profit (138.50 AED) and Net Margin (51.3%), including 5% UAE VAT.
2. **Verify Inventory Ledger & Cancellation Restock**:
   - Navigate to **Catalog & Stock** tab and observe stock of `Royal Amber Oud` (18 units).
   - Create a New Order for 2 units in Dubai. Observe stock immediately decrease to 16 units.
   - In **Orders**, update status from `Pending` -> `Confirmed` -> `Shipped`. Stock remains 16 units (No double-deduction).
   - In **Orders**, click `Cancel Order`. Observe stock immediately restore to 18 units with an audit ledger entry.
   - In **Catalog & Stock**, click `Inventory Movements Ledger` to view the before/after audit trail.
3. **Verify Automated Test Suite**:
   - Click the green `5/5 Verified` badge in the header.
   - Click `Run Test Suite Now` to execute all 5 suites live in the browser.
4. **Verify AI Customer Reply**:
   - In **Orders**, click `Generate Reply` on any order.
   - Select Khaleeji Arabic or English, and pick a scenario (e.g. Order Confirmation or COD Reminder).
   - Click `Generate AI Draft Message` and observe the tailored WhatsApp-ready response.
