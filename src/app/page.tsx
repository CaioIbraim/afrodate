"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Drum, MapPin, Heart, Mail, Instagram, Twitter, Facebook } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      {/* Hero Section */}
      <header className="relative w-full min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-pattern opacity-10 z-0"></div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-red-700/20 z-0"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-red-600 via-amber-500 to-green-600 bg-clip-text text-transparent">
            Viva Afro: Conecte-se à Sua Essência
          </h1>

          <p className="text-xl md:text-2xl mb-10 text-neutral-800 max-w-2xl mx-auto">
            Encontre pessoas que compartilham suas paixões, sua cultura e suas histórias.
          </p>

          <Link href="/signup">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg py-6 px-8 rounded-full shadow-lg hover:shadow-xl transition-all">
              Crie Seu Perfil Agora
            </Button>
          </Link>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-16 left-0 w-32 h-32 bg-red-600 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -top-16 right-0 w-32 h-32 bg-green-600 rounded-full opacity-20 blur-3xl"></div>
      </header>

      {/* Description Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">O que é a Viva Afro?</h2>

          <p className="text-lg md:text-xl mb-10 text-neutral-700">
            A Viva Afro é mais que um app de relacionamentos – é um espaço para celebrar a cultura afro. Conecte-se
            através de expertises únicas, como culinária ou dança, e lugares que marcaram sua vida, como Salvador ou
            Luanda.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
              <h3 className="text-xl font-bold mb-3 flex items-center">
                <Heart className="mr-2 text-red-600" size={24} />
                Matches Reais
              </h3>
              <p className="text-neutral-700">
                Baseados em compatibilidade cultural e experiências compartilhadas, não apenas em aparências.
              </p>
            </div>

            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
              <h3 className="text-xl font-bold mb-3 flex items-center">
                <Drum className="mr-2 text-amber-600" size={24} />
                Comunidade Vibrante
              </h3>
              <p className="text-neutral-700">
                Uma rede que pulsa com diversidade e autenticidade, celebrando a riqueza da cultura afro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-neutral-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Por que escolher a Viva Afro?</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Drum className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Celebre Sua Cultura</h3>
              <p className="text-neutral-700">Adicione expertises como "Capoeira" ou "História Afro" ao seu perfil.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Compartilhe Lugares</h3>
              <p className="text-neutral-700">
                Conecte-se por viagens ou destinos favoritos que marcaram sua história.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Planos para Todos</h3>
              <p className="text-neutral-700">Do gratuito ao VIP, viva a experiência do seu jeito e no seu ritmo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Conexões que Inspiram</h2>

          <div className="bg-neutral-50 p-8 rounded-2xl border border-neutral-200 flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2">
              <Image
                src="/placeholder.svg?height=400&width=400"
                alt="Casal cozinhando juntos"
                width={400}
                height={400}
                className="rounded-xl shadow-md"
              />
            </div>

            <div className="w-full md:w-1/2">
              <blockquote className="text-lg md:text-xl italic text-neutral-700 mb-6">
                "Mariana encontrou João por causa da paixão por culinária afro. Hoje, eles cozinham juntos e
                compartilham receitas que celebram suas raízes!"
              </blockquote>

              <div className="flex items-center">
                <div className="w-12 h-12 bg-amber-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-bold">Mariana & João</p>
                  <p className="text-neutral-600 text-sm">Salvador, BA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-red-600 via-amber-500 to-green-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Junte-se à Viva Afro Hoje</h2>

          <p className="text-xl mb-10 max-w-2xl mx-auto">
            Faça parte de uma comunidade que valoriza quem você é. Crie seu perfil e comece a conectar!
          </p>

          <Link href="/signup">
            <Button className="bg-black hover:bg-neutral-800 text-white font-bold text-lg py-6 px-8 rounded-full shadow-lg hover:shadow-xl transition-all mb-10">
              Comece Agora
            </Button>
          </Link>

          <div className="max-w-md mx-auto">
            <p className="mb-4">Disponível em breve. Inscreva-se para ser notificado!</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const email = (e.target as HTMLFormElement).email.value
                // Here you would typically send this to your backend
                alert(`Email ${email} registrado com sucesso! Em breve entraremos em contato.`)
                ;(e.target as HTMLFormElement).reset()
              }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Input
                name="email"
                type="email"
                placeholder="Seu e-mail"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/70 h-12"
                required
              />
              <Button type="submit" className="bg-white text-black hover:bg-neutral-200 font-bold h-12">
                Inscrever-se
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-neutral-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <h2 className="text-2xl font-bold mb-4 md:mb-0">Viva Afro</h2>

            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com/vivaafro"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-500 transition-colors"
              >
                <Instagram size={24} />
              </a>
              <a
                href="https://twitter.com/vivaafro"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-500 transition-colors"
              >
                <Twitter size={24} />
              </a>
              <a
                href="https://facebook.com/vivaafro"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-500 transition-colors"
              >
                <Facebook size={24} />
              </a>
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-neutral-400 mb-4 md:mb-0">Onde a conexão encontra a essência.</p>

            <div className="flex items-center text-neutral-400">
              <Mail size={16} className="mr-2" />
              <span>contato@vivaafro.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

