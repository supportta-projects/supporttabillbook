# Database Migrations

This guide covers database migrations for the Supportta Bill Book application.

## Migration Files

- `001_initial_schema.sql` - Initial database schema with all base tables
- `002_add_expenses_table.sql` - Adds expenses management table
- `003_add_rls_policies.sql` - Adds comprehensive Row Level Security (RLS) policies for tenant and branch isolation

## How to Run Migrations

### Option 1: Run All Migrations (New Database)

If you're setting up a new database, run migrations in order:

1. Run `001_initial_schema.sql` first
2. Then run `002_add_expenses_table.sql`
3. Finally run `003_add_rls_policies.sql` (REQUIRED for security)

**Note:** If you've already run `src/lib/db/schema.sql`, you may have already created the base tables. Check what's already created before running migrations.

### Option 2: Run Individual Migrations (Existing Database)

If you already have a database and just need to add new features:
- Run only the specific migration file you need (e.g., `002_add_expenses_table.sql`)

## Running Migrations in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy and paste the contents of the migration file
5. Click **"Run"** to execute

## Migration Safety

All migrations use `CREATE TABLE IF NOT EXISTS` and `DROP TRIGGER IF EXISTS` statements, so they can be run multiple times safely without errors.

## Migration Order

Always run migrations in numerical order (001, 002, 003, etc.) to ensure dependencies are created in the correct sequence.

## Migration Details

### Migration 001: Initial Schema

Creates all base tables:
- `tenants` - Shop/tenant information
- `branches` - Branch information per tenant
- `users` - User profiles with roles
- `products` - Product catalog
- `current_stock` - Current stock levels
- `stock_ledger` - Stock movement audit trail
- `bills` - Billing records
- `bill_items` - Bill line items
- `purchases` - Purchase records
- `purchase_items` - Purchase line items

Also creates:
- Indexes for performance
- Triggers for automatic timestamp updates
- Enables RLS (but policies are in migration 003)

### Migration 002: Expenses Table

Adds:
- `expenses` table for tracking business expenses
- Indexes for expense queries
- RLS enabled (policies in migration 003)

### Migration 003: RLS Policies

**IMPORTANT:** This migration is required for security!

Creates:
- Helper functions for RLS policies (`get_user_tenant_id`, `get_user_branch_id`, `get_user_role`)
- Comprehensive RLS policies for all tables
- Tenant isolation policies
- Branch-level access control
- Role-based permissions

**This migration ensures:**
- Superadmins can access all data
- Tenant owners can only access their tenant's data
- Branch users can only access their branch's data
- Complete data isolation between tenants

## Verifying Migrations

### Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Check RLS Policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
ORDER BY tablename, policyname;
```

### Check Helper Functions

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'get_user%';
```

## Troubleshooting

### Migration Fails with "Already Exists" Error

This is normal - migrations use `IF NOT EXISTS` clauses. The error can be safely ignored, or you can check if the object already exists before running.

### RLS Policies Not Working

1. Verify migration 003 was run successfully
2. Check that helper functions exist
3. Verify policies were created (use the verification query above)
4. See [RLS Policies Guide](./rls-policies.md) for troubleshooting

### Foreign Key Constraint Errors

Make sure migrations are run in order. Foreign keys require parent tables to exist first.

## Related Documentation

- [RLS Policies Setup](./rls-policies.md)
- [Database Schema](../../src/lib/db/schema.sql)
- [Setup Guide](../getting-started/setup.md)

