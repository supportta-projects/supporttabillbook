# Supportta Bill Book - SaaS Billing & Stock Management System

A comprehensive multi-tenant, multi-branch billing and stock management system built with Next.js 16 and Supabase.

> 📚 **Documentation**: All project documentation is now organized in the [`docs/`](./docs/) folder. See [Documentation Index](./docs/README.md) for complete guides.

## Project Overview

This is a SaaS application designed for managing billing and stock across multiple tenants (shops) and branches. The system supports four user roles with different access levels:

- **Superadmin**: Manages all tenants and global settings
- **Tenant Owner**: Manages branches, products, and users for their shop
- **Branch Admin**: Handles billing, stock, and purchases for a branch
- **Branch Staff**: Performs billing and basic stock operations

## Features

### Core Modules

1. **Authentication & Authorization**
   - Role-based access control
   - Multi-tenant isolation
   - Branch-level permissions

2. **Stock Management** (Priority Module)
   - Stock ledger with complete audit trail
   - Stock-In/Out operations
   - Stock adjustments
   - Inter-branch transfers
   - Low stock alerts
   - Real-time stock tracking

3. **Billing System**
   - POS billing interface
   - Invoice generation
   - Multiple payment modes
   - GST calculation
   - Bill printing (A4 + Thermal)

4. **Product Management**
   - Product CRUD operations
   - Price management
   - GST configuration
   - SKU management

5. **Purchase Management**
   - Purchase entry
   - Purchase history
   - Automatic stock updates

6. **Reports & Analytics**
   - Sales reports
   - Product-wise sales
   - Stock reports
   - Branch-wise analytics

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (recommended)

## Project Structure

```
supporttabillbook/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── superadmin/         # Superadmin screens
│   │   ├── owner/              # Tenant owner screens
│   │   ├── branch/             # Branch admin/staff screens
│   │   ├── login/              # Authentication
│   │   └── ...
│   ├── lib/
│   │   ├── supabase/           # Supabase client configuration
│   │   ├── auth/               # Authentication utilities
│   │   ├── api/                # Business logic functions
│   │   └── db/                 # Database schema
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
└── ...
```

## Quick Start

For complete setup instructions, see the [Setup Guide](./docs/getting-started/setup.md).

**Quick steps:**
1. Install dependencies: `npm install`
2. Set up environment variables (see [Installation Guide](./docs/getting-started/installation.md))
3. Set up database (see [Database Migrations](./docs/database/migrations.md))
4. Create superadmin user (see [Superadmin Setup](./docs/setup/superadmin.md))
5. Run dev server: `npm run dev`

## Database Schema

The system uses the following main tables:

- `tenants` - Shop/tenant information
- `branches` - Branch information per tenant
- `users` - User profiles with roles
- `products` - Product catalog
- `current_stock` - Current stock levels (denormalized)
- `stock_ledger` - Complete stock movement audit trail
- `bills` - Billing records
- `bill_items` - Bill line items
- `purchases` - Purchase records
- `purchase_items` - Purchase line items

## Screen Structure

### Web App (28 Screens)

**Superadmin (6 screens)**
- Login
- Dashboard
- Tenant List
- Tenant Creation
- Global Reports
- System Settings

**Tenant Owner (8 screens)**
- Dashboard
- Branch List
- Branch Creation
- Product List
- Add/Edit Product
- Users List
- Add/Edit User

**Branch Admin/Staff (14 screens)**
- Dashboard
- Stock List
- Stock Ledger
- Stock-In/Out/Adjust/Transfer
- Purchase Entry/List
- Billing Screen
- Bill Print
- Bills List
- Sales Reports
- Product Sales Report

## Development Guidelines

### Adding New Features

1. Create types in `src/types/index.ts`
2. Add API functions in `src/lib/api/`
3. Create pages in `src/app/`
4. Implement proper role-based access control
5. Add database migrations if needed

### Authentication

Use the provided utilities:
- `requireAuth()` - Require authenticated user
- `requireRole(role)` - Require specific role
- `getCurrentUser()` - Get current user

### Stock Operations

Always use the stock API functions:
- `addStockIn()` - Add stock
- `addStockOut()` - Remove stock
- `adjustStock()` - Adjust stock
- `transferStock()` - Transfer between branches

These functions automatically:
- Update the stock ledger
- Update current stock
- Maintain audit trail

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control at application level
- Tenant isolation enforced
- Branch-level data segregation

## Future Enhancements

- Android app (14 screens)
- Subscription management
- Advanced analytics
- CSV import/export
- Multi-currency support
- Barcode scanning

## License

Private - All rights reserved

## Documentation

All documentation is organized in the [`docs/`](./docs/) folder:

- **[Documentation Index](./docs/README.md)** - Main documentation hub
- **[Getting Started](./docs/getting-started/)** - Setup and installation guides
- **[Database](./docs/database/)** - Migrations and RLS policies
- **[Setup Guides](./docs/setup/)** - Configuration and setup instructions
- **[Development](./docs/development/)** - Implementation details and summaries

## Support

For issues and questions:
1. Check the [documentation](./docs/README.md)
2. Review troubleshooting guides in relevant docs
3. Contact the development team
