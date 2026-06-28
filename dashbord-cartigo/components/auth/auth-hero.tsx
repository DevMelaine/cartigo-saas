'use client'

import { Building2, Shield, Zap, BarChart3 } from 'lucide-react'

export function AuthHero() {
  return (
    <div className="relative hidden lg:flex lg:flex-1 flex-col justify-between overflow-hidden bg-primary p-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20">
            <span className="text-2xl font-bold text-primary-foreground">C</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">Cartigo</h1>
            <p className="text-xs font-medium text-primary-foreground/60 tracking-widest uppercase">Dashboard</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm px-4 py-1.5 border border-primary-foreground/20">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-primary-foreground/80">Nouveau</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold text-primary-foreground leading-tight text-balance">
            Pilotez votre organisation avec précision
          </h2>
          <p className="text-lg text-primary-foreground/70 max-w-md leading-relaxed">
            Un tableau de bord intelligent qui transforme vos données en décisions stratégiques.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Analytics avancés"
            description="Visualisez vos KPIs en temps réel"
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Sécurité maximale"
            description="Données chiffrées de bout en bout"
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Performance"
            description="Temps de réponse < 100ms"
          />
          <FeatureCard
            icon={<Building2 className="h-5 w-5" />}
            title="Multi-organisations"
            description="Gérez plusieurs entités"
          />
        </div>
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-foreground/20 to-primary-foreground/10 border-2 border-primary backdrop-blur-sm flex items-center justify-center text-xs font-medium text-primary-foreground/80"
              >
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-foreground">+2,500 organisations</p>
            <p className="text-xs text-primary-foreground/60">nous font confiance</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-primary-foreground/50 text-sm">
          <span>SOC 2 Certifié</span>
          <span>•</span>
          <span>RGPD Compliant</span>
          <span>•</span>
          <span>ISO 27001</span>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group rounded-xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 p-4 transition-all duration-300 hover:bg-primary-foreground/10 hover:border-primary-foreground/20 hover:scale-105 cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground transition-colors group-hover:bg-primary-foreground/20">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-primary-foreground text-sm">{title}</h3>
          <p className="text-xs text-primary-foreground/60 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  )
}
