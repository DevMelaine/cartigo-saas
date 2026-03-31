import { CheckCircle2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type DashboardMetric = {
  label: string
  value: string
  hint: string
}

type DashboardPanel = {
  title: string
  description: string
  items: string[]
}

type DashboardPageShellProps = {
  eyebrow: string
  title: string
  description: string
  metrics: DashboardMetric[]
  panels: DashboardPanel[]
  sideTitle: string
  sideDescription: string
  highlights: string[]
}

export function DashboardPageShell({
  eyebrow,
  title,
  description,
  metrics,
  panels,
  sideTitle,
  sideDescription,
  highlights,
}: DashboardPageShellProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/95 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {eyebrow}
              </span>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em]">
                Prêt pour le backend
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/80 px-4 py-2 text-sm text-secondary-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Architecture UI stabilisée et prête à recevoir les vraies données.
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="gap-3 border-border/60 bg-background/70 py-5">
              <CardHeader className="gap-1 pb-0">
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-2xl">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {metric.hint}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-4">
          {panels.map((panel) => (
            <Card key={panel.title} className="border-border/70">
              <CardHeader>
                <CardTitle>{panel.title}</CardTitle>
                <CardDescription>{panel.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {panel.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-border/60 bg-secondary/60 px-4 py-3 text-sm text-foreground"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>{sideTitle}</CardTitle>
            <CardDescription>{sideDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {highlights.map((highlight) => (
              <div key={highlight} className="flex items-start gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
                <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-sm leading-6 text-foreground">{highlight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
