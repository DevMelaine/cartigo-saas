"use client";

import { z } from "zod";

import {
  ApiError,
  getValidAccessToken,
  refreshAccessToken,
} from "@/services/api";

export const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;
export const UPLOAD_TYPES = ["product", "logo", "cover"] as const;

const uploadResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    bucket: z.string().min(1),
    path: z.string().min(1),
    url: z.string().url(),
  }),
});

export type UploadType = (typeof UPLOAD_TYPES)[number];
export type SingleImageUploadType = UploadType;
export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];
export type UploadProgressHandler = (progress: number) => void;

type UploadImageFileInput = {
  type: UploadType;
  file: File;
  onProgress?: UploadProgressHandler;
};

export type UploadedFile = {
  bucket: string;
  path: string;
  url: string;
};

export class UploadError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "UploadError";
    this.status = status;
    this.details = details;
  }
}

function normalizeUploadType(value: string): UploadType {
  if ((UPLOAD_TYPES as readonly string[]).includes(value)) {
    return value as UploadType;
  }

  throw new UploadError("Type de fichier non supporte.", 400);
}

function normalizeImageType(value: string): SupportedImageType {
  if ((SUPPORTED_IMAGE_TYPES as readonly string[]).includes(value)) {
    return value as SupportedImageType;
  }

  throw new UploadError("Format non supporte. Utilisez PNG, JPG ou WEBP.", 400);
}

export function validateImageFile(file: File) {
  const fileType = normalizeImageType(file.type);

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new UploadError("Fichier trop volumineux. Maximum 3MB.", 400);
  }

  return {
    fileType,
  };
}

function extractErrorMessage(payload: unknown, fallbackMessage: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    return String(payload.message);
  }

  return fallbackMessage;
}

function buildUploadFormData(input: {
  type: UploadType;
  file: File;
}) {
  const formData = new FormData();

  formData.append("type", input.type);
  formData.append("file", input.file);

  return formData;
}

async function sendMultipartRequest(
  formData: FormData,
  onProgress?: UploadProgressHandler,
  bearerToken?: string | null
) {
  return new Promise<unknown>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/api/uploads", true);
    xhr.responseType = "text";
    xhr.setRequestHeader("Accept", "application/json");

    if (bearerToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${bearerToken}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress?.(progress);
    };

    xhr.onerror = () => {
      reject(new UploadError("Le transfert de l'image a echoue. Reessayez.", 502));
    };

    xhr.onabort = () => {
      reject(new UploadError("Le transfert de l'image a ete interrompu.", 499));
    };

    xhr.onload = () => {
      let payload: unknown = null;

      if (xhr.responseText) {
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          payload = xhr.responseText;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(payload);
        return;
      }

      reject(
        new UploadError(
          extractErrorMessage(payload, "Le serveur a refuse l'image."),
          xhr.status || 500,
          payload
        )
      );
    };

    xhr.send(formData);
  });
}

async function uploadViaNextApiRoute(
  formData: FormData,
  onProgress?: UploadProgressHandler,
  retryOnAuthError = true
) {
  try {
    const bearerToken = await getValidAccessToken("/uploads");

    if (!bearerToken) {
      throw new UploadError("Authentification requise.", 401);
    }

    return await sendMultipartRequest(formData, onProgress, bearerToken);
  } catch (error) {
    if (
      retryOnAuthError &&
      error instanceof UploadError &&
      error.status === 401
    ) {
      const nextAccessToken = await refreshAccessToken();
      return sendMultipartRequest(formData, onProgress, nextAccessToken);
    }

    throw error;
  }
}

export async function uploadImageFile({
  type,
  file,
  onProgress,
}: UploadImageFileInput): Promise<UploadedFile> {
  const normalizedType = normalizeUploadType(type);

  validateImageFile(file);

  const payload = await uploadViaNextApiRoute(
    buildUploadFormData({
      type: normalizedType,
      file,
    }),
    onProgress
  );

  const parsed = uploadResponseSchema.parse(payload);
  return parsed.data;
}

export function getUploadErrorMessage(error: unknown) {
  if (error instanceof UploadError) {
    return error.message;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof z.ZodError) {
    return "La reponse du serveur d'upload est invalide.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Une erreur est survenue pendant l'upload.";
}
