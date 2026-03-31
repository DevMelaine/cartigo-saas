"use client";

import { useCallback, useState } from "react";

import {
  getUploadErrorMessage,
  type UploadProgressHandler,
  type UploadType,
  uploadImageFile,
} from "@/services/upload";

type UploadFileArgs = {
  type: UploadType;
  file: File;
  onProgress?: UploadProgressHandler;
};

export function useUpload() {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async ({ type, file, onProgress }: UploadFileArgs) => {
      setError(null);

      try {
        const uploadedFile = await uploadImageFile({
          type,
          file,
          onProgress,
        });

        return uploadedFile.url;
      } catch (error) {
        const message = getUploadErrorMessage(error);
        setError(message);
        throw new Error(message, {
          cause: error instanceof Error ? error : undefined,
        });
      }
    },
    []
  );

  const createUploadHandler = useCallback(
    (type: UploadType) =>
      async (file: File, onProgress?: UploadProgressHandler) =>
        uploadFile({
          type,
          file,
          onProgress,
        }),
    [uploadFile]
  );

  return {
    error,
    clearError,
    uploadFile,
    createUploadHandler,
  };
}
