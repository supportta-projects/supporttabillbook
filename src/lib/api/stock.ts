import { createClient } from '@/lib/supabase/server'
import { StockLedger, CurrentStock } from '@/types'

/**
 * Add stock to inventory (Stock-In)
 */
export async function addStockIn(
  branchId: string,
  productId: string,
  quantity: number,
  reason?: string,
  referenceId?: string
) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) throw new Error('Unauthorized')

  // Get current stock
  const { data: currentStock } = await supabase
    .from('current_stock')
    .select('*')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .single()

  const previousStock = currentStock?.quantity || 0
  const newStock = previousStock + quantity

  // Get tenant_id from branch
  const { data: branch } = await supabase
    .from('branches')
    .select('tenant_id')
    .eq('id', branchId)
    .single()

  if (!branch) throw new Error('Branch not found')

  // Create ledger entry
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from('stock_ledger')
    .insert({
      tenant_id: branch.tenant_id,
      branch_id: branchId,
      product_id: productId,
      transaction_type: 'stock_in',
      quantity,
      previous_stock: previousStock,
      current_stock: newStock,
      reference_id: referenceId,
      reason,
      created_by: user.data.user.id,
    })
    .select()
    .single()

  if (ledgerError) throw ledgerError

  // Update or insert current stock
  if (currentStock) {
    await supabase
      .from('current_stock')
      .update({ quantity: newStock })
      .eq('id', currentStock.id)
  } else {
    await supabase
      .from('current_stock')
      .insert({
        tenant_id: branch.tenant_id,
        branch_id: branchId,
        product_id: productId,
        quantity: newStock,
      })
  }

  return ledgerEntry
}

/**
 * Remove stock from inventory (Stock-Out)
 */
export async function addStockOut(
  branchId: string,
  productId: string,
  quantity: number,
  reason?: string,
  referenceId?: string
) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) throw new Error('Unauthorized')

  // Get current stock
  const { data: currentStock } = await supabase
    .from('current_stock')
    .select('*')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .single()

  if (!currentStock || currentStock.quantity < quantity) {
    throw new Error('Insufficient stock')
  }

  const previousStock = currentStock.quantity
  const newStock = previousStock - quantity

  // Get tenant_id from branch
  const { data: branch } = await supabase
    .from('branches')
    .select('tenant_id')
    .eq('id', branchId)
    .single()

  if (!branch) throw new Error('Branch not found')

  // Create ledger entry
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from('stock_ledger')
    .insert({
      tenant_id: branch.tenant_id,
      branch_id: branchId,
      product_id: productId,
      transaction_type: 'stock_out',
      quantity: -quantity,
      previous_stock: previousStock,
      current_stock: newStock,
      reference_id: referenceId,
      reason,
      created_by: user.data.user.id,
    })
    .select()
    .single()

  if (ledgerError) throw ledgerError

  // Update current stock
  await supabase
    .from('current_stock')
    .update({ quantity: newStock })
    .eq('id', currentStock.id)

  return ledgerEntry
}

/**
 * Adjust stock (correction)
 */
export async function adjustStock(
  branchId: string,
  productId: string,
  newQuantity: number,
  reason: string
) {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) throw new Error('Unauthorized')

  // Get current stock
  const { data: currentStock } = await supabase
    .from('current_stock')
    .select('*')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .single()

  const previousStock = currentStock?.quantity || 0
  const difference = newQuantity - previousStock

  // Get tenant_id from branch
  const { data: branch } = await supabase
    .from('branches')
    .select('tenant_id')
    .eq('id', branchId)
    .single()

  if (!branch) throw new Error('Branch not found')

  // Create ledger entry
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from('stock_ledger')
    .insert({
      tenant_id: branch.tenant_id,
      branch_id: branchId,
      product_id: productId,
      transaction_type: 'adjustment',
      quantity: difference,
      previous_stock: previousStock,
      current_stock: newQuantity,
      reason,
      created_by: user.data.user.id,
    })
    .select()
    .single()

  if (ledgerError) throw ledgerError

  // Update or insert current stock
  if (currentStock) {
    await supabase
      .from('current_stock')
      .update({ quantity: newQuantity })
      .eq('id', currentStock.id)
  } else {
    await supabase
      .from('current_stock')
      .insert({
        tenant_id: branch.tenant_id,
        branch_id: branchId,
        product_id: productId,
        quantity: newQuantity,
      })
  }

  return ledgerEntry
}

/**
 * Transfer stock between branches
 */
export async function transferStock(
  fromBranchId: string,
  toBranchId: string,
  productId: string,
  quantity: number,
  reason?: string
) {
  // Stock out from source branch
  await addStockOut(fromBranchId, productId, quantity, reason || 'Transfer out')

  // Stock in to destination branch
  await addStockIn(toBranchId, productId, quantity, reason || 'Transfer in')

  return { success: true }
}

/**
 * Get stock ledger for a product
 */
export async function getStockLedger(branchId: string, productId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stock_ledger')
    .select('*')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as StockLedger[]
}

/**
 * Get current stock for a branch
 */
export async function getCurrentStock(branchId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('current_stock')
    .select(`
      *,
      product:products(*)
    `)
    .eq('branch_id', branchId)
    .gt('quantity', 0)

  if (error) throw error
  return data as CurrentStock[]
}

/**
 * Get low stock items
 */
export async function getLowStockItems(branchId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('current_stock')
    .select(`
      *,
      product:products(*)
    `)
    .eq('branch_id', branchId)
    .lt('quantity', 'product.min_stock')

  if (error) throw error
  return data
}

