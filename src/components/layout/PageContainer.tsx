'use client'

import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  title?: string
  description?: string
  actions?: ReactNode
}

export default function PageContainer({ children, title, description, actions }: PageContainerProps) {
  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {(title || description || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {title && (
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-2 text-muted-foreground text-lg">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex gap-2">
                {actions}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

