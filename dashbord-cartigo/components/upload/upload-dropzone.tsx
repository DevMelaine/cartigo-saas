"use client"

import { useCallback, useState } from "react"
import { Upload, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE = 3 * 1024 * 1024 // 3MB

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  multiple?: boolean
  maxFiles?: number
  disabled?: boolean
  className?: string
}

export function UploadDropzone({
  onFilesSelected,
  multiple = false,
  maxFiles = 10,
  disabled = false,
  className,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; error: string | null } => {
      const validFiles: File[] = []
      
      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          return { valid: [], error: "Format non supporté. Utilisez PNG, JPG ou WEBP." }
        }
        if (file.size > MAX_SIZE) {
          return { valid: [], error: "Fichier trop volumineux. Maximum 3MB." }
        }
        validFiles.push(file)
      }

      if (!multiple && validFiles.length > 1) {
        return { valid: [validFiles[0]], error: null }
      }

      if (multiple && validFiles.length > maxFiles) {
        return { valid: [], error: `Maximum ${maxFiles} fichiers autorisés.` }
      }

      return { valid: validFiles, error: null }
    },
    [multiple, maxFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const { valid, error } = validateFiles(files)

      if (error) {
        setError(error)
        return
      }

      setError(null)
      onFilesSelected(valid)
    },
    [disabled, validateFiles, onFilesSelected]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      const { valid, error } = validateFiles(files)

      if (error) {
        setError(error)
        return
      }

      setError(null)
      onFilesSelected(valid)
      e.target.value = ""
    },
    [validateFiles, onFilesSelected]
  )

  return (
    <div className={cn("w-full", className)}>
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[200px] p-8",
          "border-2 border-dashed rounded-2xl cursor-pointer",
          "transition-all duration-300 ease-out",
          "bg-card hover:bg-muted/50",
          isDragging && "border-primary bg-primary/5 scale-[1.02]",
          !isDragging && !disabled && "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed bg-muted",
          error && "border-destructive bg-destructive/5"
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div
          className={cn(
            "flex flex-col items-center gap-4 transition-transform duration-300",
            isDragging && "scale-110"
          )}
        >
          <div
            className={cn(
              "p-4 rounded-2xl transition-colors duration-300",
              isDragging ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              error && "bg-destructive/10 text-destructive"
            )}
          >
            {error ? (
              <AlertCircle className="w-8 h-8" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div className="text-center">
            <p className={cn(
              "text-base font-medium",
              error ? "text-destructive" : "text-foreground"
            )}>
              {error ? error : isDragging ? "Déposez votre fichier ici" : "Glissez-déposez ou cliquez"}
            </p>
            {!error && (
              <p className="mt-1 text-sm text-muted-foreground">
                PNG, JPG ou WEBP • Max 3MB
              </p>
            )}
          </div>
        </div>
      </label>
    </div>
  )
}
