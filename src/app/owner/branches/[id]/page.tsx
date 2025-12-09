'use client'

import { useParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useBranches } from '@/hooks/useBranches'
import { useUsers } from '@/hooks/useUsers'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button-shadcn'
import { Building2, MapPin, Phone, Users, Edit, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function BranchDetailsPage() {
  const params = useParams()
  const branchId = params.id as string
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  
  const { data: branches } = useBranches(tenantId)
  const { data: users } = useUsers()
  
  const branch = branches?.find(b => b.id === branchId)
  const branchUsers = users?.filter(u => u.branch_id === branchId) || []

  if (!branch) {
    return (
      <PageContainer title="Branch Details">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Branch not found</p>
            <Link href="/owner/branches">
              <Button className="mt-4">Back to Branches</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title={branch.name}
      description={`Branch Code: ${branch.code}`}
    >
      <div className="max-w-4xl space-y-6">
        <Link href="/owner/branches">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Branches
          </Button>
        </Link>

        {/* Branch Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Branch Information
              </CardTitle>
              <Link href={`/owner/branches/${branch.id}/edit`}>
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Branch
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Branch Name</p>
                <p className="text-lg font-semibold">{branch.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Branch Code</p>
                <p className="text-lg font-mono font-semibold">{branch.code}</p>
              </div>
              {branch.address && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Address
                  </p>
                  <p className="text-lg">{branch.address}</p>
                </div>
              )}
              {branch.phone && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Phone
                  </p>
                  <p className="text-lg">{branch.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                  branch.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {branch.is_active ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Inactive
                    </>
                  )}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="text-lg">
                  {new Date(branch.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Assigned to Branch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Assigned ({branchUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {branchUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No staff assigned to this branch</p>
                <Link href="/owner/users/create">
                  <Button variant="outline" className="mt-4">
                    Add Staff
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {branchUsers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{member.full_name}</h3>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {member.role === 'branch_admin' ? 'Branch Administrator' : 'Staff Member'}
                        </p>
                      </div>
                    </div>
                    <Link href={`/owner/users/${member.id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

