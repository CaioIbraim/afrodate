import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { StorageService } from '@/lib/services/storage-service'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Camera, UserCircle, X } from 'lucide-react'
import { Button } from './button'

interface ProfilePhotoUploadProps {
  className?: string
  size?: "sm" | "md" | "lg"
  onChange?: (url: string | null) => void
  currentPhotoUrl?: string
}

export function ProfilePhotoUpload({ 
  className, 
  size = "md", 
  onChange,
  currentPhotoUrl 
}: ProfilePhotoUploadProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)

  const sizes = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-40 h-40",
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid format",
        description: "Please select an image file.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      const url = await StorageService.uploadProfileImage(file, user.id)
      setPreview(url)
      onChange?.(url)
      
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [user, onChange, toast])

  const handleRemove = useCallback(async () => {
    if (preview && user) {
      try {
        await StorageService.deleteProfileImage(preview)
        setPreview(null)
        onChange?.(null)
        
        toast({
          title: "Success",
          description: "Profile photo removed successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove image. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [preview, user, onChange, toast])

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className={cn(
        "relative rounded-full overflow-hidden border-2 border-oraculo-purple/50 flex items-center justify-center bg-white",
        sizes[size]
      )}>
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Profile photo"
              fill
              className="object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <UserCircle className={cn("text-oraculo-purple/70", sizes[size])} />
        )}

        <label className={cn(
          "absolute bottom-0 right-0 bg-gradient-to-r from-oraculo-purple to-oraculo-cyan",
          "text-white rounded-full p-1.5 cursor-pointer",
          isUploading && "opacity-50 cursor-not-allowed"
        )}>
          <Camera className="h-4 w-4" />
          <input
            type="file"
            className="sr-only"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>
      <p className="text-oraculo-muted text-sm mt-2">
        {isUploading ? "Uploading..." : preview ? "Click to change" : "Add your photo"}
      </p>
    </div>
  )
}

