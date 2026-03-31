'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/services/auth'
import { ApiError } from '@/services/api'

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await requestPasswordReset({ email })
      setIsSubmitted(true)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Impossible d envoyer le lien de reinitialisation.'
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
            <h2 className="text-3xl font-bold tracking-tight">Email envoyé</h2>
            <p className="text-muted-foreground max-w-sm">
              Si un compte existe avec l{"'"}adresse <span className="font-medium text-foreground">{email}</span>, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsSubmitted(false)
              setEmail('')
            }}
            className="w-full h-12 text-base font-medium"
          >
            Renvoyer le lien
          </Button>

          <Link href="/login" className="block">
            <Button
              type="button"
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              <span className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </span>
            </Button>
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Vous n{"'"}avez pas reçu d{"'"}email ? Vérifiez vos spams ou{' '}
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false)
              setEmail('')
            }}
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            essayez avec une autre adresse
          </button>
        </p>
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
        Retour à la connexion
      </Link>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Mot de passe oublié</h2>
        <p className="text-muted-foreground">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Adresse email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-12 pl-10 bg-card"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !email}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Envoyer le lien
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Vous vous souvenez de votre mot de passe ?{' '}
        <Link
          href="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Se connecter
        </Link>
      </p>
    </div>
  )
}
