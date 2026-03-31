"use client"

import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export default function AnalyticsPage() {
  const { hasPermission } = useAuth()

  if (!hasPermission('analytics.read')) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-8 text-sm text-muted-foreground">
          Cette page analytique est reservee aux sessions disposant de `analytics.read`.
        </CardContent>
      </Card>
    )
  }

  return (
    <DashboardPageShell
      eyebrow="Analyses"
      title="Cockpit analytique"
      description="Un espace haut de gamme pour brancher les métriques business, la performance marketing et les signaux produit sans devoir repenser la hiérarchie visuelle."
      metrics={[
        { label: 'Revenu mensuel', value: '$124k', hint: 'Prêt pour les séries temporelles backend.' },
        { label: 'Conversion', value: '3.24%', hint: 'Comparaison de périodes et détection d’écarts.' },
        { label: 'Acquisition rentable', value: '64%', hint: 'Visualisations prêtes pour les sources de trafic.' },
      ]}
      panels={[
        {
          title: 'Analyse business',
          description: 'Le layout supporte KPI, tendances, funnels et corrélations.',
          items: [
            'Courbes de revenu et commandes',
            'Entonnoirs d’acquisition',
            'Segmentation par source et pays',
            'Comparaison période vs période',
          ],
        },
        {
          title: 'Prêt pour le temps réel',
          description: 'L’interface est structurée pour absorber des flux plus dynamiques.',
          items: [
            'Cartes d’alertes intelligentes',
            'Widgets réordonnables',
            'Filtres globaux persistants',
            'Préparation export et reporting',
          ],
        },
      ]}
      sideTitle="Branches futures"
      sideDescription="Les prochains modules analytiques pourront être branchés progressivement."
      highlights={[
        'Connexion aux agrégats backend et aux endpoints stats.',
        'Mise en cache React Query par plage temporelle.',
        'Widgets alimentés par de vraies séries métier.',
      ]}
    />
  )
}
