# LegacyOS Deployment Guide

This guide covers deploying LegacyOS to production using Netlify (frontend) and Railway (backend).

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   Netlify       │────│   Next.js App    │────│   Railway       │
│   (Frontend)    │    │   (SSR + API)    │    │   (Database)    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- GitHub account with your LegacyOS repository
- Netlify account (free tier available)
- Railway account (free tier available)
- Domain name (optional but recommended)

## 🚀 Step 1: Database Setup (Railway)

### 1.1 Create Railway Project
1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your LegacyOS repository
4. Railway will automatically detect the Dockerfile

### 1.2 Add PostgreSQL Database
1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL instance
4. Note the connection string from the "Connect" tab

### 1.3 Configure Environment Variables
In Railway project settings, add these variables:

```env
# Database (automatically set by Railway)
DATABASE_URL=postgresql://postgres:...@...railway.app:5432/railway

# Authentication
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=your-super-secure-secret-key-here

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@legacyos.com

# Feature flags
ENABLE_FAMILY_COLLABORATION=true
ENABLE_QUARTERLY_REPORTS=true
ENABLE_INTEGRATIONS=false
```

### 1.4 Deploy and Migrate
1. Railway will automatically build and deploy
2. Once deployed, run database migrations via Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link to project
railway login
railway link

# Run migrations
railway run npx prisma migrate deploy

# Seed database (optional)
railway run npx prisma db seed
```

## 🌐 Step 2: Frontend Deployment (Netlify)

### 2.1 Connect Repository
1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git"
3. Choose GitHub and select your LegacyOS repository
4. Netlify will detect Next.js settings automatically

### 2.2 Configure Build Settings
Verify these settings in Netlify:

```yaml
Build command: npm run build
Publish directory: .next
Node version: 18
```

### 2.3 Environment Variables
In Netlify site settings → Environment variables, add:

```env
# Authentication
NEXTAUTH_URL=https://your-site.netlify.app
NEXTAUTH_SECRET=same-secret-as-railway

# API endpoints (point to Railway)
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app

# Stripe public key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Analytics (optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-...
NEXT_PUBLIC_MIXPANEL_TOKEN=...
```

### 2.4 Custom Domain (Optional)
1. In Netlify site settings → Domain management
2. Add your custom domain
3. Configure DNS with your domain provider:

```
Type: CNAME
Name: www
Value: your-site.netlify.app

Type: A  
Name: @
Value: 75.2.60.5
```

## 🔒 Step 3: Security Configuration

### 3.1 HTTPS Setup
Both Netlify and Railway provide automatic SSL certificates. Ensure:
- All `NEXTAUTH_URL` values use `https://`
- Update any hardcoded HTTP URLs to HTTPS
- Configure HSTS headers in `netlify.toml`

### 3.2 Environment Security
- Use different `NEXTAUTH_SECRET` for production
- Enable 2FA on all service accounts
- Regularly rotate API keys and secrets
- Use Railway's secret management for sensitive data

### 3.3 Database Security
- Enable connection encryption in Railway
- Use connection pooling for better performance
- Set up database backups (Railway Pro feature)
- Monitor for unusual access patterns

## 📊 Step 4: Monitoring & Analytics

### 4.1 Application Monitoring
Set up monitoring with these tools:

**Uptime Monitoring:**
```bash
# Add to your monitoring service
GET https://your-site.netlify.app/api/health
GET https://your-app.up.railway.app/api/health
```

**Error Tracking:**
- Integrate Sentry for error monitoring
- Set up alerts for database connection issues
- Monitor API response times

### 4.2 Database Monitoring
Railway provides built-in metrics:
- CPU and memory usage
- Connection count
- Query performance
- Storage usage

### 4.3 User Analytics
Configure analytics in your app:

```javascript
// In _app.tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function App() {
  return (
    <>
      <Component {...pageProps} />
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </>
  )
}
```

## 🚀 Step 5: Production Deployment Process

### 5.1 Automated Deployment
Both services support automatic deployment on git push:

```bash
# Deploy to production
git add .
git commit -m "Production ready"
git push origin main

# Netlify and Railway will automatically:
# 1. Build the application
# 2. Run tests (if configured)
# 3. Deploy to production
# 4. Run database migrations (Railway)
```

### 5.2 Deployment Checklist
Before going live:

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] SSL certificates active
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring and alerts set up
- [ ] Error tracking configured
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Security scan passed

## 🔧 Step 6: Post-Deployment Configuration

### 6.1 Database Seeding
Populate your production database:

```bash
# Connect to Railway
railway login
railway link

# Run production seed (optional)
railway run npx prisma db seed
```

### 6.2 Admin User Setup
Create your first admin user:

```bash
# Via Railway console
railway run node -e "
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./src/lib/auth');
const prisma = new PrismaClient();

async function createAdmin() {
  const admin = await prisma.user.create({
    data: {
      email: 'admin@yourdomain.com',
      passwordHash: await hashPassword('secure-password'),
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      subscriptionPlan: 'LEGACY_PLUS',
      subscriptionStatus: 'ACTIVE'
    }
  });
  console.log('Admin created:', admin);
}

createAdmin();
"
```

### 6.3 Email Configuration
Test email delivery:

```bash
# Send test email
railway run node -e "
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: 'test@example.com',
  subject: 'LegacyOS Email Test',
  text: 'Email configuration successful!'
});
"
```

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check logs in Netlify or Railway
railway logs
# or check Netlify deploy logs in dashboard
```

**Database Connection Issues:**
```bash
# Test database connection
railway run npx prisma db pull
```

**Environment Variable Issues:**
```bash
# List all environment variables
railway variables
```

**SSL Certificate Issues:**
- Ensure domains are properly configured
- Check DNS propagation with `dig` or online tools
- Verify CNAME records point to correct services

### Performance Optimization

**Frontend (Netlify):**
- Enable gzip compression
- Configure CDN settings
- Set up proper caching headers
- Optimize images and assets

**Backend (Railway):**
- Configure connection pooling
- Set up database indexes
- Monitor query performance
- Scale resources as needed

## 📱 Mobile Considerations

For mobile optimization:
- Test responsive design on various devices
- Configure PWA settings for app-like experience
- Optimize loading times for mobile networks
- Set up push notifications (future feature)

## 🔄 Continuous Integration

Set up automated testing:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    # Netlify and Railway will handle deployment
```

## 📧 Support

If you encounter issues during deployment:

1. Check service status pages:
   - [Netlify Status](https://netlifystatus.com)
   - [Railway Status](https://status.railway.app)

2. Review deployment logs in respective dashboards

3. Contact support:
   - **LegacyOS**: support@legacyos.com
   - **Netlify**: [support.netlify.com](https://support.netlify.com)
   - **Railway**: [help.railway.app](https://help.railway.app)

---

Your LegacyOS platform is now ready for production! 🚀 