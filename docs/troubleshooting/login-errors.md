# Login Errors Troubleshooting Guide

## Common Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

### What This Error Means

This error occurs when the application tries to parse JSON from an API response, but receives HTML instead (usually an error page).

### Common Causes

1. **API Route Error**: The API route (`/api/auth/login`) is throwing an error and Next.js is returning an HTML error page
2. **Missing Environment Variables**: Supabase credentials not configured correctly
3. **Database Connection Issues**: Cannot connect to Supabase database
4. **Route Not Found**: The API route doesn't exist or isn't accessible

### Solutions Applied

#### 1. Added Content-Type Checking

The code now checks if the response is JSON before trying to parse it:

```typescript
const contentType = response.headers.get('content-type')
if (!contentType || !contentType.includes('application/json')) {
  const text = await response.text()
  console.error('Non-JSON response:', text.substring(0, 200))
  throw new Error('Server error: Invalid response format.')
}
```

#### 2. Better Error Handling

Added try-catch blocks around JSON parsing to handle parse errors gracefully:

```typescript
try {
  const errorData = await response.json()
  throw new Error(errorData.error || 'Login failed')
} catch (parseError: any) {
  throw new Error(`Login failed: ${response.status} ${response.statusText}`)
}
```

#### 3. API Route Error Handling

The API route now ensures it always returns JSON, even on unexpected errors:

```typescript
} catch (error: any) {
  console.error('Login error:', error)
  return NextResponse.json(
    { 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    },
    { status: 500 }
  )
}
```

### How to Debug

1. **Check Browser Console**: Look for the actual error message
2. **Check Network Tab**: 
   - Open DevTools → Network tab
   - Try logging in
   - Click on the `/api/auth/login` request
   - Check the Response tab to see what's actually being returned
3. **Check Server Logs**: Look at your terminal/console where the dev server is running
4. **Verify Environment Variables**: Ensure `.env.local` has correct Supabase credentials

### Common Issues and Fixes

#### Issue: "Server error: Invalid response format"

**Possible Causes:**
- API route has a syntax error
- Missing import in API route
- Environment variables not set

**Fix:**
1. Check `src/app/api/auth/login/route.ts` for syntax errors
2. Verify `.env.local` exists and has correct values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ```
3. Restart the dev server after changing environment variables

#### Issue: "Login failed: 500 Internal Server Error"

**Possible Causes:**
- Database connection issue
- Supabase credentials incorrect
- User doesn't exist in database

**Fix:**
1. Verify Supabase project is active
2. Check database connection in Supabase Dashboard
3. Verify user exists in both `auth.users` and `users` table
4. Check server console for detailed error messages

#### Issue: "Access denied. This login requires superadmin role"

**Cause:** User exists but role is not set to 'superadmin'

**Fix:**
```sql
UPDATE users 
SET role = 'superadmin' 
WHERE email = 'superadmin@gmail.com';
```

#### Issue: "User record not found"

**Cause:** User exists in `auth.users` but not in `users` table

**Fix:** Create user record in database (see [Superadmin Setup Guide](../setup/superadmin.md))

### Testing the Fix

1. **Test Superadmin Login:**
   - Go to `/superadmin/login`
   - Enter credentials
   - Check browser console for any errors
   - Check Network tab for API response

2. **Test Shop Owner Login:**
   - Go to `/login`
   - Enter credentials
   - Verify it works correctly

### Prevention

The fixes ensure that:
- ✅ All API responses are checked for JSON content-type
- ✅ JSON parsing errors are caught and handled gracefully
- ✅ API routes always return JSON, even on errors
- ✅ Better error messages help identify the root cause

### Related Documentation

- [Superadmin Setup Guide](../setup/superadmin.md)
- [Login Pages Documentation](../setup/login-pages.md)
- [Backend Architecture](../development/backend-architecture.md)

