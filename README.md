# LegacyOS — Family Wealth Management Platform

LegacyOS is a family wealth operating system that combines secure document ingestion, AI-assisted financial insight, and a comprehensive net worth dashboard. It is built around two core pillars:

1. **PaperTrail** — A reusable document parsing service that accepts financial PDFs (mortgage statements, brokerage statements, life insurance illustrations, tax returns, etc.) and extracts structured data via the Claude API.
2. **Flo** — An AI financial companion that provides portfolio context, answers questions, and surfaces insights using a compliance-safe "information, not advice" framing.

---

## Architecture

```
LegacyOS/
├── backend/          # Node.js + Express API
│   ├── scripts/      # Database migrations / seed scripts
│   └── src/
│       ├── config/   # Database pool, env config
│       ├── middleware/  # Auth (JWT), rate limiters
│       ├── routes/   # Express route handlers
│       └── services/ # S3, Claude API, document parser
└── frontend/         # React 18 + TypeScript + Vite
    └── src/
        ├── components/  # Shared UI components (Layout, etc.)
        ├── context/     # React context (Auth)
        ├── pages/       # Route-level page components
        └── services/    # Axios API client
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, React Router v6, Recharts |
| Backend | Node.js, Express, PostgreSQL (pg) |
| Storage | AWS S3 |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Auth | JWT (access 15 min + refresh 7 days), Argon2id |
| Payments | Stripe Checkout + Webhooks |
| Equity Quotes | Polygon.io free tier |
| Deploy | Railway (backend) + Netlify (frontend) |

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- AWS account with an S3 bucket
- Anthropic API key
- Stripe account
- Polygon.io API key

### 1. Clone & Install

```bash
git clone <repo-url>
cd LegacyOS

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# Edit .env with your actual values
```

### 3. Set Up the Database

```bash
# Create database
createdb legacyos

# Run schema
cd backend
psql -d legacyos -f scripts/schema.sql
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### 5. Stripe Webhook (local testing)

```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
```

---

## Subscription Tiers

| Tier | Price | Features |
|---|---|---|
| Free | $0 | Dashboard, manual asset entry, 1 document parse/mo |
| Core | $349/yr | Unlimited document parsing, Flo chat, equity quotes |
| Premium | $899/yr | All Core + priority support, advanced analytics |

---

## PaperTrail Document Parser

The `documentParser` service (`backend/src/services/documentParser.js`) is designed to be cleanly separable as a standalone product. It accepts:

- **Document types:** `mortgage_statement`, `brokerage_statement`, `whole_life_statement`, `tax_return_1040`, `insurance_illustration`
- **Input:** S3 key pointing to a PDF
- **Output:** Structured JSON of extracted fields, ready for user confirmation before writing to assets

---

## Security Notes

- JWT access tokens expire in 15 minutes; refresh tokens in 7 days
- All passwords hashed with Argon2id
- Rate limiting on auth (5 req/15min), uploads (10 req/hr), API (100 req/15min)
- Flo AI assistant includes compliance framing: provides financial **information**, not **advice**
- Restricted assets (unvested equity, pending inheritance, etc.) are tracked separately and never included in net worth totals

---

## Deployment

### Backend (Railway)

1. Connect your GitHub repo to Railway
2. Set all environment variables from `.env.example`
3. Railway will auto-detect Node.js and run `npm start`

### Frontend (Netlify)

1. Connect your GitHub repo to Netlify
2. Set `VITE_API_URL` to your Railway backend URL
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add `_redirects` file with `/* /index.html 200` for SPA routing
