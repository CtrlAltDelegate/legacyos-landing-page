# LegacyOS

A web platform that gives everyday families access to the tools and structure of a traditional multi-family office — without the high net worth requirement.

---

## What It Does

LegacyOS helps families build generational wealth through a structured system called **SIXWING** — six areas of personal family office management, each with five progressive levels:

| Wing | Focus |
|------|-------|
| Growth | ETFs, real estate, business ownership |
| Preservation | Emergency fund, insurance, risk mitigation |
| Philanthropy | Donor-advised funds, giving plans, family values |
| Experiences | Family travel, education, memory-making |
| Legacy | Wills, trusts, estate plans, long-term vision |
| Operations | Entity management, tax coordination, cashflow tools |

Users track progress across all six wings, earn a composite **Legacy Score**, and get a quarterly action plan (COA) based on their weakest areas.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js (JWT sessions)
- **Payments**: Stripe
- **Email**: Nodemailer
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Deployment**: Railway (full-stack) + Netlify (static frontend)

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup

```bash
git clone <repo-url>
cd legacyos-platform
npm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/legacyos"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional
STRIPE_SECRET_KEY="sk_..."
STRIPE_PUBLISHABLE_KEY="pk_..."
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### Database

```bash
npx prisma generate       # Generate Prisma client
npx prisma migrate dev    # Run migrations
npx prisma db seed        # Seed demo data
```

### Run

```bash
npm run dev               # Development server at localhost:3000
```

---

## Demo Accounts

Two families are pre-seeded after running `npx prisma db seed`:

| Family | Email | Password | Legacy Score |
|--------|-------|----------|-------------|
| The Johnson Family (Beginner) | demo@johnson.com | demo123 | 73 |
| The Rodriguez Family (Advanced) | demo@rodriguez.com | demo123 | 89 |

---

## Project Structure

```
legacyos-platform/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Demo data (TypeScript source)
│   └── seed.js                # Compiled seed script
├── src/
│   ├── components/
│   │   ├── dashboard/         # WingCard, LegacyScoreDisplay, ActionItemCard, StatsCard
│   │   ├── layout/            # DashboardLayout
│   │   └── ui/                # Base components (Button, etc.)
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── database.ts        # Prisma client singleton
│   │   ├── legacy-score.ts    # Score calculation logic
│   │   ├── wings-config.ts    # Wing definitions and levels
│   │   └── utils.ts           # Shared utilities
│   ├── pages/
│   │   ├── api/health.ts      # Health check endpoint
│   │   ├── _app.tsx           # App wrapper
│   │   ├── index.tsx          # Landing page
│   │   ├── login.tsx          # Login page
│   │   ├── register.tsx       # Registration page
│   │   ├── dashboard.tsx      # Main user dashboard
│   │   └── family.tsx         # Family management
│   ├── styles/globals.css
│   └── types/                 # TypeScript definitions
├── public/
├── Dockerfile
├── netlify.toml
└── railway.json
```

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Type-check + build for production
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript check only
```

```bash
npx prisma studio              # Visual DB browser
npx prisma migrate dev         # Dev migrations
npx prisma migrate deploy      # Production migrations
npx prisma generate            # Regenerate client after schema changes
```

---

## Deployment

### Railway (recommended — full-stack)
1. Create a Railway project and connect the GitHub repo
2. Add a PostgreSQL service
3. Set environment variables (see above)
4. Railway will build and deploy using the `Dockerfile`

### Netlify (static/frontend only)
1. Connect the GitHub repo to Netlify
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Set environment variables in Netlify dashboard

---

## Roadmap

**Phase 1 — MVP (done)**
- SIXWING system with 30 levels
- User auth and family accounts
- Progress tracking and Legacy Score
- COA action item generation
- Responsive dashboard

**Phase 2 — In progress**
- PDF quarterly report generation
- Family collaboration features
- Financial provider integrations
- Mobile app

**Phase 3 — Planned**
- AI-powered recommendations
- Professional advisor network
- Community features
- White-label licensing
