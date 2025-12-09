import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get branches for a tenant (superadmin or tenant owner)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Check permissions: superadmin can see any tenant, tenant_owner can only see their own
    if (user.role === 'tenant_owner' && user.tenant_id !== id) {
      return NextResponse.json(
        { error: 'Unauthorized. You can only view branches for your own tenant.' },
        { status: 403 }
      )
    }
    
    // Branch admins and staff can only see their own branch
    if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      if (user.branch_id) {
        const { data: branch, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .eq('id', user.branch_id)
          .eq('tenant_id', id)
          .single()
        
        if (branchError || !branch) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
        
        const duration = Date.now() - startTime
        console.log(`[PERF] GET /api/tenants/${id}/branches: ${duration}ms`)
        
        return NextResponse.json({ branches: [branch] }, {
          headers: {
            'X-Response-Time': `${duration}ms`
          }
        })
      }
    }
    
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/tenants/${id}/branches: ${duration}ms`)
    
    return NextResponse.json({ branches: data || [] }, {
      headers: {
        'X-Response-Time': `${duration}ms`
      }
    })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}

