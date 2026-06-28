"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImageIcon, RefreshCw, X } from "lucide-react";

import type { UploadProgressHandler } from "@/services/upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { UploadDropzone } from "./upload-dropzone";

export type ImageUploadHandler = (
  file: File,
  onProgress?: UploadProgressHandler
) => Promise<string>;

interface ImageUploadProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  onRemove?: () => void;
  onUpload?: ImageUploadHandler;
  disabled?: boolean;
  className?: string;
}

function revokeObjectUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  onUpload,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [transientPreview, setTransientPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transientPreviewRef = useRef<string | null>(null);

  const displayedPreview = !isReplacing ? transientPreview ?? value ?? null : null;

  const setPreview = useCallback((nextPreview: string | null) => {
    if (
      transientPreviewRef.current &&
      transientPreviewRef.current !== nextPreview
    ) {
      revokeObjectUrl(transientPreviewRef.current);
    }

    transientPreviewRef.current =
      nextPreview?.startsWith("blob:") ? nextPreview : null;
    setTransientPreview(nextPreview);
  }, []);

  useEffect(() => {
    return () => {
      revokeObjectUrl(transientPreviewRef.current);
    };
  }, []);

  useEffect(() => {
    if (
      isUploading ||
      !value ||
      !transientPreview ||
      !transientPreview.startsWith("blob:")
    ) {
      return;
    }

    let isCancelled = false;
    const nextImage = new window.Image();

    nextImage.onload = () => {
      if (!isCancelled) {
        setPreview(null);
      }
    };

    nextImage.src = value;

    return () => {
      isCancelled = true;
      nextImage.onload = null;
    };
  }, [isUploading, setPreview, transientPreview, value]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || disabled || !onUpload) {
        setError("Le service d'upload n'est pas disponible.");
        return;
      }

      const file = files[0];
      const localPreview = URL.createObjectURL(file);

      setPreview(localPreview);
      setIsUploading(true);
      setUploadComplete(false);
      setUploadProgress(0);
      setError(null);

      try {
        const nextImageUrl = await onUpload(file, (progress) => {
          setUploadProgress(progress);
        });

        setUploadProgress(100);
        setUploadComplete(true);
        setIsReplacing(false);
        onChange?.(nextImageUrl);
      } catch (uploadError) {
        setPreview(null);
        setError(
          uploadError instanceof Error ? uploadError.message : "L'upload a echoue."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [disabled, onChange, onUpload, setPreview]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setUploadProgress(0);
    setUploadComplete(false);
    setIsReplacing(false);
    setError(null);
    onChange?.(null);
    onRemove?.();
  }, [onChange, onRemove, setPreview]);

  const handleReplace = useCallback(() => {
    setIsReplacing(true);
    setUploadComplete(false);
    setUploadProgress(0);
    setError(null);
  }, []);

  if (!displayedPreview) {
    return (
      <div className={className}>
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          disabled={disabled || isUploading}
        />
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={displayedPreview}
            alt="Preview"
            fill
            unoptimized
            loading="eager"
            priority={false}
            placeholder="empty"
            sizes="(max-width: 1024px) 100vw, 960px"
            className={cn(
              "h-full w-full object-cover transition-all duration-500",
              isUploading && "scale-105 blur-sm"
            )}
          />

          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-background/20" />
                  <svg className="absolute inset-0 h-16 w-16 -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={175.93}
                      strokeDashoffset={175.93 - (175.93 * uploadProgress) / 100}
                      className="text-primary transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-background">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-background">Upload en cours...</p>
              </div>
            </div>
          ) : null}

          {uploadComplete && !isUploading ? (
            <div className="absolute right-3 top-3 rounded-full bg-primary p-2 text-primary-foreground shadow-lg animate-in zoom-in duration-300">
              <Check className="h-4 w-4" />
            </div>
          ) : null}
        </div>

        {isUploading ? (
          <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        ) : null}

        {!isUploading ? (
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-4">
              <div className="flex items-center gap-2 text-background">
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Image prete</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleReplace}
                  className="h-8 rounded-lg bg-background/90 px-3 text-foreground hover:bg-background"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Remplacer
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  className="h-8 w-8 rounded-lg p-0"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Supprimer l&apos;image</span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
