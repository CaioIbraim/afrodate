"use client"

import type React from "react"

import { useState } from "react"
import { UserCircle, Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface ProfilePhotoUploadProps {
  className?: string
  size?: "sm" | "md" | "lg"
  onChange?: (file: File | null) => void
}

export function ProfilePhotoUpload({ className, size = "md", onChange }: ProfilePhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const { toast } = useToast()

  const sizes = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-40 h-40",
  }

  const iconSizes = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
      if (onChange) onChange(file)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setPreview(null)
    if (onChange) onChange(null)
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "relative rounded-full overflow-hidden border-2 border-oraculo-purple/50 flex items-center justify-center bg-white",
          sizes[size],
        )}
      >
        {preview ? (
          <>
            <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <UserCircle className={cn("text-oraculo-purple/70", iconSizes[size])} />
        )}

        <label className="absolute bottom-0 right-0 bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white rounded-full p-1.5 cursor-pointer">
          <Camera className="h-4 w-4" />
          <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>
      <p className="text-oraculo-muted text-sm mt-2">{preview ? "Clique para alterar" : "Adicione sua foto"}</p>
    </div>
  )
}

