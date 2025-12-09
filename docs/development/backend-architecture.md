# Backend Architecture & API Routes

## Overview

All business logic is implemented in backend API routes (`src/app/api/`). The frontend only calls these API routes - no direct database access from client-side code.

## Architecture Principles

1. **All Logic in Backend** - Business logic, validation, and data operations happen in API routes
2. **No Direct Supabase Calls** - Frontend hooks call API routes, not Supabase directly
3. **Server-Side Security** - Authentication and authorization checks happen in API routes
4. **RLS Enforcement** - Database-level security via Row Level Security policies

## API Route Structure

```
src/app/api/
├── auth/
│   ├── login/route.ts          # User authentication
│   ├── logout/route.ts         # User logout
│   └── me/route.ts             # Get current user
├── tenants/
│   ├── route.ts                # List/Create tenants
│   ├── [id]/route.ts           # Get/Update/Delete tenant
│   └── [id]/branches/route.ts  # Get tenant branches
├── branches/
│   ├── route.ts                # List/Create branches
│   └── [id]/route.ts           # Get/Update/Delete branch
├── products/
│   ├── route.ts                # List/Create products
│   └── [id]/route.ts           # Get/Update/Delete product
├── stock/
│   ├── route.ts                # Get current stock
│   ├── in/route.ts             # Stock in operation
│   ├── out/route.ts            # Stock out operation
│   ├── adjust/route.ts         # Stock adjustment
│   └── ledger/route.ts         # Stock ledger history
├── bills/
│   ├── route.ts                # List/Create bills
│   └── [id]/route.ts           # Get bill details
└── expenses/
    ├── route.ts                # List expenses
    ├── create/route.ts         # Create expense
    └── [id]/route.ts           # Get/Update/Delete expense
```

## API Route Pattern

All API routes follow this pattern:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth/utils'

export async function GET(request: Request) {
  try {
    // 1. Authentication check
    const user = await requireAuth() // or requireRole('superadmin')
    
    // 2. Get Supabase client (server-side)
    const supabase = await createClient()
    
    // 3. Permission checks (if needed)
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // 4. Business logic & database operations
    const { data, error } = await supabase
      .from('table')
      .select('*')
    
    if (error) throw error
    
    // 5. Return response
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Operation failed' },
      { status: 500 }
    )
  }
}
```

## Frontend Hooks Pattern

Frontend hooks only call API routes:

```typescript
export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await fetch('/api/tenants')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      const data = await response.json()
      return data.tenants
    },
  })
}
```

## Security Features

1. **Server-Side Authentication** - All routes check authentication server-side
2. **Role-Based Authorization** - Routes check user roles before operations
3. **RLS Policies** - Database enforces tenant/branch isolation
4. **Input Validation** - All inputs validated in API routes
5. **Error Handling** - Proper error messages without exposing internals

## Benefits

- ✅ **Security** - No sensitive logic exposed to client
- ✅ **Consistency** - Single source of truth for business logic
- ✅ **Maintainability** - Easy to update logic in one place
- ✅ **Testing** - API routes can be tested independently
- ✅ **Performance** - Server-side operations are faster

## Migration from lib/api

All functions in `src/lib/api/` have been moved to API routes:
- `billing.ts` → `src/app/api/bills/`
- `stock.ts` → `src/app/api/stock/`
- `expenses.ts` → `src/app/api/expenses/`

The `src/lib/api/` folder can be removed or kept for reference, but should not be used by frontend code.

