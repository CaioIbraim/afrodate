"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ProgressSteps } from '@/components/ui/progress-steps'
import { GalleryPhotoUpload } from '@/components/ui/gallery-photo-upload'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'

export default function GalleryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [photos, setPhotos] = useState<string[]>([])

  const handleComplete = () => {
    if (photos.length < 1) {
      toast({
        title: "Foto obrigatória",
        description: "Adicione pelo menos uma foto ao seu perfil",
        variant: "destructive"
      })
      return
    }

    router.push("/profile")
  }

  return (
    <div className="app-container">
      <div className="mb-8">
        <ProgressSteps steps={5} currentStep={2} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-center mb-6 gradient-text">
          Sua Galeria
        </h1>

        <p className="text-center text-oraculo-muted mb-8">
          Adicione fotos para mostrar mais sobre você (mínimo 1, máximo 6)
        </p>

        <GalleryPhotoUpload
          className="mb-8"
          onChange={setPhotos}
          currentUrls={photos}
        />

        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-oraculo-purple text-oraculo-purple"
          >
            Voltar
          </Button>
          <Button
            className="gradient-button"
            onClick={handleComplete}
          >
            Salvar Alterações
          </Button>
        </div>
      </motion.div>
    </div>
  )
}