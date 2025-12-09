'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useBranchStore } from '@/store/branchStore'
import { useBranches } from '@/hooks/useBranches'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Check, Loader2 } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { toast } from 'sonner'

export default function BranchSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { selectedBranchId, setSelectedBranch } = useBranchStore()
  const tenantId = user?.tenant_id

  const { data: branches, isLoading } = useBranches(tenantId)
  
  // Check if dashboard is loading to prevent branch switching during data load
  const { isFetching: dashboardFetching } = useDashboardStats(
    selectedBranchId || undefined,
    tenantId,
    'today'
  )
  
  const isDataLoading = dashboardFetching

  // Only show switcher for tenant owners who can access multiple branches
  if (user?.role !== 'tenant_owner' || !tenantId) {
    return null
  }

  // Set default to main branch on mount
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      const mainBranch = branches.find(b => b.is_main && b.is_active)
      if (mainBranch) {
        setSelectedBranch(mainBranch.id)
      } else {
        // If no main branch, use first active branch
        const firstActiveBranch = branches.find(b => b.is_active)
        if (firstActiveBranch) {
          setSelectedBranch(firstActiveBranch.id)
        }
      }
    }
  }, [branches, selectedBranchId, setSelectedBranch])

  const handleBranchChange = async (branchId: string) => {
    if (branchId === selectedBranchId) return
    if (isDataLoading) {
      toast.info('Please wait for data to finish loading before switching branches')
      return
    }

    const selectedBranch = branches?.find(b => b.id === branchId)
    if (!selectedBranch) return

    try {
      setSelectedBranch(branchId)
      toast.success(`Switched to ${selectedBranch.name}`)
      
      // If on a branch-specific page, redirect to owner dashboard
      if (pathname?.startsWith('/branch/')) {
        router.push('/owner/dashboard')
      }
    } catch (error: any) {
      toast.error('Failed to switch branch')
    }
  }

  const currentBranch = branches?.find(b => b.id === selectedBranchId)

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-gray-400" />
      <Select
        value={selectedBranchId || 'none'}
        onValueChange={handleBranchChange}
        disabled={isLoading || isDataLoading || !branches || branches.length === 0}
      >
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Select branch">
            {currentBranch ? (
              <div className="flex items-center gap-2">
                {isDataLoading && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
                <span>{currentBranch.name}</span>
                {currentBranch.is_main && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">Main</span>
                )}
              </div>
            ) : (
              'Select Branch'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {branches?.filter(b => b.is_active).map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{branch.name}</div>
                    {branch.is_main && (
                      <div className="text-xs text-yellow-600 font-medium">Main Branch</div>
                    )}
                  </div>
                </div>
                {branch.id === selectedBranchId && (
                  <Check className="h-4 w-4 text-blue-600 ml-2" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

