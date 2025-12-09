'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useBranches } from '@/hooks/useBranches'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Check } from 'lucide-react'
import { toast } from 'sonner'

export default function BranchSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser } = useAuthStore()
  const tenantId = user?.tenant_id
  const currentBranchId = user?.branch_id

  const { data: branches, isLoading } = useBranches(tenantId)

  // Only show switcher for tenant owners who can access multiple branches
  if (user?.role !== 'tenant_owner' || !tenantId) {
    return null
  }

  const handleBranchChange = async (branchId: string) => {
    if (branchId === currentBranchId) return

    const selectedBranch = branches?.find(b => b.id === branchId)
    if (!selectedBranch) return

    try {
      // Update user context with selected branch
      // Note: This is a client-side switch. For persistent switching, you'd need an API call
      setUser({
        ...user,
        branch_id: branchId,
      })

      toast.success(`Switched to ${selectedBranch.name}`)
      
      // If on a branch-specific page, redirect to owner dashboard
      if (pathname?.startsWith('/branch/')) {
        router.push('/owner/dashboard')
      }
    } catch (error: any) {
      toast.error('Failed to switch branch')
    }
  }

  const currentBranch = branches?.find(b => b.id === currentBranchId)

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-gray-400" />
      <Select
        value={currentBranchId || 'none'}
        onValueChange={handleBranchChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Select branch">
            {currentBranch ? (
              <div className="flex items-center gap-2">
                <span>{currentBranch.name}</span>
                <span className="text-xs text-gray-500">({currentBranch.code})</span>
              </div>
            ) : (
              'Select Branch'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {branches?.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{branch.name}</div>
                    <div className="text-xs text-gray-500">{branch.code}</div>
                  </div>
                </div>
                {branch.id === currentBranchId && (
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

