'use client'

import { useAuthStore } from '@/store/authStore'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button-shadcn'
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette,
  Globe,
  Database
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuthStore()

  return (
    <PageContainer
      title="Settings"
      description="Manage your application settings and preferences"
    >
      <div className="max-w-4xl space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic application settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Language</p>
                <p className="text-sm text-gray-600">English (US)</p>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Date Format</p>
                <p className="text-sm text-gray-600">DD/MM/YYYY</p>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Time Zone</p>
                <p className="text-sm text-gray-600">Asia/Kolkata (IST)</p>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive email updates</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Low Stock Alerts</p>
                <p className="text-sm text-gray-600">Get notified when stock is low</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Change Password</p>
                <p className="text-sm text-gray-600">Update your account password</p>
              </div>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Theme</p>
                <p className="text-sm text-gray-600">Light Mode</p>
              </div>
              <Button variant="outline" size="sm">
                Change Theme
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        {(user?.role === 'tenant_owner' || user?.role === 'superadmin') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data & Privacy
              </CardTitle>
              <CardDescription>
                Manage your data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Export Data</p>
                  <p className="text-sm text-gray-600">Download your data</p>
                </div>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Delete Account</p>
                  <p className="text-sm text-gray-600">Permanently delete your account</p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}

