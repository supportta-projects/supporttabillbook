'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUpdateUser } from '@/hooks/useUsers'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import { Label } from '@/components/ui/label'
import { User, Mail, Shield, Building2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const updateUser = useUpdateUser()
  
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [isEditing, setIsEditing] = useState(false)

  if (!user) {
    return (
      <PageContainer title="Profile">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Not authenticated</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const handleSave = async () => {
    if (!user.id) return

    try {
      const updatedUser = await updateUser.mutateAsync({
        id: user.id,
        full_name: fullName.trim(),
      })
      
      setUser(updatedUser)
      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    }
  }

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Administrator'
      case 'tenant_owner':
        return 'Shop Owner'
      case 'branch_admin':
        return 'Branch Administrator'
      case 'branch_staff':
        return 'Staff Member'
      default:
        return 'User'
    }
  }

  return (
    <PageContainer
      title="My Profile"
      description="View and edit your profile information"
    >
      <div className="max-w-3xl space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b">
              <div className="bg-blue-100 p-4 rounded-full">
                <User className="h-12 w-12 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.full_name}</h2>
                <p className="text-gray-600">{getRoleLabel(user.role)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  value={user.email}
                  disabled
                  className="h-12 text-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <Input
                  value={getRoleLabel(user.role)}
                  disabled
                  className="h-12 text-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 text-lg"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <Input
                    value={user.full_name}
                    disabled
                    className="h-12 text-lg bg-gray-50"
                  />
                )}
              </div>

              {user.branch_id && (
                <div>
                  <Label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Branch
                  </Label>
                  <Input
                    value="Current Branch"
                    disabled
                    className="h-12 text-lg bg-gray-50"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4 border-t">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      setIsEditing(false)
                      setFullName(user.full_name)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 gap-2"
                    onClick={handleSave}
                    disabled={updateUser.isPending || !fullName.trim()}
                  >
                    <Save className="h-4 w-4" />
                    {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Account Status</p>
                <p className="text-sm text-gray-600">
                  {user.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                user.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="pt-4 border-t">
              <p className="font-semibold mb-2">Member Since</p>
              <p className="text-sm text-gray-600">
                {new Date(user.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

