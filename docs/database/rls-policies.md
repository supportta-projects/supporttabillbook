# Row Level Security (RLS) Policies Setup

## Overview

Row Level Security (RLS) ensures complete data isolation between tenants and branches. This is critical for a multi-tenant SaaS application.

## Problem

Without RLS policies, users might be able to access data from other tenants or branches, which is a serious security issue.

## Solution

Migration `003_add_rls_policies.sql` creates comprehensive RLS policies that enforce:
- Tenant isolation (users can only access their tenant's data)
- Branch isolation (branch users can only access their branch's data)
- Role-based permissions (different roles have different access levels)

## Setup

### Step 1: Run RLS Policies Migration

1. Go to Supabase Dashboard > **SQL Editor**
2. Click **"New Query"**
3. Open `migrations/003_add_rls_policies.sql`
4. Copy the entire SQL script
5. Paste into SQL Editor
6. Click **"Run"**

This will create:
- Helper functions for RLS policies
- Policies for all tables
- Tenant isolation policies
- Branch-level access control
- Role-based permissions

### Step 2: Verify Policies Were Created

Run this query to check:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';
```

You should see multiple policies for the users table.

### Step 3: Test RLS Policies

1. Create a test tenant and user
2. Login as that user
3. Try to access data from another tenant
4. You should get no results (or an error if trying to modify)

## How RLS Policies Work

### Helper Functions

The migration creates three helper functions:

1. **`get_user_tenant_id()`** - Returns the current user's tenant_id
2. **`get_user_branch_id()`** - Returns the current user's branch_id
3. **`get_user_role()`** - Returns the current user's role

These functions use `SECURITY DEFINER` to bypass RLS when checking user permissions.

### Policy Examples

#### Superadmin Access
```sql
-- Superadmins can view all tenants
CREATE POLICY "Superadmin can view all tenants"
ON tenants FOR SELECT
USING (get_user_role() = 'superadmin');
```

#### Tenant Owner Access
```sql
-- Tenant owners can view their tenant
CREATE POLICY "Tenant owners can view their tenant"
ON tenants FOR SELECT
USING (id = get_user_tenant_id() OR get_user_role() = 'superadmin');
```

#### Branch User Access
```sql
-- Branch users can view their branch's stock
CREATE POLICY "Branch users can view their branch stock"
ON current_stock FOR SELECT
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id()) 
       OR get_user_role() = 'superadmin');
```

## Policy Types

### SELECT Policies
Control what data users can read.

### INSERT Policies
Control what data users can create.

### UPDATE Policies
Control what data users can modify.

### DELETE Policies
Control what data users can remove.

## Role-Based Access

### Superadmin
- Can access all data across all tenants
- Full CRUD operations on all tables
- System-wide management

### Tenant Owner
- Can access all data within their tenant
- Can manage branches, products, and users in their tenant
- Cannot access other tenants' data

### Branch Admin
- Can access data in their branch only
- Can manage stock, bills, purchases, expenses in their branch
- Cannot access other branches' data

### Branch Staff
- Can access data in their branch only
- Limited permissions (view and create, but limited update/delete)
- Cannot access other branches' data

## Troubleshooting

### Error: "new row violates row-level security policy"

This means a user is trying to insert/update data they don't have permission for.

**Solutions:**
1. Check the user's role and tenant/branch assignment
2. Verify the RLS policy allows the operation
3. Check if the user is trying to access data from another tenant/branch

### Error: "function get_user_tenant_id() does not exist"

The helper functions weren't created. Run migration 003 again.

### Users Can't See Their Own Data

1. Verify RLS policies exist (use verification query)
2. Check that helper functions exist
3. Verify user's `tenant_id` and `branch_id` are set correctly
4. Check user's role matches expected role

### Superadmin Can't Access All Data

1. Verify superadmin role is set correctly: `role = 'superadmin'`
2. Check that superadmin policies exist
3. Verify helper function `get_user_role()` returns 'superadmin'

## Testing RLS Policies

### Test Tenant Isolation

```sql
-- Login as tenant owner
-- Try to select tenants from other tenant
SELECT * FROM tenants WHERE id != get_user_tenant_id();
-- Should return empty (unless superadmin)
```

### Test Branch Isolation

```sql
-- Login as branch user
-- Try to select stock from other branch
SELECT * FROM current_stock WHERE branch_id != get_user_branch_id();
-- Should return empty (unless tenant owner or superadmin)
```

## Alternative: Temporarily Disable RLS (NOT RECOMMENDED)

**WARNING:** Only for development/testing. Never disable RLS in production!

```sql
-- Disable RLS on a table (NOT RECOMMENDED)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**Proper solution:** Fix the RLS policies instead of disabling them.

## Related Documentation

- [Migrations Guide](./migrations.md)
- [Setup Guide](../getting-started/setup.md)
- [Database Schema](../../src/lib/db/schema.sql)

