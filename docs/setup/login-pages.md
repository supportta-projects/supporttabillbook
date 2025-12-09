# Login Pages Documentation

## Overview

The application has **two separate login pages** for security and proper access control:

1. **Shop Login** (`/login`) - For shop owners and staff
2. **Superadmin Login** (`/superadmin/login`) - For system administrators only

## Security Architecture

### Why Separate Login Pages?

1. **Security Isolation**: Superadmin credentials are kept separate from regular user access
2. **Access Control**: Prevents unauthorized access attempts to superadmin panel
3. **User Experience**: Clear separation helps users understand which login to use
4. **Audit Trail**: Easier to track and monitor superadmin access separately

## Shop Login (`/login`)

### Purpose
- Primary login page for shop owners (tenant_owner)
- Login for branch administrators (branch_admin)
- Login for branch staff (branch_staff)

### Access Rules
- ✅ Allows: `tenant_owner`, `branch_admin`, `branch_staff`
- ❌ Blocks: `superadmin` (redirects to superadmin login)

### Features
- Simple, user-friendly interface
- Clear branding for shop management
- Help text for users
- Link to contact administrator

### User Flow
1. User visits site → Redirected to `/login`
2. Enters email and password
3. System validates credentials
4. If superadmin → Shows error and suggests `/superadmin/login`
5. If shop owner/staff → Redirects to respective dashboard

### Redirects After Login
- `tenant_owner` → `/owner/dashboard`
- `branch_admin` → `/branch/dashboard`
- `branch_staff` → `/branch/dashboard`

## Superadmin Login (`/superadmin/login`)

### Purpose
- Exclusive login for system administrators
- Secure access to tenant management
- System-wide configuration access

### Access Rules
- ✅ Allows: `superadmin` only
- ❌ Blocks: All other roles (redirects to shop login)

### Security Features
1. **Separate Route**: Hidden from regular users
2. **Visual Distinction**: Dark theme, security badges
3. **Role Validation**: Server-side validation of superadmin role
4. **Security Warnings**: Clear warnings about restricted access
5. **No Public Link**: Not linked from main login page

### User Flow
1. Superadmin navigates to `/superadmin/login`
2. Enters superadmin credentials
3. System validates role is `superadmin`
4. If valid → Redirects to `/superadmin/dashboard`
5. If invalid role → Shows error

### Redirects After Login
- `superadmin` → `/superadmin/dashboard`

## Implementation Details

### API Route: `/api/auth/login`

The login API route accepts an optional `requireRole` parameter:

```typescript
// Shop login (default)
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
// Blocks superadmin automatically

// Superadmin login
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password",
  "requireRole": "superadmin"
}
// Only allows superadmin
```

### Security Checks

1. **Role Validation**: Checks user role against allowed roles
2. **Account Status**: Verifies user account is active
3. **Route Protection**: Validates login route matches user role
4. **Error Messages**: Clear error messages without revealing system details

## Component Reusability

Both login pages use the same reusable component:

### `LoginForm` Component
Located at: `src/components/forms/LoginForm.tsx`

**Props:**
- `onSubmit`: Function to handle login
- `isLoading`: Loading state
- `error`: Error message to display
- `title`: Page title
- `description`: Page description
- `allowedRoles`: Array of allowed roles (for validation)

**Benefits:**
- Consistent UI across both login pages
- Single source of truth for form logic
- Easy to maintain and update
- Ensures same user experience

## Best Practices

### For Shop Owners/Staff
1. Always use `/login` for regular access
2. Contact administrator if login issues occur
3. Never share credentials with others

### For Superadmins
1. Always use `/superadmin/login` for admin access
2. Keep superadmin credentials secure
3. Use strong passwords
4. Monitor access logs regularly
5. Log out after each session

## Troubleshooting

### "Superadmin login is not available here"
**Cause**: Trying to login as superadmin on `/login` page  
**Solution**: Use `/superadmin/login` instead

### "Access denied. This login requires superadmin role"
**Cause**: Non-superadmin trying to access superadmin login  
**Solution**: Use `/login` for shop owner/staff access

### "Your account has been deactivated"
**Cause**: User account is inactive  
**Solution**: Contact system administrator to activate account

## Security Considerations

1. **Rate Limiting**: Consider implementing rate limiting on login attempts
2. **IP Whitelisting**: Option to whitelist IPs for superadmin access
3. **2FA**: Future enhancement for superadmin login
4. **Session Management**: Proper session timeout for superadmin
5. **Audit Logging**: All superadmin logins are logged

## Future Enhancements

- [ ] Two-factor authentication for superadmin
- [ ] IP-based access restrictions
- [ ] Login attempt rate limiting
- [ ] Email notifications for superadmin logins
- [ ] Session management dashboard

## Related Documentation

- [Superadmin Setup Guide](./superadmin.md)
- [Authentication Architecture](../development/backend-architecture.md)
- [Security Policies](../development/security.md)

