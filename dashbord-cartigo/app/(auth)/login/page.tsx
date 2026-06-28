import { AuthHero } from '@/components/auth/auth-hero'
import { LoginPageContent } from '@/components/auth/login-page-content'

type LoginPageProps = {
  searchParams?: Promise<{
    oauth?: string | string[]
    oauthError?: string | string[]
  }>
}

function getSingleSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const oauthProvider = getSingleSearchParam(resolvedSearchParams?.oauth)
  const oauthError = getSingleSearchParam(resolvedSearchParams?.oauthError)

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthHero />
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <LoginPageContent oauthError={oauthError} oauthProvider={oauthProvider} />
        </div>
      </div>
    </div>
  )
}
