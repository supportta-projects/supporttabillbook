# Component Architecture

## Overview

The project uses a component-based architecture with shadcn/ui components as the foundation. All UI components are reusable and follow consistent patterns.

## Component Structure

```
src/components/
├── ui/                          # shadcn/ui base components
│   ├── button-shadcn.tsx       # Button component (shadcn)
│   ├── input-shadcn.tsx        # Input component (shadcn)
│   ├── card.tsx                # Card component (shadcn)
│   ├── form.tsx                # Form components (shadcn)
│   ├── dialog.tsx              # Dialog component (shadcn)
│   ├── alert-dialog.tsx         # Alert dialog (shadcn)
│   ├── table.tsx               # Table component (shadcn)
│   ├── badge.tsx               # Badge component (shadcn)
│   ├── skeleton.tsx            # Loading skeleton (shadcn)
│   └── sonner.tsx              # Toast notifications (shadcn)
├── layout/                      # Layout components
│   ├── Sidebar.tsx             # Navigation sidebar
│   └── PageContainer.tsx       # Page wrapper with title/actions
├── forms/                       # Reusable form components
│   └── TenantForm.tsx          # Tenant creation/edit form
├── cards/                       # Card components
│   ├── StatCard.tsx            # Statistics card
│   └── TenantCard.tsx          # Tenant display card
└── modals/                      # Modal/Dialog components
    └── DeleteConfirmDialog.tsx # Delete confirmation dialog
```

## Component Guidelines

### 1. Use shadcn/ui Components

Always use shadcn/ui components from `src/components/ui/`:
- `Button` from `@/components/ui/button-shadcn`
- `Input` from `@/components/ui/input-shadcn`
- `Card` from `@/components/ui/card`
- `Form` components from `@/components/ui/form`

### 2. Create Reusable Components

Break down pages into reusable components:
- **Forms** - Use `TenantForm`, `ProductForm`, etc.
- **Cards** - Use `StatCard`, `TenantCard`, etc.
- **Tables** - Create table components for lists
- **Modals** - Use dialog components for confirmations

### 3. Component Props

Always type component props:
```typescript
interface ComponentProps {
  data: SomeType
  onAction: (id: string) => void
  isLoading?: boolean
}
```

### 4. Loading States

Use `Skeleton` component for loading states:
```typescript
{isLoading ? (
  <Skeleton className="h-8 w-full" />
) : (
  <ActualContent />
)}
```

### 5. Error Handling

Use toast notifications for errors:
```typescript
import { toast } from 'sonner'

try {
  await mutation.mutateAsync(data)
  toast.success('Operation successful!')
} catch (error) {
  toast.error(error.message || 'Operation failed')
}
```

## shadcn/ui Components

### Button
```typescript
import { Button } from '@/components/ui/button-shadcn'

<Button variant="default" size="lg">Click Me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
```

### Input
```typescript
import { Input } from '@/components/ui/input-shadcn'

<Input type="email" placeholder="Email" />
```

### Card
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

### Form
```typescript
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'

<Form {...form}>
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

## Creating New Components

### Step 1: Create Component File
```typescript
// src/components/features/billing/BillForm.tsx
'use client'

import { Button } from '@/components/ui/button-shadcn'
// ... other imports

export default function BillForm({ onSubmit, isLoading }: BillFormProps) {
  // Component logic
  return (
    // JSX
  )
}
```

### Step 2: Use in Pages
```typescript
import BillForm from '@/components/features/billing/BillForm'

export default function BillingPage() {
  return <BillForm onSubmit={handleSubmit} />
}
```

## Best Practices

1. **Keep Components Small** - One component, one responsibility
2. **Use TypeScript** - Always type props and state
3. **Handle Loading States** - Show skeletons or spinners
4. **Handle Errors** - Use toast notifications
5. **Make It Accessible** - Use proper labels and ARIA attributes
6. **Make It Simple** - Large buttons, clear labels for non-technical users

