'use client'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button-shadcn'
import { Badge } from '@/components/ui/badge'
import { Tenant } from '@/types'
import { Trash2, Edit } from 'lucide-react'

interface TenantCardProps {
  tenant: Tenant
  onEdit?: (tenant: Tenant) => void
  onDelete?: (tenant: Tenant) => void
  isDeleting?: boolean
}

export default function TenantCard({ tenant, onEdit, onDelete, isDeleting }: TenantCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">{tenant.name}</h3>
            <p className="text-sm text-muted-foreground">Code: {tenant.code}</p>
          </div>
          <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
            {tenant.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          {tenant.email && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">📧</span>
              <span>{tenant.email}</span>
            </div>
          )}
          {tenant.phone && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">📞</span>
              <span>{tenant.phone}</span>
            </div>
          )}
          {tenant.address && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">📍</span>
              <span className="text-muted-foreground">{tenant.address}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          Created: {new Date(tenant.created_at).toLocaleDateString()}
        </div>
      </CardContent>
      
      {(onEdit || onDelete) && (
        <CardFooter className="flex gap-2 pt-0">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(tenant)}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(tenant)}
              disabled={isDeleting}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

