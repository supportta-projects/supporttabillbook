# Product/Inventory Management Implementation Plan

## Overview
Complete product management system with category/brand selection, stock tracking (quantity vs serial numbers), and full CRUD operations.

## Requirements
1. **Product List Page**
   - Display all products with stock information
   - Show category and brand
   - Display stock (quantity or serial count based on tracking type)
   - Enable/disable products
   - Delete products
   - Search and filter by category/brand
   - Show remaining stock and sold out details

2. **Create Product Page**
   - Product name, SKU, unit
   - Category selection (dropdown)
   - Brand selection (dropdown)
   - Stock tracking type: Quantity vs Serial Numbers
   - Selling price, purchase price
   - GST rate, min stock
   - Description
   - Active status

3. **Edit Product Page**
   - All fields from create page
   - Pre-filled with existing data
   - Update functionality

4. **Stock Display**
   - For quantity-based: Show remaining quantity
   - For serial-based: Show available serial numbers count
   - Sold out details (last sales)

## Implementation Steps

### Phase 1: Database Schema
1. Create migration `007_add_stock_tracking.sql`
   - Add `stock_tracking_type` column to products table
   - Create `product_serial_numbers` table
   - Add indexes for performance

### Phase 2: Type Definitions
1. Update `Product` interface with `stock_tracking_type`
2. Add `ProductSerialNumber` interface
3. Update product queries to include category/brand relations

### Phase 3: API Routes
1. Update `/api/products` POST to handle:
   - `category_id`
   - `brand_id`
   - `stock_tracking_type`
2. Update `/api/products/[id]` PUT to handle same fields
3. Create `/api/products/[id]/serial-numbers` routes:
   - GET: List serial numbers for a product
   - POST: Add serial numbers
   - DELETE: Remove serial numbers

### Phase 4: Hooks
1. Update `useProducts` to:
   - Include category/brand data
   - Support stock tracking type
   - Add enable/disable mutation
2. Create `useSerialNumbers` hook

### Phase 5: UI Components
1. Product List Page (`/owner/products/page.tsx`)
   - Table/card view with all product info
   - Filters (category, brand, active status)
   - Search functionality
   - Enable/disable toggle
   - Delete button with confirmation
   - Stock display component

2. Create Product Page (`/owner/products/create/page.tsx`)
   - Form with all fields
   - Category dropdown (from useCategories)
   - Brand dropdown (from useBrands)
   - Stock tracking type selector
   - Validation

3. Edit Product Page (`/owner/products/[id]/edit/page.tsx`)
   - Same form as create, pre-filled
   - Update mutation

4. Stock Display Component
   - Conditional rendering based on tracking type
   - Quantity display
   - Serial numbers list/count

### Phase 6: Testing & Refinement
1. Test create product with category/brand
2. Test stock tracking type selection
3. Test enable/disable functionality
4. Test delete with validation
5. Test serial number management
6. Performance optimization

## Database Schema Changes

### Products Table Addition
```sql
stock_tracking_type VARCHAR(20) DEFAULT 'quantity' 
CHECK (stock_tracking_type IN ('quantity', 'serial'))
```

### New Table: product_serial_numbers
```sql
- id (UUID)
- tenant_id (UUID)
- branch_id (UUID)
- product_id (UUID)
- serial_number (VARCHAR)
- status (VARCHAR): 'available', 'sold', 'damaged', 'returned'
- bill_id (UUID, nullable)
- sold_at (TIMESTAMP, nullable)
- created_at, updated_at
```

## API Endpoints

### Products
- `GET /api/products` - List with category/brand relations
- `POST /api/products` - Create with category/brand/tracking type
- `GET /api/products/[id]` - Get single with relations
- `PUT /api/products/[id]` - Update all fields
- `DELETE /api/products/[id]` - Delete (with validation)
- `PUT /api/products/[id]/toggle-active` - Enable/disable

### Serial Numbers
- `GET /api/products/[id]/serial-numbers?branch_id=xxx` - List serials
- `POST /api/products/[id]/serial-numbers` - Add serials
- `DELETE /api/products/[id]/serial-numbers/[serial_id]` - Remove serial

## UI Flow

1. **Product List**
   - User sees all products
   - Can filter by category/brand
   - Can search by name/SKU
   - Can toggle active status
   - Can delete (with confirmation)
   - Can view stock details

2. **Create Product**
   - Fill form with all details
   - Select category from dropdown
   - Select brand from dropdown
   - Choose stock tracking type
   - Submit → redirect to list

3. **Edit Product**
   - Load existing data
   - Update any field
   - Submit → redirect to list

4. **Stock Display**
   - If quantity: Show "X units remaining"
   - If serial: Show "X serial numbers available"
   - Show sold out details if applicable

## Success Criteria
- ✅ Products can be created with category and brand
- ✅ Stock tracking type can be selected (quantity/serial)
- ✅ Products can be enabled/disabled
- ✅ Products can be deleted (with validation)
- ✅ Stock information displays correctly based on tracking type
- ✅ Serial numbers can be managed for serial-tracked products
- ✅ All operations are performant (<10ms API response)

