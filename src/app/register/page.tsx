'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { motion } from 'framer-motion'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'
import { useToast } from '@/hooks/use-toast'
import { FaGoogle, FaFacebook } from 'react-icons/fa'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    gender: 'male'
  })

  const { signUpWithEmail, signInWithProvider, loading, error } = useSupabaseAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password || !formData.name || !formData.age) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    await signUpWithEmail(formData.email, formData.password, {
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender
    })

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      })
    }
  }

  const handleProviderSignIn = async (provider: 'google' | 'facebook') => {
    try {
      await signInWithProvider(provider)
      if (error) {
        throw new Error(error)
      }
    } catch (err) {
      console.error("Provider sign-in error:", err)
      toast({
        title: "Erro ao entrar com provedor",
        description: err instanceof Error ? err.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: "url('/images/couple-street-food.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/30 z-10" />

      <div className="relative z-20 h-full flex flex-col items-center justify-between py-12 px-4">
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-white"
          >
            <Logo size="lg" withHearts className="text-white" />
          </motion.div>
        </div>

        <motion.div
          className="w-full max-w-md space-y-4 backdrop-blur-md bg-white/20 p-8 rounded-3xl shadow-lg border border-white/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-xl text-center mb-6 font-semibold text-white">Criar Conta</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-white/90 h-12 rounded-full"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-white/90 h-12 rounded-full"
            />
            <Input
              type="text"
              placeholder="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-white/90 h-12 rounded-full"
            />
            <Input
              type="number"
              placeholder="Idade"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="bg-white/90 h-12 rounded-full"
            />
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full bg-white/90 h-12 rounded-full px-4"
            >
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
              <option value="other">Outro</option>
            </select>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white h-12 rounded-full hover:from-pink-600 hover:to-purple-600"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>

          <div className="flex justify-between mt-4">
            <Button
              className="flex items-center justify-center w-full bg-blue-600 text-white h-12 rounded-full mr-2"
              onClick={() => handleProviderSignIn('google')}
            >
              <FaGoogle className="mr-2" /> Entrar com Google
            </Button>
            <Button
              className="flex items-center justify-center w-full bg-blue-800 text-white h-12 rounded-full ml-2"
              onClick={() => handleProviderSignIn('facebook')}
            >
              <FaFacebook className="mr-2" /> Entrar com Facebook
            </Button>
          </div>

          <Button
            variant="link"
            className="w-full text-white hover:text-white/80"
            onClick={() => window.location.href = '/'}
          >
            Já tem uma conta? Faça login
          </Button>
        </motion.div>
      </div>
    </div>
  )
}