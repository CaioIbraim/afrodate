"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface PhotoUploadProps {
  onUpload: (file: File) => Promise<void>
  uploading: boolean
  maxFiles?: number
  disabled?: boolean
}

export function PhotoUpload({ onUpload, uploading, maxFiles = 6, disabled = false }: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && !disabled) {
      const file = e.dataTransfer.files[0]
      validateAndUpload(file)
    }
  }
  
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    
    if (e.target.files && e.target.files[0] && !disabled) {
      const file = e.target.files[0]
      validateAndUpload(file)
    }
  }
  
  const validateAndUpload = (file: File) => {
    // Verificar tipo de arquivo
    if (!file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
      alert("Formato de arquivo não suportado. Use JPG, PNG ou GIF.")
      return
    }
    
    // Verificar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. O tamanho máximo é 5MB.")
      return
    }
    
    onUpload(file)
    
    // Limpar input
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }
  
  const handleButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }
  
  return (
    <div>
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={disabled ? undefined : handleButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/gif"
          onChange={handleChange}
          disabled={disabled || uploading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-5 w-5 animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Enviando foto...</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium">Arraste e solte ou clique para enviar</p>
                <p className="text-xs text-muted-foreground">
                  {maxFiles <= 0 
                    ? "Você atingiu o limite máximo de fotos" 
                    : `Você pode adicionar mais ${maxFiles} foto${maxFiles !== 1 ? 's' : ''}`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou GIF (máx. 5MB)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}