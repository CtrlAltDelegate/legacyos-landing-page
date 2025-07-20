# LegacyOS - Your Family Office for Generational Wealth

A comprehensive platform designed to give everyday families and first-generation wealth builders access to the systems, strategy, and structure of a traditional multi-family office—without the high net worth requirement.

## 🚀 The SIXWING System

LegacyOS is built around six core "wings" of personal family office management:

- **🚀 Growth** – investing in ETFs, real estate, business ownership
- **🛡️ Preservation** – emergency fund, insurance, risk mitigation
- **❤️ Philanthropy** – donor-advised funds, giving plans, family values
- **🌟 Experiences** – family travel, education, memory-making
- **📜 Legacy** – wills, trusts, estate plans, long-term vision
- **⚙️ Operations** – entity management, tax coordination, cashflow tools

Each user progresses through 5 levels per wing, with clearly defined milestones and actionable steps.

## ✨ Features

### MVP Core Features
- **User Dashboard** - Progress tracking across all 6 wings with Legacy Score
- **Wing Modules** - 6 wings × 5 levels with detailed milestones and resources
- **Legacy Score** - Gamified but meaningful composite score
- **COA Builder** - Generate quarterly action plans based on weakest wings
- **Family Collaboration** - Multi-user family accounts
- **Quarterly Reviews** - Professional family office reports

### Technical Features
- **Modern Stack** - Next.js 14, TypeScript, Tailwind CSS, Prisma
- **Authentication** - NextAuth.js with secure session management
- **Database** - PostgreSQL with comprehensive data modeling
- **Responsive Design** - Mobile-first, accessible interface
- **Deployment Ready** - Netlify (frontend) + Railway (backend)

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Components**: Custom component library with Lucide icons
- **Animations**: Framer Motion for smooth interactions
- **Charts**: Recharts for progress visualization

### Backend
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT sessions
- **API**: Next.js API routes with RESTful design
- **Email**: Nodemailer for notifications
- **Payments**: Stripe integration for subscriptions

### Deployment
- **Frontend**: Netlify with automatic deployments
- **Backend**: Railway with PostgreSQL database
- **Domain**: Custom domain with SSL certificates
- **CI/CD**: Automated deployment on git push

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd legacyos-platform
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/legacyos"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed with demo data
npx prisma db seed
```

### 4. Start Development
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### 5. Demo Accounts
Two demo families are pre-seeded:

**The Johnson Family** (Beginner)
- Email: `demo@johnson.com`
- Password: `demo123`
- Legacy Score: 73

**The Rodriguez Family** (Advanced)  
- Email: `demo@rodriguez.com`
- Password: `demo123`
- Legacy Score: 89

## 📁 Project Structure

```
legacyos-platform/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts               # Demo data seeding
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base UI components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   └── layout/          # Layout components
│   ├── lib/                 # Utility functions
│   │   ├── auth.ts          # Authentication helpers
│   │   ├── database.ts      # Database connection
│   │   ├── legacy-score.ts  # Score calculation
│   │   ├── wings-config.ts  # Wing definitions
│   │   └── utils.ts         # General utilities
│   ├── pages/               # Next.js pages
│   │   ├── api/            # API routes
│   │   ├── _app.tsx        # App component
│   │   ├── index.tsx       # Landing page
│   │   ├── dashboard.tsx   # Main dashboard
│   │   └── login.tsx       # Authentication
│   ├── styles/             # Global styles
│   └── types/              # TypeScript definitions
├── deployment/
│   ├── Dockerfile          # Container configuration
│   ├── netlify.toml        # Netlify deployment
│   └── railway.json        # Railway deployment
└── docs/                   # Documentation
```

## 🏗️ Architecture

### Database Schema
- **Users & Families** - Multi-user family account system
- **Wings & Levels** - Configurable wing system with milestones
- **Progress Tracking** - User progress across all wings
- **Action Items** - Task management and recommendations
- **Quarterly Reports** - Automated family office reporting

### Wing System
Each wing contains:
- **5 Progressive Levels** with descriptive names
- **Detailed Milestones** with resource links
- **Progress Tracking** with completion status
- **Automated Recommendations** based on progress

### Legacy Score Calculation
- Balanced across all 6 wings (prevents gaming)
- Level completion + milestone bonuses
- Real-time updates with progress changes
- Visual indicators and level names

## 🚀 Deployment

### Frontend (Netlify)
1. Connect GitHub repo to Netlify
2. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Configure environment variables
4. Deploy automatically on push

### Backend (Railway)
1. Create Railway project
2. Connect GitHub repo
3. Add PostgreSQL database service
4. Configure environment variables
5. Deploy with Docker container

### Environment Variables
Required for production:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication  
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="production-secret-key"

# Stripe (optional)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## 📊 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Database Commands
```bash
npx prisma studio              # Visual database browser
npx prisma migrate dev         # Run migrations in development
npx prisma migrate deploy      # Run migrations in production
npx prisma db seed            # Seed database with demo data
npx prisma generate           # Generate Prisma client
```

### Adding New Wings
1. Update `WINGS_CONFIG` in `src/lib/wings-config.ts`
2. Run database migration: `npx prisma migrate dev`
3. Update seed file if needed
4. Add wing-specific styling in `globals.css`

## 🎯 Roadmap

### Phase 1: MVP (Current)
- ✅ Core SIXWING system with 30 levels
- ✅ User authentication and family accounts  
- ✅ Progress tracking and Legacy Score
- ✅ Action item generation
- ✅ Responsive dashboard interface

### Phase 2: Enhanced Features
- [ ] Quarterly report generation (PDF)
- [ ] Family collaboration features
- [ ] Integration with financial providers
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and insights

### Phase 3: Scale Features  
- [ ] AI-powered recommendations
- [ ] Professional advisor network
- [ ] Community features
- [ ] Enterprise family office tools
- [ ] White-label licensing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.legacyos.com](https://docs.legacyos.com)
- **Email**: support@legacyos.com
- **Discord**: [Join our community](https://discord.gg/legacyos)

## 🙏 Acknowledgments

- Inspired by traditional family office practices
- Built for first-generation wealth builders
- Designed with accessibility and inclusion in mind
- Powered by modern web technologies

---

**LegacyOS** - Building generational wealth, one family at a time. 🏠💰🚀