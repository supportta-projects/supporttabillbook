# Tenant Creation with Shop Owner Account

## Overview

When creating a new tenant (shop) in the system, a shop owner account is automatically created. This allows the shop owner to immediately log in and start managing their shop without requiring separate account creation steps.

## How It Works

### 1. Tenant Creation Form

When a superadmin creates a new tenant, they must provide:

**Tenant Information:**
- Tenant Name (required)
- Tenant Code (required, unique)
- Email (optional - for tenant contact)
- Phone (optional)
- Address (optional)

**Shop Owner Account:**
- Owner Full Name (required)
- Owner Email Address (required, unique - used for login)
- Owner Password (required, minimum 6 characters)

### 2. Backend Process

When the form is submitted, the system:

1. **Validates Input**
   - Checks tenant code uniqueness
   - Checks owner email uniqueness (both in users table and Auth)
   - Validates password length (minimum 6 characters)

2. **Creates Tenant Record**
   - Inserts tenant into `tenants` table
   - Sets `is_active` to `true`

3. **Creates Shop Owner Account**
   - Creates user in Supabase Auth with:
     - Email: owner_email
     - Password: owner_password
     - Email confirmed: `true` (auto-confirmed)
     - User metadata: full_name and role
   - Creates user record in `users` table with:
     - `id`: Same as Auth user ID
     - `email`: owner_email
     - `full_name`: owner_name
     - `role`: `tenant_owner`
     - `tenant_id`: The newly created tenant ID
     - `is_active`: `true`

4. **Error Handling & Rollback**
   - If tenant creation succeeds but user creation fails, the tenant is deleted (rollback)
   - If Auth user creation succeeds but user record creation fails, both tenant and Auth user are deleted
   - Clear error messages are returned to the user

## API Endpoint

**POST** `/api/tenants`

**Request Body:**
```json
{
  "name": "ABC Store",
  "code": "ABC001",
  "email": "contact@abcstore.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "owner_email": "owner@abcstore.com",
  "owner_password": "securepassword123",
  "owner_name": "John Doe"
}
```

**Response (Success):**
```json
{
  "tenant": {
    "id": "uuid",
    "name": "ABC Store",
    "code": "ABC001",
    ...
  },
  "owner": {
    "email": "owner@abcstore.com",
    "name": "John Doe"
  },
  "message": "Tenant and owner account created successfully"
}
```

**Response (Error):**
```json
{
  "error": "Owner email is already registered. Please use a different email."
}
```

## Security Considerations

1. **Service Role Key**: The API uses the Supabase service role key (via `createAdminClient()`) to create users in Auth. This key should NEVER be exposed to the client.

2. **Password Requirements**: Minimum 6 characters. Consider enforcing stronger requirements in production.

3. **Email Uniqueness**: The system checks both the `users` table and Supabase Auth to ensure email uniqueness.

4. **Auto-confirmation**: Owner emails are auto-confirmed to allow immediate login. In production, you may want to require email verification.

## Usage Example

### Superadmin Creates Tenant

1. Navigate to `/superadmin/tenants/create`
2. Fill in tenant information
3. Fill in shop owner account details
4. Submit the form
5. System creates both tenant and owner account
6. Owner can immediately log in at `/login` using their email and password

### Shop Owner Logs In

1. Navigate to `/login` (main login page)
2. Enter owner email and password
3. System authenticates and redirects to `/owner/dashboard`

## Troubleshooting

### "Owner email is already registered"
- The email is already in use by another user
- Solution: Use a different email address

### "Failed to create owner account"
- Auth user creation failed
- Check Supabase service role key is set correctly
- Check Supabase project settings

### "Failed to create user record"
- User record insertion failed
- Check database connection
- Check RLS policies allow service role to insert

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for user creation
```

## Related Documentation

- [Superadmin Setup](./superadmin.md)
- [Login Pages](./login-pages.md)
- [Database Schema](../database/schema.sql)

