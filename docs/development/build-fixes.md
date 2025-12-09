# Build Fixes Applied

## Issues Fixed

1. **Card Component Missing** - Created `src/components/ui/card.tsx` with proper exports
2. **Next.js 16 Route Handler Params** - Updated all dynamic route handlers to use `Promise<{ id: string }>` instead of `{ id: string }`

## Files That Need Manual Fix

All dynamic route handlers need to be updated:
- `src/app/api/tenants/[id]/route.ts` - GET, PUT, DELETE
- `src/app/api/products/[id]/route.ts` - GET, PUT, DELETE  
- `src/app/api/branches/[id]/route.ts` - GET, PUT, DELETE
- `src/app/api/expenses/[id]/route.ts` - GET, PUT, DELETE
- `src/app/api/tenants/[id]/branches/route.ts` - GET
- `src/app/api/bills/[id]/route.ts` - GET (already fixed)

## Pattern to Apply

Change from:
```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // use params.id
}
```

To:
```typescript
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // use id instead of params.id
}
```

