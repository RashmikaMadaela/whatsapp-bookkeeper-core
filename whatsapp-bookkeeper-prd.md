# Product Requirements Document (PRD): WhatsApp Bookkeeper Micro-SaaS

## 1. Project Overview
**Name:** WhatsApp Bookkeeper  
**Target Audience:** Small cafes, restaurants, and retail shops (Sri Lanka focus, currency: LKR).  
**Core Problem:** Small businesses rely on manual entry and WhatsApp image sharing for bookkeeping. It is time-consuming, error-prone, and provides no real-time P&L visibility.  
**Solution:** An automated WhatsApp bot that ingests both expense receipts and income records (via image or text), validates extracted data with the owner/staff via a human-in-the-loop confirmation step, and stores everything in a structured database. A lightweight Next.js dashboard provides real-time P&L reporting, income vs. expense analytics, and per-category breakdowns.

---

## 2. Technology Stack
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Backend / Webhook Server:** Node.js with Express.js
* **Frontend / Dashboard:** Next.js (App Router), Tailwind CSS, Recharts
* **AI Integration:** Google Gemini API (`gemini-2.5-flash`)
* **External APIs:** Meta WhatsApp Cloud API

---

## 3. System Architecture & Data Flow

### 3.1. Image-Based Entry (with Human-in-the-Loop)
1. **Ingestion:** Staff sends a receipt/POS summary image to the WhatsApp Business number, optionally prefixed with a keyword (e.g., "income", "sale", or bare image defaults to expense).
2. **Webhook Trigger:** Meta WhatsApp API POSTs to `POST /webhook`.
3. **Processing:** Backend downloads the media → sends to Gemini → receives structured JSON.
4. **Confirmation Request:** Bot sends a confirmation summary to the user (does NOT save yet).
5. **User Reply:**
   - `ok` / `yes` → save with `isConfirmed: true`.
   - Key-value corrections (e.g., `amount 1500 category Supplies`) → patch fields → save with `isConfirmed: true`.
   - `cancel` → discard entry.
   - No reply within 5 minutes → auto-save with `isConfirmed: false` (flagged in dashboard).
6. **Visualization:** Next.js dashboard shows all transactions; unconfirmed rows are highlighted.

### 3.2. Text-Based Quick Entry (No Confirmation)
Staff types a structured command and the entry is saved immediately:
- `income 15000 dine-in cash`
- `expense 2500 vegetables groceries`
- `report today` / `report week` / `report month`
- `help`

### 3.3. Message Routing Priority
```
Incoming message from senderId
│
├── 1. Pending confirmation exists for this senderId?
│       └── YES → confirmationHandler (ok / patch fields / cancel)
│
├── 2. Has image?
│       ├── caption starts with "income" / "sale" → incomeHandler → Gemini → pendingStore
│       └── no caption or caption "expense"       → expenseHandler → Gemini → pendingStore
│
└── 3. Text command
        ├── "income ..."  → parse → save directly
        ├── "expense ..."  → parse → save directly
        ├── "report ..."  → reportHandler → P&L text summary
        └── "help"        → menu reply
```

---

## 4. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TransactionType {
  INCOME
  EXPENSE
}

model Transaction {
  id            String          @id @default(uuid())
  type          TransactionType
  date          DateTime
  amount        Float
  vendor        String?         // Expense: shop/business name; Income: null
  description   String?         // Optional free-text note
  category      String          // Expense: "Food/Beverage"|"Groceries"|"Utilities"|"Transport"|"Supplies"|"Other"
                                // Income:  "Dine-in"|"Takeout"|"Delivery"|"Catering"|"Other"
  paymentMethod String?         // "Cash"|"Card"|"Digital"|"Platform Payout"
  platform      String?         // Delivery income only: "Uber Eats"|"PickMe Food"|"Other"
  receiptUrl    String?         // Optional cloud storage link to original image
  isConfirmed   Boolean         @default(true)  // false = auto-timed-out, needs dashboard review
  senderId      String          // WhatsApp phone number of the sender (multi-staff tracking)
  rawText       String?         // Original message text for audit trail
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}
```

---

## 5. Backend Requirements (Express Webhook)

### 5.1. Webhook Verification (`GET /webhook`)
- Validate `hub.verify_token` against `process.env.VERIFY_TOKEN`.
- Return `hub.challenge` with `200 OK`.

### 5.2. Webhook Payload Handler (`POST /webhook`)
- Return `200 OK` immediately, then process asynchronously (duplicate-payload safe).
- Extract `senderId`, message type (image / text), and caption.

### 5.3. Pending State Store (`pendingStore.js`)
In-memory `Map` keyed by `senderId`:
```js
{
  data: { date, amount, vendor, category, paymentMethod, platform },
  type: "INCOME" | "EXPENSE",
  timer: NodeJS.Timeout  // 5-min auto-save with isConfirmed=false
}
```

### 5.4. AI Extraction — Expense Prompt
- **Model:** `gemini-2.5-flash`, `responseMimeType: "application/json"`
- Extract: `date` (YYYY-MM-DD | null), `total_amount` (number), `vendor` (string), `category` (one of `["Food/Beverage","Groceries","Utilities","Transport","Supplies","Other"]`).
- Unreadable: `{ "error": "unreadable" }`.

### 5.5. AI Extraction — Income Prompt
- **Model:** `gemini-2.5-flash`, `responseMimeType: "application/json"`
- Extract: `date` (YYYY-MM-DD | null), `total_amount` (number), `source` (one of `["Dine-in","Takeout","Delivery","Catering","Mixed"]`), `payment_method` (string | null), `platform` (string | null, delivery only).
- Unreadable: `{ "error": "unreadable" }`.

### 5.6. Confirmation Message Format
```
📋 Please confirm this entry:
Type:     Expense
Date:     2026-04-21
Amount:   LKR 2,500
Vendor:   Lak Stores
Category: Groceries

Reply *ok* to save.
To correct: type field + value (e.g., "amount 1500 category Supplies")
Reply *cancel* to discard.
```
Correctable fields — **Expense:** `amount`, `vendor`, `category`, `date` | **Income:** `amount`, `source`, `payment`, `platform`, `date`.

### 5.7. Outbound Messaging
- **Income saved:** `✅ Income logged: LKR [amount] from [category] ([paymentMethod]).`
- **Expense saved:** `✅ Expense logged: LKR [amount] at [vendor] for [category].`
- **Unreadable:** `❌ Couldn't read that clearly. Type: income/expense [amount] [details]`
- **Cancelled:** `🗑️ Entry discarded.`
- **Report (text):**
  ```
  📊 Today — 21 Apr 2026
  Income:     LKR 24,500
  Expenses:   LKR  8,200
  ─────────────────────
  Net Profit: LKR 16,300
  ```

---

## 6. Project Structure

```
/
├── backend/
│   ├── server.js
│   ├── handlers/
│   │   ├── messageHandler.js    # routing logic
│   │   ├── incomeHandler.js
│   │   ├── expenseHandler.js
│   │   ├── confirmationHandler.js
│   │   └── reportHandler.js
│   ├── services/
│   │   ├── whatsappService.js   # media download + send message
│   │   ├── geminiService.js     # expense + income AI prompts
│   │   └── prismaService.js     # all DB queries
│   └── store/
│       └── pendingStore.js      # in-memory Map + auto-save timer
├── frontend/                    # Next.js App Router
│   ├── app/
│   │   ├── dashboard/page.tsx
│   │   ├── income/page.tsx
│   │   ├── expenses/page.tsx
│   │   └── reports/page.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── TransactionTable.tsx
│   │   ├── PLChart.tsx
│   │   ├── IncomePieChart.tsx
│   │   └── ExpensePieChart.tsx
│   └── lib/
│       └── actions.ts           # server actions: getTransactions, getMonthlyPL, getByCategory
├── prisma/
│   └── schema.prisma
├── extract.js                   # legacy (superseded by geminiService.js)
├── package.json
└── .env
```

---

## 7. Frontend Requirements (Next.js Dashboard)

### 7.1. Pages
- **`/dashboard`:** Monthly P&L summary header, unified `TransactionTable` with all records.
- **`/income`:** Income-only table + `IncomePieChart` (by source/category).
- **`/expenses`:** Expense-only table + `ExpensePieChart` (by category).
- **`/reports`:** `PLChart` — income vs. expenses bar chart (by day/week/month toggle).

### 7.2. TransactionTable
- Columns: Date, Type, Vendor/Source, Category, Amount, Payment Method, Confirmed.
- Unconfirmed rows (`isConfirmed: false`) highlighted in amber — review badge.
- Sortable by Date (default: descending).

### 7.3. Server Actions (`lib/actions.ts`)
- `getTransactions(filter?)` — all or filtered by type, ordered by date DESC.
- `getMonthlyPL(year, month)` — sum income, sum expenses, net profit.
- `getIncomeBySource(year, month)` — aggregate income grouped by category.
- `getExpensesByCategory(year, month)` — aggregate expenses grouped by category.

---

## 8. Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bookkeeper
GEMINI_API_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
VERIFY_TOKEN=
```

---

## 9. Implementation Phases

- **Phase 1 — DB:** `npx prisma init`, write `Transaction` schema with `TransactionType` enum, run `npx prisma db push`. *(commit)*
- **Phase 2 — Backend Core:** `backend/server.js`, `GET`/`POST /webhook`, `whatsappService.js`. *(commit)*
- **Phase 3 — Intent Router:** `messageHandler.js` (pending-check → image routing → text commands). *(commit)*
- **Phase 4 — AI Extraction:** `geminiService.js` (expense + income prompts), `expenseHandler.js`, `incomeHandler.js` (Gemini → pendingStore → send confirmation). *(commit)*
- **Phase 5 — Confirmation Handler:** `confirmationHandler.js` (ok/patch/cancel), `pendingStore.js` (Map + 5-min timer). *(commit)*
- **Phase 6 — Text Commands + Reports:** text parser in `messageHandler.js`, `reportHandler.js`. *(commit)*
- **Phase 7 — DB Service Layer:** `prismaService.js` (CRUD + aggregation queries). *(commit)*
- **Phase 8 — Next.js Frontend:** Scaffold pages, `TransactionTable`, `PLChart`, `IncomePieChart`, `ExpensePieChart`, server actions. *(commit)*
