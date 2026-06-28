"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvitationMutations } from "@/hooks/useInvitations";
import { ApiError } from "@/services/api";

type AcceptInvitationFormProps = {
  token?: string;
};

export function AcceptInvitationForm({ token = "" }: AcceptInvitationFormProps) {
  const router = useRouter();
  const { acceptInvitation, isAccepting } = useInvitationMutations();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      toast.error("Le lien d'invitation est invalide.");
      return;
    }

    try {
      await acceptInvitation({
        token,
        name,
        password,
      });

      toast.success("Invitation acceptee. Vous pouvez maintenant vous connecter.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Impossible d'accepter cette invitation pour le moment.";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">C</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">Cartigo</h1>
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Dashboard
          </p>
        </div>
      </div>

      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour a la connexion
      </Link>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/80 px-4 py-2 text-sm text-secondary-foreground">
          <MailCheck className="h-4 w-4 text-primary" />
          Rejoindre une organisation
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Accepter l&apos;invitation</h2>
        <p className="text-muted-foreground">
          Finalisez votre acces a l&apos;organisation en definissant votre nom et votre mot de
          passe.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="invite-name" className="text-sm font-medium">
            Nom complet
          </Label>
          <Input
            id="invite-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Votre nom"
            className="h-12 bg-card"
            disabled={isAccepting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-password" className="text-sm font-medium">
            Mot de passe
          </Label>
          <div className="relative">
            <Input
              id="invite-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 caracteres"
              className="h-12 bg-card pr-10"
              autoComplete="new-password"
              disabled={isAccepting}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isAccepting || !token}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        >
          {isAccepting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Rejoindre l&apos;organisation
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {!token ? (
        <p className="text-center text-sm text-destructive">
          Ce lien d&apos;invitation est invalide ou incomplet.
        </p>
      ) : null}
    </div>
  );
}
