import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'

export default function SettingsPage() {
  return (
    <DashboardPageShell
      eyebrow="Configuration"
      title="Paramètres de la plateforme"
      description="Une interface premium prête à accueillir les réglages d’organisation, les rôles, les préférences de facturation et les intégrations, sans refonte future."
      metrics={[
        { label: 'Espaces configurés', value: '06 modules', hint: 'Organisation, équipe, facturation et intégrations.' },
        { label: 'Rôles supportés', value: '04 rôles', hint: 'Structure prévue pour droits et permissions.' },
        { label: 'Sécurité', value: 'Élevée', hint: 'Flux auth et session déjà centralisés.' },
      ]}
      panels={[
        {
          title: 'Administration',
          description: 'Sections conçues pour gérer les paramètres critiques.',
          items: [
            'Profil de l’organisation',
            'Gestion des membres et rôles',
            'Préférences opérationnelles',
            'Notifications et sécurité',
          ],
        },
        {
          title: 'Intégrations',
          description: 'Prévu pour connecter les services externes sans casser l’UI.',
          items: [
            'Paiement et facturation',
            'Messagerie et emails transactionnels',
            'Google OAuth et sécurité',
            'Webhooks et services tiers',
          ],
        },
      ]}
      sideTitle="Prêt pour production"
      sideDescription="La structure des paramètres est déjà adaptée à un SaaS sérieux."
      highlights={[
        'Pages stabilisées pour formulaires backend.',
        'Emplacements prévus pour validations et états de mutation.',
        'Surface cohérente pour permissions et audit settings.',
      ]}
    />
  )
}
