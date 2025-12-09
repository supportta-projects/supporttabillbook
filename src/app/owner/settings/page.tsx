'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCurrentUser } from '@/hooks/useAuth'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import { Label } from '@/components/ui/label'
import { 
  Settings as SettingsIcon, 
  Receipt,
  CreditCard,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function OwnerSettingsPage() {
  const { user, isLoading: authLoading } = useAuthStore()
  const { isLoading: userLoading } = useCurrentUser()
  const { data: settings, isLoading: settingsLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  
  const [formData, setFormData] = useState({
    gst_enabled: false,
    gst_type: 'exclusive' as 'inclusive' | 'exclusive',
    gst_percentage: 0,
    upi_id: '',
    bank_account_number: '',
    bank_name: '',
    bank_branch: '',
    bank_ifsc_code: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setFormData({
        gst_enabled: settings.gst_enabled ?? false,
        gst_type: settings.gst_type ?? 'exclusive',
        gst_percentage: settings.gst_percentage ?? 0,
        upi_id: settings.upi_id || '',
        bank_account_number: settings.bank_account_number || '',
        bank_name: settings.bank_name || '',
        bank_branch: settings.bank_branch || '',
        bank_ifsc_code: settings.bank_ifsc_code || '',
      })
    }
  }, [settings])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings.mutateAsync(formData)
      toast.success('Settings saved successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || userLoading || settingsLoading) {
    return (
      <PageContainer title="Settings">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading settings...</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!user?.tenant_id) {
    return (
      <PageContainer title="Settings">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Settings"
      description="Manage GST and payment settings for your business"
    >
      <div className="max-w-4xl space-y-6">
        {/* GST Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              GST Settings
            </CardTitle>
            <CardDescription>
              Configure GST settings for your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* GST Enabled Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="gst_enabled" className="text-base font-semibold cursor-pointer">
                  Enable GST
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Enable GST calculation for invoices and bills
                </p>
              </div>
              <Switch
                id="gst_enabled"
                checked={formData.gst_enabled}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, gst_enabled: checked })
                }
              />
            </div>

            {formData.gst_enabled && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                {/* GST Type */}
                <div>
                  <Label htmlFor="gst_type" className="text-base font-semibold">
                    GST Type
                  </Label>
                  <Select
                    value={formData.gst_type}
                    onValueChange={(value: 'inclusive' | 'exclusive') =>
                      setFormData({ ...formData, gst_type: value })
                    }
                  >
                    <SelectTrigger className="h-11 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inclusive">Inclusive (GST included in price)</SelectItem>
                      <SelectItem value="exclusive">Exclusive (GST added to price)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    {formData.gst_type === 'inclusive' 
                      ? 'GST is included in the product price'
                      : 'GST will be added on top of the product price'}
                  </p>
                </div>

                {/* GST Percentage */}
                <div>
                  <Label htmlFor="gst_percentage" className="text-base font-semibold">
                    GST Percentage (%)
                  </Label>
                  <Input
                    id="gst_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.gst_percentage}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        gst_percentage: parseFloat(e.target.value) || 0 
                      })
                    }
                    className="h-11 mt-2"
                    placeholder="0.00"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Enter the GST percentage rate (0-100)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Configure payment methods and bank account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* UPI ID */}
            <div>
              <Label htmlFor="upi_id" className="text-base font-semibold">
                UPI ID
              </Label>
              <Input
                id="upi_id"
                type="text"
                value={formData.upi_id}
                onChange={(e) =>
                  setFormData({ ...formData, upi_id: e.target.value })
                }
                className="h-11 mt-2"
                placeholder="yourname@upi"
              />
              <p className="text-sm text-gray-600 mt-1">
                Your UPI ID for receiving payments
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Bank Account Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Number */}
                <div>
                  <Label htmlFor="bank_account_number" className="text-base font-semibold">
                    Account Number
                  </Label>
                  <Input
                    id="bank_account_number"
                    type="text"
                    value={formData.bank_account_number}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_account_number: e.target.value })
                    }
                    className="h-11 mt-2"
                    placeholder="Enter account number"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <Label htmlFor="bank_name" className="text-base font-semibold">
                    Bank Name
                  </Label>
                  <Input
                    id="bank_name"
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                    className="h-11 mt-2"
                    placeholder="Enter bank name"
                  />
                </div>

                {/* Branch */}
                <div>
                  <Label htmlFor="bank_branch" className="text-base font-semibold">
                    Branch
                  </Label>
                  <Input
                    id="bank_branch"
                    type="text"
                    value={formData.bank_branch}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_branch: e.target.value })
                    }
                    className="h-11 mt-2"
                    placeholder="Enter branch name"
                  />
                </div>

                {/* IFSC Code */}
                <div>
                  <Label htmlFor="bank_ifsc_code" className="text-base font-semibold">
                    IFSC Code
                  </Label>
                  <Input
                    id="bank_ifsc_code"
                    type="text"
                    value={formData.bank_ifsc_code}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })
                    }
                    className="h-11 mt-2"
                    placeholder="ABCD0123456"
                    maxLength={11}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}

