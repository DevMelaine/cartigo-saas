'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Box,
  ChevronLeft,
  FolderKanban,
  Home,
  History,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
}

export function Sidebar({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const pathname = usePathname()
  const { hasPermission } = useAuth()
  const navItems: NavItem[] = [
    { name: 'Vue d ensemble', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
    ...(hasPermission('product.read')
      ? [{ name: 'Produits', href: '/dashboard/products', icon: <Box className="h-5 w-5" /> }]
      : []),
    ...(hasPermission('category.read')
      ? [
          {
            name: 'Categories',
            href: '/dashboard/categories',
            icon: <FolderKanban className="h-5 w-5" />,
          },
        ]
      : []),
    ...(hasPermission('order.read')
      ? [{ name: 'Commandes', href: '/dashboard/orders', icon: <ShoppingCart className="h-5 w-5" /> }]
      : []),
    { name: 'Clients', href: '/dashboard/customers', icon: <Users className="h-5 w-5" /> },
    ...(hasPermission('user.read')
      ? [
          {
            name: 'Utilisateurs',
            href: '/dashboard/users',
            icon: <ShieldCheck className="h-5 w-5" />,
          },
        ]
      : []),
    ...(hasPermission('analytics.read')
      ? [{ name: 'Analyses', href: '/dashboard/analytics', icon: <BarChart3 className="h-5 w-5" /> }]
      : []),
    ...(hasPermission('activity.read')
      ? [{ name: 'Activite', href: '/dashboard/activity', icon: <History className="h-5 w-5" /> }]
      : []),
    { name: 'Parametres', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full flex-col border-r border-sidebar-border/80 bg-sidebar/95 shadow-sm backdrop-blur-xl transition-all duration-300 ease-out',
          open ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border/80 px-4">
          {open ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                  <span className="text-sm font-bold">C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-sidebar-foreground">Cartigo</span>
                  <span className="text-xs text-muted-foreground">Control center</span>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-sidebar-border/80 bg-card p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                aria-label="Reduire la barre laterale"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              aria-label="Ouvrir la barre laterale"
            >
              <span className="text-sm font-bold">C</span>
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.name}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {item.icon}
                {open ? <span>{item.name}</span> : null}
              </Link>
            )
          })}
        </nav>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fermer la navigation"
        />
      ) : null}
    </>
  )
}
