# LegacyOS Netlify Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Connect to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git"
3. Connect your GitHub account and select the `legacyos-landing-page` repository
4. Netlify will automatically detect the Next.js configuration

### 2. Build Settings (Auto-detected)

Netlify should automatically configure:
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** 18

### 3. Required Environment Variables

Add these in Netlify Site Settings → Environment Variables:

#### Authentication (Required)
```
NEXTAUTH_URL=https://your-site-name.netlify.app
NEXTAUTH_SECRET=your-super-secure-secret-key-min-32-chars
```

#### Database (Required)
```
DATABASE_URL=your-railway-postgres-connection-string
```

#### Stripe (Required for payments)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### Email (Optional)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

#### Analytics (Optional)
```
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
```

### 4. Deploy

1. Click "Deploy site"
2. Netlify will build and deploy your application
3. Your site will be available at `https://random-name.netlify.app`

### 5. Custom Domain (Optional)

1. Go to Site Settings → Domain management
2. Add your custom domain
3. Configure DNS records with your domain provider:

```
Type: CNAME
Name: www
Value: your-site-name.netlify.app

Type: NETLIFY
Name: @
Value: your-site-name.netlify.app
```

## 🔧 Environment Variable Details

### Generating NEXTAUTH_SECRET
```bash
# Generate a secure secret (minimum 32 characters)
openssl rand -base64 32
```

### Database URL Format
```
DATABASE_URL=postgresql://username:password@host:port/database
```
*Get this from your Railway PostgreSQL service*

### Stripe Keys
- Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- Use **live keys** for production
- Use **test keys** for development

## ✅ Post-Deployment Checklist

- [ ] Site builds successfully
- [ ] Database connection works
- [ ] Authentication flows work
- [ ] Stripe integration functions (if applicable)
- [ ] Email sending works (if configured)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate is active
- [ ] All pages load correctly

## 🚨 Troubleshooting

### Build Failures
1. Check the build logs in Netlify dashboard
2. Ensure all dependencies are in `package.json`
3. Verify environment variables are set correctly

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure Railway database allows external connections
- Check if database is running

### Authentication Issues
- Verify `NEXTAUTH_URL` matches your actual site URL
- Ensure `NEXTAUTH_SECRET` is at least 32 characters
- Check that callback URLs are configured correctly

### Common Fixes
```bash
# Clear Netlify cache and rebuild
# Go to Netlify dashboard → Deploys → Clear cache and deploy site

# Check environment variables
# Netlify dashboard → Site settings → Environment variables
```

## 🔄 Automatic Deployments

Netlify automatically redeploys when you push to your main branch:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Your site will automatically rebuild and deploy! 🎉 