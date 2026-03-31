'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Menu, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/services/api'

export function Header({
  onMenuClick,
}: {
  onMenuClick: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const { logout, user } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      router.replace('/login')
      router.refresh()
      toast.success('Deconnexion reussie.')
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Impossible de vous deconnecter.'
      toast.error(message)
    }
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'CG'

  const roleLabel = user?.role ? user.role.replace(/_/g, ' ') : 'Administrateur'

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-full border border-border/70 bg-card p-2.5 text-foreground shadow-sm transition-colors hover:bg-secondary md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden flex-1 sm:flex">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-border/70 bg-card/95 px-4 py-3 shadow-sm transition-colors focus-within:border-primary/25 focus-within:ring-2 focus-within:ring-ring/20">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un produit, une commande ou un client"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="relative rounded-full border border-border/70 bg-card p-2.5 text-foreground shadow-sm transition-colors hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-full border border-border/70 bg-card py-1.5 pl-1.5 pr-3 shadow-sm transition-colors hover:bg-secondary">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-sm">
                <span className="font-medium text-foreground">{user?.name ?? 'Cartigo'}</span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <Link href="/dashboard/settings">
              <DropdownMenuItem className="cursor-pointer">Mon profil</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
              Se deconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
