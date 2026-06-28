'use client'

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { AuthHero } from '@/components/auth/auth-hero'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthHero />
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
