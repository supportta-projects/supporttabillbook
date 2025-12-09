import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Branch } from '@/types'

interface BranchState {
  selectedBranchId: string | null
  setSelectedBranch: (branchId: string | null) => void
  clearSelectedBranch: () => void
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      setSelectedBranch: (branchId) => set({ selectedBranchId: branchId }),
      clearSelectedBranch: () => set({ selectedBranchId: null }),
    }),
    {
      name: 'branch-storage',
    }
  )
)

