import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'

export default function CustomersPage() {
  return (
    <DashboardPageShell
      eyebrow="Clients"
      title="Relation client"
      description="Une base premium pour visualiser vos segments, profils et signaux de fidélisation, avec une structure claire pour brancher les données CRM et commandes."
      metrics={[
        { label: 'Clients actifs', value: '4 286', hint: 'Base exploitable pour vues segmentées et recherche.' },
        { label: 'Nouveaux cette semaine', value: '184', hint: 'Parcours d’acquisition et activation à brancher.' },
        { label: 'Taux de réachat', value: '28%', hint: 'Métrique prête pour calcul automatique côté backend.' },
      ]}
      panels={[
        {
          title: 'Segmentation',
          description: 'Des blocs pensés pour les audiences et la fidélisation.',
          items: [
            'Segments nouveaux / fidèles / dormants',
            'Valeur vie client et fréquence d’achat',
            'Recherche par identité ou email',
            'Historique de commandes et panier moyen',
          ],
        },
        {
          title: 'Activation CRM',
          description: 'L’interface est déjà conçue pour accueillir les workflows relationnels.',
          items: [
            'Tags et scoring comportemental',
            'Campagnes de réengagement',
            'Alertes churn et comptes VIP',
            'Notes internes et suivi équipe',
          ],
        },
      ]}
      sideTitle="Backlog d’intégration"
      sideDescription="Les futures données clients pourront être branchées sans refaire les écrans."
      highlights={[
        'Connexion à la liste clients et au détail profil.',
        'Synchronisation avec l’historique de commandes.',
        'Filtrage avancé et segmentation dynamique.',
      ]}
    />
  )
}
