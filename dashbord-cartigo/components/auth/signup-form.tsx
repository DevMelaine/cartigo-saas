'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { listOrganizationCategories, startGoogleAuth } from '@/services/auth'
import { ApiError } from '@/services/api'

interface SignupFormProps {
  onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    organizationName: '',
    category: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const router = useRouter()
  const { registerOrganization } = useAuth()
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useQuery({
    queryKey: ['organization-categories'],
    queryFn: listOrganizationCategories,
    staleTime: 30 * 60 * 1000,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }

    setIsLoading(true)

    try {
      await registerOrganization({
        organizationName: formData.organizationName.trim(),
        categoryId: formData.category,
        adminName: formData.adminName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      })
      toast.success('Compte cree avec succes.')
      router.replace('/dashboard')
      router.refresh()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Impossible de creer votre organisation.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const passwordsMatch =
    Boolean(formData.password) && formData.password === formData.confirmPassword

  return (
    <div className="space-y-8">
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">C</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">Cartigo</h1>
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">Dashboard</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Créez votre espace</h2>
        <p className="text-muted-foreground">Configurez votre organisation en quelques clics</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="organization" className="text-sm font-medium">
            Nom de l&apos;organisation
          </Label>
          <Input
            id="organization"
            placeholder="Mon entreprise"
            value={formData.organizationName}
            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
            disabled={isLoading}
            className="h-12 bg-card"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">
            Catégorie
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
            disabled={isLoading || isLoadingCategories}
          >
            <SelectTrigger className="h-12 bg-card">
              <SelectValue placeholder={isLoadingCategories ? 'Chargement...' : 'Sélectionnez une catégorie'} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminName" className="text-sm font-medium">
            Nom de l&apos;administrateur
          </Label>
          <Input
            id="adminName"
            placeholder="Jean Dupont"
            value={formData.adminName}
            onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
            disabled={isLoading}
            className="h-12 bg-card"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Adresse email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="vous@exemple.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isLoading}
            className="h-12 bg-card"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Mot de passe
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
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {formData.password && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    passwordStrength === 'weak' && 'bg-destructive',
                    passwordStrength === 'medium' && 'bg-yellow-500',
                    passwordStrength === 'strong' && 'bg-primary'
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Force:{' '}
                <span
                  className={cn(
                    'font-medium',
                    passwordStrength === 'weak' && 'text-destructive',
                    passwordStrength === 'medium' && 'text-yellow-600',
                    passwordStrength === 'strong' && 'text-primary'
                  )}
                >
                  {passwordStrength === 'weak'
                    ? 'Faible'
                    : passwordStrength === 'medium'
                      ? 'Moyen'
                      : 'Fort'}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirmer le mot de passe
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              disabled={isLoading}
              className={cn(
                'h-12 pr-10 bg-card transition-colors',
                formData.confirmPassword && !passwordsMatch && 'border-destructive'
              )}
              required
            />
            {formData.confirmPassword && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {passwordsMatch ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-destructive" />
                )}
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || isLoadingCategories || !passwordsMatch || !formData.password || !formData.category}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Créer mon dashboard
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <div className="w-full">
        <SocialButton provider="google" disabled={isLoading} />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Vous avez déjà un compte ?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Se connecter
        </button>
      </p>
    </div>
  )
}

function SocialButton({ provider, disabled }: { provider: 'google'; disabled: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={() => {
        if (provider === 'google') {
          startGoogleAuth()
        }
      }}
      className="w-full h-12 bg-card hover:bg-muted transition-all duration-200"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span className="ml-2 text-sm font-medium">Continuer avec Google</span>
    </Button>
  )
}

function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (!password) return 'weak'

  let strength = 0
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++

  if (strength <= 1) return 'weak'
  if (strength <= 2) return 'medium'
  return 'strong'
}
