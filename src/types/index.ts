// User Roles
export type UserRole = 'superadmin' | 'tenant_owner' | 'branch_admin' | 'branch_staff'

// User Interface
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  tenant_id?: string
  branch_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Tenant (Shop) Interface
export interface Tenant {
  id: string
  name: string
  code: string
  email: string
  phone: string
  address: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Branch Interface
export interface Branch {
  id: string
  tenant_id: string
  name: string
  code: string
  address: string
  phone: string
  is_active: boolean
  is_main: boolean
  created_at: string
  updated_at: string
}

// Category Interface
export interface Category {
  id: string
  tenant_id: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Brand Interface
export interface Brand {
  id: string
  tenant_id: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Product Interface
export interface Product {
  id: string
  tenant_id: string
  category_id?: string
  brand_id?: string
  name: string
  sku?: string
  unit: string
  selling_price: number
  purchase_price?: number
  gst_rate: number
  min_stock: number
  description?: string
  stock_tracking_type: 'quantity' | 'serial'
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data (optional, populated by API)
  category?: Category
  brand?: Brand
}

// Product Serial Number Interface
export interface ProductSerialNumber {
  id: string
  tenant_id: string
  branch_id: string
  product_id: string
  serial_number: string
  status: 'available' | 'sold' | 'damaged' | 'returned'
  bill_id?: string
  sold_at?: string
  created_at: string
  updated_at: string
}

// Stock Ledger Entry
export interface StockLedger {
  id: string
  tenant_id: string
  branch_id: string
  product_id: string
  transaction_type: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'billing'
  quantity: number
  previous_stock: number
  current_stock: number
  reference_id?: string // Bill ID, Purchase ID, etc.
  reason?: string
  created_by: string
  created_at: string
}

// Current Stock
export interface CurrentStock {
  id: string
  tenant_id: string
  branch_id: string
  product_id: string
  quantity: number
  updated_at: string
}

// Customer Interface
export interface Customer {
  id: string
  tenant_id: string
  name: string
  phone?: string
  email?: string
  address?: string
  gst_number?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Settings Interface
export interface Settings {
  id: string
  tenant_id: string
  gst_enabled: boolean
  gst_number?: string
  gst_type: 'inclusive' | 'exclusive'
  gst_percentage: number
  upi_id?: string
  bank_account_number?: string
  bank_name?: string
  bank_branch?: string
  bank_ifsc_code?: string
  created_at: string
  updated_at: string
}

// Bill Interface
export interface Bill {
  id: string
  tenant_id: string
  branch_id: string
  invoice_number: string
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  subtotal: number
  gst_amount: number
  discount: number
  total_amount: number
  profit_amount: number
  paid_amount?: number
  due_amount?: number
  payment_mode: 'cash' | 'card' | 'upi' | 'credit'
  created_by: string
  created_at: string
}

// Payment Transaction Interface
export interface PaymentTransaction {
  id: string
  bill_id: string
  tenant_id: string
  branch_id: string
  amount: number
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer'
  transaction_date: string
  notes?: string
  created_by: string
  created_at: string
}

// Bill Item
export interface BillItem {
  id: string
  bill_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  purchase_price?: number
  gst_rate: number
  gst_amount: number
  discount: number
  profit_amount: number
  total_amount: number
  serial_numbers?: string[] // Array of serial numbers for serial-tracked products
}

// Purchase Interface
export interface Purchase {
  id: string
  tenant_id: string
  branch_id: string
  supplier_name: string
  invoice_number?: string
  total_amount: number
  created_by: string
  created_at: string
}

// Purchase Item
export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
}

// Dashboard Stats
export interface DashboardStats {
  total_sales: number
  today_sales: number
  total_products: number
  low_stock_items: number
  total_branches: number
  total_users: number
}

// Sales Report
export interface SalesReport {
  date: string
  total_sales: number
  total_bills: number
  branch_id?: string
  branch_name?: string
}

// Product Sales Report
export interface ProductSalesReport {
  product_id: string
  product_name: string
  total_quantity: number
  total_amount: number
}

// Expense Interface
export interface Expense {
  id: string
  tenant_id: string
  branch_id: string
  category: string
  description: string
  amount: number
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer'
  expense_date: string
  receipt_number?: string
  vendor_name?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

// Expense Category
export type ExpenseCategory = 
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'marketing'
  | 'transport'
  | 'maintenance'
  | 'office_supplies'
  | 'food'
  | 'other'

