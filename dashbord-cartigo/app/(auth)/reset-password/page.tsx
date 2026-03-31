import { AuthHero } from '@/components/auth/auth-hero'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string | string[]
  }>
}

function getSingleSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const token = getSingleSearchParam(resolvedSearchParams?.token)

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthHero />
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  )
}
