import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { StorageService } from '@/lib/services/storage-service'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from './button'

interface GalleryPhotoUploadProps {
  className?: string
  maxFiles?: number
  onChange?: (urls: string[]) => void
  currentUrls?: string[]
}

export function GalleryPhotoUpload({ 
  className,
  maxFiles = 6,
  onChange,
  currentUrls = []
}: GalleryPhotoUploadProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [previews, setPreviews] = useState<string[]>(currentUrls)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !user) return

    const validFiles = files.filter(file => file.type.startsWith("image/"))
    if (validFiles.length !== files.length) {
      toast({
        title: "Arquivo inválido",
        description: "Apenas imagens são permitidas",
        variant: "destructive"
      })
      return
    }

    try {
      setIsUploading(true)
      const uploadPromises = validFiles.map(file => 
        StorageService.uploadGalleryImage(file, user.id)
      )
      const urls = await Promise.all(uploadPromises)
      const newPreviews = [...previews, ...urls].slice(0, maxFiles)
      
      setPreviews(newPreviews)
      onChange?.(newPreviews)
      toast({
        title: "Upload concluído",
        description: "Imagens adicionadas com sucesso"
      })
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Falha ao enviar as imagens",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }, [user, previews, maxFiles, toast, onChange])

  const handleRemove = useCallback(async (index: number) => {
    try {
      const urlToRemove = previews[index]
      await StorageService.deleteGalleryImage(urlToRemove)
      
      const newPreviews = previews.filter((_, i) => i !== index)
      setPreviews(newPreviews)
      onChange?.(newPreviews)
      toast({
        title: "Imagem removida",
        description: "A imagem foi excluída com sucesso"
      })
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Falha ao excluir a imagem",
        variant: "destructive"
      })
    }
  }, [previews, toast, onChange])

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", className)}>
      {previews.map((preview, index) => (
        <div key={preview} className="relative aspect-square border rounded-lg overflow-hidden">
          <Image
            src={preview}
            alt="Foto da galeria"
            fill
            className="object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 rounded-full"
            onClick={() => handleRemove(index)}
            disabled={isUploading}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {previews.length < maxFiles && (
        <label className="
          aspect-square border-2 border-dashed rounded-lg
          flex items-center justify-center cursor-pointer
          hover:border-oraculo-purple transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        ">
          <Plus className="h-8 w-8 text-oraculo-purple/70" />
          <input
            type="file"
            className="sr-only"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isUploading || previews.length >= maxFiles}
          />
        </label>
      )}
    </div>
  )
}