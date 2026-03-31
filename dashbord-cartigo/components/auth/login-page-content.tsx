'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'
import { useAuth } from '@/hooks/useAuth'

type LoginPageContentProps = {
  oauthProvider?: string
  oauthError?: string
}

export function LoginPageContent({
  oauthProvider,
  oauthError,
}: LoginPageContentProps) {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const handledQueryFeedbackRef = useRef(false)

  useEffect(() => {
    if (handledQueryFeedbackRef.current) {
      return
    }

    if (oauthError) {
      handledQueryFeedbackRef.current = true
      toast.error(oauthError)
      router.replace('/login')
      return
    }

    if (!loading && isAuthenticated && oauthProvider === 'google') {
      handledQueryFeedbackRef.current = true
      toast.success('Connexion Google reussie.')
      router.replace('/dashboard')
      return
    }

    if (!loading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, loading, oauthError, oauthProvider, router])

  if (!loading && isAuthenticated) {
    return null
  }

  return isLogin ? (
    <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
  ) : (
    <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
  )
}
