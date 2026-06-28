'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/services/auth'
import { ApiError } from '@/services/api'
import { cn } from '@/lib/utils'

type ResetPasswordFormProps = {
  token?: string
}

export function ResetPasswordForm({ token = '' }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  const passwordsMatch =
    Boolean(formData.password) && formData.password === formData.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error('Le lien de reinitialisation est invalide.')
      return
    }

    if (!passwordsMatch) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }

    setIsLoading(true)

    try {
      await resetPassword({
        token,
        password: formData.password,
      })
      setIsSubmitted(true)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Impossible de reinitialiser votre mot de passe.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-8">
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">C</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">Cartigo</h1>
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
              Dashboard
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Mot de passe mis a jour</h2>
            <p className="text-muted-foreground max-w-sm">
              Votre mot de passe a ete reinitialise avec succes. Vous pouvez maintenant vous reconnecter.
            </p>
          </div>
        </div>

        <Link href="/login" className="block">
          <Button
            type="button"
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            <span className="flex items-center gap-2">
              Retour a la connexion
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">C</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">Cartigo</h1>
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Dashboard
          </p>
        </div>
      </div>

      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour a la connexion
      </Link>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reinitialiser le mot de passe</h2>
        <p className="text-muted-foreground">
          Choisissez un nouveau mot de passe pour acceder de nouveau a votre dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isLoading}
              className="h-12 pr-10 bg-card"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirmer le mot de passe
          </Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            disabled={isLoading}
            className={cn(
              'h-12 bg-card',
              formData.confirmPassword && !passwordsMatch && 'border-destructive'
            )}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || !token || !passwordsMatch || !formData.password}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Enregistrer le nouveau mot de passe
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {!token ? (
        <p className="text-center text-sm text-destructive">
          Ce lien de reinitialisation est invalide ou incomplet.
        </p>
      ) : null}
    </div>
  )
}
