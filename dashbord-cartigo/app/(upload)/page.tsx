"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImageIcon, Layout, Sparkles } from "lucide-react";

import {
  ImageUpload,
  ImageUploaderGallery,
} from "@/components/upload";
import { useAuth } from "@/hooks/useAuth";
import { useUpload } from "@/hooks/useUpload";
import type { SingleImageUploadType } from "@/services/upload";

const SINGLE_IMAGE_UPLOAD_TYPES = new Set<SingleImageUploadType>([
  "logo",
  "cover",
  "product",
]);

function resolveSingleImageUploadType(value: string | null): SingleImageUploadType {
  if (value && SINGLE_IMAGE_UPLOAD_TYPES.has(value as SingleImageUploadType)) {
    return value as SingleImageUploadType;
  }

  return "logo";
}

export default function Page() {
  const searchParams = useSearchParams();
  const { organization, loading } = useAuth();
  const [singleImageUrl, setSingleImageUrl] = useState<string | null>(null);
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);

  const singleType = resolveSingleImageUploadType(searchParams.get("singleType"));
  const { createUploadHandler } = useUpload();

  const singleUploadHandler = useMemo(
    () => createUploadHandler(singleType),
    [createUploadHandler, singleType]
  );
  const galleryUploadHandler = useMemo(
    () => createUploadHandler("product"),
    [createUploadHandler]
  );

  const canUploadSingle = Boolean(organization?.id);
  const canUploadGallery = Boolean(organization?.id);

  const singleHint = useMemo(() => {
    if (!organization?.id) {
      return "Connectez-vous avec une organisation active pour envoyer une image.";
    }

    return null;
  }, [organization?.id]);

  const galleryHint = useMemo(() => {
    if (!organization?.id) {
      return "Connectez-vous avec une organisation active pour envoyer une galerie produit.";
    }

    return null;
  }, [organization?.id]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Upload Studio</h1>
              <p className="text-xs text-muted-foreground">Gestionnaire d&apos;images premium</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              v1.0
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-12">
          <section className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5 p-3">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Image principale</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Uploadez l&apos;image principale de votre produit ou organisation.
                  Format recommande : 16:9 pour un meilleur affichage.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <ImageUpload
                value={singleImageUrl}
                onChange={setSingleImageUrl}
                onRemove={() => setSingleImageUrl(null)}
                onUpload={singleUploadHandler}
                disabled={loading || !canUploadSingle}
              />
              {singleImageUrl ? (
                <div className="mt-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    URL retournee par le backend
                  </p>
                  <p className="mt-2 break-all text-sm text-foreground">{singleImageUrl}</p>
                </div>
              ) : null}
              {singleHint ? <p className="mt-4 text-sm text-muted-foreground">{singleHint}</p> : null}
            </div>
          </section>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm text-muted-foreground">ou</span>
            </div>
          </div>

          <section className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5 p-3">
                <Layout className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Galerie d&apos;images</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajoutez jusqu&apos;a 8 images pour votre galerie produit.
                  Glissez-deposez pour reorganiser l&apos;ordre d&apos;affichage.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <ImageUploaderGallery
                value={galleryImageUrls}
                onChange={setGalleryImageUrls}
                onUpload={galleryUploadHandler}
                maxImages={8}
                disabled={loading || !canUploadGallery}
              />
              {galleryImageUrls.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    URLs retournees par le backend
                  </p>
                  <div className="mt-3 space-y-2">
                    {galleryImageUrls.map((imageUrl) => (
                      <p key={imageUrl} className="break-all text-sm text-foreground">
                        {imageUrl}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {galleryHint ? <p className="mt-4 text-sm text-muted-foreground">{galleryHint}</p> : null}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">Formats acceptes</h3>
              <p className="text-sm text-muted-foreground">
                PNG, JPG et WEBP uniquement pour une qualite optimale.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">Taille max</h3>
              <p className="text-sm text-muted-foreground">
                Chaque fichier est limite a 3MB pour des temps de chargement rapides.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">Reorganisation</h3>
              <p className="text-sm text-muted-foreground">
                Glissez et deposez vos images pour modifier leur ordre d&apos;affichage.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-16 border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>Upload Studio | Interface Premium</span>
          <span>Pret pour l&apos;integration API</span>
        </div>
      </footer>
    </div>
  );
}
