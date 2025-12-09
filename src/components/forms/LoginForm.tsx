'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button-shadcn'
import { Input } from '@/components/ui/input-shadcn'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>
  isLoading?: boolean
  error?: string
  title?: string
  description?: string
  allowedRoles?: string[]
}

export default function LoginForm({
  onSubmit,
  isLoading = false,
  error,
  title = 'Sign In',
  description,
  allowedRoles,
}: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    await onSubmit(email, password)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl text-center">{title}</CardTitle>
        {description && (
          <CardDescription className="text-center">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-destructive font-semibold text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">📧 Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="Enter your email"
              className="text-lg py-6"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">🔒 Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder="Enter your password"
              className="text-lg py-6"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !email || !password}
            size="lg"
            className="w-full text-lg py-6"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Signing in...
              </>
            ) : (
              '✅ Sign In'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

