# Deployment Documentation

This directory contains deployment guides and configuration files for deploying the Supportta Bill Book application.

## Available Guides

- **[Vercel Deployment Guide](./vercel.md)** - Complete guide for deploying to Vercel (recommended)

## Quick Start

1. **Choose your platform**: Vercel (recommended for Next.js)
2. **Follow the deployment guide** for your chosen platform
3. **Configure environment variables** as specified
4. **Deploy and verify**

## Environment Variables Required

All deployment platforms require these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Get these values from your [Supabase Dashboard](https://app.supabase.com) > Project Settings > API.

## Pre-Deployment Checklist

- [ ] Code is pushed to Git repository
- [ ] Supabase project is set up
- [ ] Database schema is applied (all migrations run)
- [ ] Environment variables are ready
- [ ] Build passes locally (`npm run build`)
- [ ] Tests pass (if applicable)

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Login pages work correctly
- [ ] Database connection is working
- [ ] Authentication is functional
- [ ] API routes respond correctly
- [ ] Custom domain is configured (optional)
- [ ] SSL certificate is active (automatic with Vercel)

## Support

For deployment issues, refer to:
- Platform-specific documentation
- [Troubleshooting Guide](../troubleshooting/)
- Project documentation in `/docs`

