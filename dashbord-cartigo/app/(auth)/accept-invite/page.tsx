import { AuthHero } from "@/components/auth/auth-hero";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";

type AcceptInvitePageProps = {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
};

function getSingleSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = getSingleSearchParam(resolvedSearchParams?.token);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthHero />
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <AcceptInvitationForm token={token} />
        </div>
      </div>
    </div>
  );
}
