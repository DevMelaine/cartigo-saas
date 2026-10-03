"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { SettingsTabs, type SettingsTab } from "@/components/settings/settings-tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  canAccessBilling,
  canAccessSecurity,
  canAccessSettings,
  canEditBranding,
  canEditNotifications,
  canEditOrganization,
} from "@/utils/settings-permissions";

const OrganizationSettingsSection = dynamic(
  () =>
    import("@/components/settings/sections/organization-settings").then(
      (module) => module.OrganizationSettingsSection
    ),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-[1.75rem]" /> }
);

const BrandingSettingsSection = dynamic(
  () =>
    import("@/components/settings/sections/branding-settings").then(
      (module) => module.BrandingSettingsSection
    ),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-[1.75rem]" /> }
);

const SecuritySettingsSection = dynamic(
  () =>
    import("@/components/settings/sections/security-settings").then(
      (module) => module.SecuritySettingsSection
    ),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-[1.75rem]" /> }
);

const NotificationSettingsSection = dynamic(
  () =>
    import("@/components/settings/sections/notification-settings").then(
      (module) => module.NotificationSettingsSection
    ),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-[1.75rem]" /> }
);

const BillingSettingsSection = dynamic(
  () =>
    import("@/components/settings/sections/billing-settings").then(
      (module) => module.BillingSettingsSection
    ),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-[1.75rem]" /> }
);

const TAB_VALUES = {
  organization: "organization",
  branding: "branding",
  security: "security",
  notifications: "notifications",
  billing: "billing",
} as const;

export function SettingsPage() {
  const { role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(TAB_VALUES.organization);

  const hasAccess = canAccessSettings(role);
  const canEditOrg = canEditOrganization(role);
  const canEditBrand = canEditBranding(role);
  const canEditNotif = canEditNotifications(role);
  const canAccessSec = canAccessSecurity(role);
  const canAccessBill = canAccessBilling(role);

  const tabs = useMemo<SettingsTab[]>(
    () => [
      { value: TAB_VALUES.organization, label: "Organisation" },
      { value: TAB_VALUES.branding, label: "Branding" },
      {
        value: TAB_VALUES.security,
        label: "Securite",
        disabled: !canAccessSec,
      },
      {
        value: TAB_VALUES.notifications,
        label: "Notifications",
      },
      {
        value: TAB_VALUES.billing,
        label: "Facturation",
        disabled: !canAccessBill,
      },
    ],
    [canAccessBill, canAccessSec]
  );

  if (loading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full rounded-[1.75rem]" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Acces refuse</CardTitle>
            <CardDescription>
              Les parametres sont reserves aux roles `ADMIN` et `MANAGER`.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Le dashboard n&apos;affiche aucun contenu de configuration pour votre role actuel.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/95 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Parametres
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Configuration</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Ajustez les parametres organisationnels, le branding et les preferences de
            notifications sans perturber l&apos;architecture existante.
          </p>
        </div>
      </section>

      <SettingsTabs value={activeTab} onValueChange={setActiveTab} tabs={tabs} />

      {activeTab === TAB_VALUES.organization ? (
        <OrganizationSettingsSection canEdit={canEditOrg} />
      ) : null}

      {activeTab === TAB_VALUES.branding ? (
        <BrandingSettingsSection canEdit={canEditBrand} />
      ) : null}

      {activeTab === TAB_VALUES.security ? (
        <SecuritySettingsSection canAccess={canAccessSec} />
      ) : null}

      {activeTab === TAB_VALUES.notifications ? (
        <NotificationSettingsSection canEdit={canEditNotif} />
      ) : null}

      {activeTab === TAB_VALUES.billing ? (
        <BillingSettingsSection canAccess={canAccessBill} />
      ) : null}
    </div>
  );
}
