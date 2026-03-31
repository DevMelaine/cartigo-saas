"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, GripVertical, ImagesIcon, PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MAX_UPLOAD_SIZE_BYTES,
  SUPPORTED_IMAGE_TYPES,
  type UploadProgressHandler,
} from "@/services/upload";

export type GalleryUploadHandler = (
  file: File,
  onProgress?: UploadProgressHandler
) => Promise<string>;

type InternalGalleryImageItem = {
  id: string;
  url: string;
  previewUrl: string;
  isUploading?: boolean;
  progress?: number;
  file?: File;
};

type ImageUploaderGalleryProps = {
  value?: string[];
  onChange?: (images: string[]) => void;
  onUpload?: GalleryUploadHandler;
  maxImages?: number;
  disabled?: boolean;
  className?: string;
};

function revokeObjectUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function createUploadId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createPersistedImages(urls: string[]) {
  return urls.map<InternalGalleryImageItem>((url, index) => ({
    id: `${index}-${url}`,
    url,
    previewUrl: url,
  }));
}

function toPersistedUrls(images: InternalGalleryImageItem[]) {
  return images
    .filter((image) => !image.isUploading && image.url)
    .map((image) => image.url);
}

function areUrlArraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function ImageUploaderGallery({
  value = [],
  onChange,
  onUpload,
  maxImages = 8,
  disabled = false,
  className,
}: ImageUploaderGalleryProps) {
  const [images, setImages] = useState<InternalGalleryImageItem[]>(() =>
    createPersistedImages(value)
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const imagesRef = useRef<InternalGalleryImageItem[]>(images);
  const lastSyncedUrlsRef = useRef<string[]>(value);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    if (imagesRef.current.some((image) => image.isUploading)) {
      return;
    }

    const currentUrls = toPersistedUrls(imagesRef.current);

    if (areUrlArraysEqual(currentUrls, value)) {
      lastSyncedUrlsRef.current = value;
      return;
    }

    lastSyncedUrlsRef.current = value;
    setImages(createPersistedImages(value));
  }, [value]);

  useEffect(() => {
    const nextUrls = toPersistedUrls(images);

    if (areUrlArraysEqual(nextUrls, lastSyncedUrlsRef.current)) {
      return;
    }

    lastSyncedUrlsRef.current = nextUrls;
    onChange?.(nextUrls);
  }, [images, onChange]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        revokeObjectUrl(image.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    const cleanups = images
      .filter(
        (image) =>
          !image.isUploading &&
          Boolean(image.url) &&
          image.previewUrl.startsWith("blob:")
      )
      .map((image) => {
        let isCancelled = false;
        const nextImage = new window.Image();

        nextImage.onload = () => {
          if (isCancelled) {
            return;
          }

          setImages((currentImages) =>
            currentImages.map((currentImage) => {
              if (
                currentImage.id !== image.id ||
                currentImage.previewUrl === currentImage.url
              ) {
                return currentImage;
              }

              revokeObjectUrl(currentImage.previewUrl);

              return {
                ...currentImage,
                previewUrl: currentImage.url,
              };
            })
          );
        };

        nextImage.src = image.url;

        return () => {
          isCancelled = true;
          nextImage.onload = null;
        };
      });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [images]);

  const validateFiles = useCallback(
    (files: File[]) => {
      const remainingSlots = Math.max(0, maxImages - imagesRef.current.length);
      const filesToProcess = files.slice(0, remainingSlots);
      const nextErrors: string[] = [];
      const validFiles: File[] = [];

      filesToProcess.forEach((file) => {
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
          nextErrors.push(`${file.name}: format non supporte.`);
          return;
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          nextErrors.push(`${file.name}: fichier trop volumineux (max 3MB).`);
          return;
        }

        validFiles.push(file);
      });

      if (files.length > remainingSlots) {
        nextErrors.push(`Maximum ${maxImages} images autorisees.`);
      }

      return {
        validFiles,
        nextErrors,
      };
    },
    [maxImages]
  );

  const updateImage = useCallback(
    (id: string, updater: (image: InternalGalleryImageItem) => InternalGalleryImageItem) => {
      setImages((currentImages) =>
        currentImages.map((image) => (image.id === id ? updater(image) : image))
      );
    },
    []
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (disabled) {
        return;
      }

      if (!onUpload) {
        setErrors(["Le service d'upload n'est pas disponible."]);
        return;
      }

      const { validFiles, nextErrors } = validateFiles(files);
      setErrors(nextErrors);

      if (validFiles.length === 0) {
        return;
      }

      const pendingImages = validFiles.map<InternalGalleryImageItem>((file) => ({
        id: createUploadId(),
        url: "",
        previewUrl: URL.createObjectURL(file),
        file,
        isUploading: true,
        progress: 0,
      }));

      setImages((currentImages) => [...currentImages, ...pendingImages]);

      await Promise.allSettled(
        pendingImages.map(async (image) => {
          try {
            const imageUrl = await onUpload(image.file as File, (progress) => {
              updateImage(image.id, (currentImage) => ({
                ...currentImage,
                progress,
              }));
            });

            setImages((currentImages) => {
              return currentImages.map((currentImage) =>
                currentImage.id === image.id
                  ? {
                      ...currentImage,
                      url: imageUrl,
                      isUploading: false,
                      progress: 100,
                    }
                  : currentImage
              );
            });
          } catch (error) {
            revokeObjectUrl(image.previewUrl);
            setErrors((currentErrors) => [
              ...currentErrors,
              error instanceof Error ? error.message : "L'upload d'une image a echoue.",
            ]);
            setImages((currentImages) => {
              return currentImages.filter(
                (currentImage) => currentImage.id !== image.id
              );
            });
          }
        })
      );
    },
    [disabled, onUpload, updateImage, validateFiles]
  );

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      await uploadFiles(files);
      event.target.value = "";
    },
    [uploadFiles]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLLabelElement | HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
      await uploadFiles(Array.from(event.dataTransfer.files));
    },
    [uploadFiles]
  );

  const handleRemove = useCallback(
    (id: string) => {
      setImages((currentImages) => {
        const removedImage = currentImages.find((image) => image.id === id);

        if (removedImage) {
          revokeObjectUrl(removedImage.previewUrl);
        }

        return currentImages.filter((image) => image.id !== id);
      });
    },
    []
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLLabelElement | HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(true);
    },
    []
  );

  const handleGridItemDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, index: number) => {
      event.preventDefault();
      setDragOverIndex(index);
    },
    []
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLLabelElement | HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      setImages((currentImages) => {
        const updatedImages = [...currentImages];
        const [draggedItem] = updatedImages.splice(draggedIndex, 1);
        updatedImages.splice(dragOverIndex, 0, draggedItem);
        return updatedImages;
      });
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragOver(false);
  }, [draggedIndex, dragOverIndex]);

  const isUploading = useMemo(
    () => images.some((image) => image.isUploading),
    [images]
  );
  const canAddMore = images.length < maxImages;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <ImagesIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Galerie produit</p>
            <p className="text-xs text-muted-foreground">
              {images.length}/{maxImages} image{maxImages > 1 ? "s" : ""} disponibles
            </p>
          </div>
        </div>

        {errors.length > 0 ? (
          <div className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {errors.length} erreur{errors.length > 1 ? "s" : ""}
          </div>
        ) : null}
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-2xl border border-border/70 bg-muted/50",
                draggedIndex === index && "scale-[0.98] opacity-70",
                dragOverIndex === index && "ring-2 ring-primary ring-offset-2",
                !disabled && !image.isUploading && "cursor-grab active:cursor-grabbing"
              )}
              draggable={!disabled && !image.isUploading}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => handleGridItemDragOver(event, index)}
              onDragEnd={handleDragEnd}
            >
              <Image
                src={image.previewUrl}
                alt={`Image ${index + 1}`}
                fill
                unoptimized
                loading="eager"
                priority={false}
                placeholder="empty"
                sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                className={cn(
                  "object-cover transition-all duration-300",
                  image.isUploading && "blur-sm"
                )}
              />

              {image.isUploading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/65 px-4 text-center text-background backdrop-blur-sm">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/20">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${image.progress ?? 0}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium">{image.progress ?? 0}%</p>
                </div>
              ) : null}

              {!image.isUploading ? (
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="absolute left-2 top-2 rounded-lg bg-background/85 p-1.5 text-foreground">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/85 p-0 text-foreground"
                    onClick={() => handleRemove(image.id)}
                    disabled={disabled}
                  >
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">Supprimer l&apos;image</span>
                  </Button>
                  <div className="absolute bottom-2 left-2 rounded-full bg-background/85 px-2 py-1 text-[11px] font-semibold text-foreground">
                    {index + 1}
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          {canAddMore ? (
            <label
              className={cn(
                "flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 transition-colors",
                isDragOver && "border-primary bg-primary/5",
                (disabled || isUploading) && "cursor-not-allowed opacity-50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept={SUPPORTED_IMAGE_TYPES.join(",")}
                onChange={(event) => {
                  void handleFileInputChange(event);
                }}
                className="hidden"
                disabled={disabled || isUploading}
              />
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <PlusIcon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Ajouter</span>
            </label>
          ) : null}
        </div>
      ) : (
        <label
          className={cn(
            "flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-colors",
            isDragOver && "border-primary bg-primary/5",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept={SUPPORTED_IMAGE_TYPES.join(",")}
            onChange={(event) => {
              void handleFileInputChange(event);
            }}
            className="hidden"
            disabled={disabled || isUploading}
          />
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <ImagesIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Deposez vos images ici</p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG ou WEBP. Maximum 3MB par image.
            </p>
          </div>
        </label>
      )}

      {errors.length > 0 ? (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={`${error}-${index}`} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
