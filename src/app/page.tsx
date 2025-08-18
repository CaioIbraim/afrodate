// /pages/index.tsx
import styles from '@/styles/Home.module.css';
import Image from 'next/image';
import GradientButton from '@/components/GradientButton'; // 1. Importe o novo componente

import type { NextPage } from 'next'; // Boa prática para tipar páginas

const Home: NextPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#181818]">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] h-2" />

      <div className="flex-1 flex flex-col">
        {/* Seção Hero */}
        <section className={`${styles.heroSection} relative h-screen flex flex-col items-center justify-center text-center text-white`}>
          <div className={styles.videoDocker}>
            <video
              className={styles.video}
              src="/video/video.mp4"
              autoPlay
              muted
              loop
            ></video>
          </div>
          <div className={styles.videoContent}>

            <Image alt="Logo" src="/logo.png" height={150} width={150} className=" mx-auto mb-8" />
            
            <h1 className="text-4xl text-oraculo-cyan text-2xl tracking-tight sm:text-6xl xl:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#4DBAFE] animate-gradient">Conheça o Oráculo!</h1>
            <h3 className="font-light text-3xl mt-6">
              Um lugar pra se conectar com sua alma gêmea
            </h3>

            {/* 2. Use o componente para os botões */}
            <div className="px-6 w-full mx-auto">
              <GradientButton href="/login">
                Entrar
              </GradientButton>

              <GradientButton href="/signup">
                Cadastre-se
              </GradientButton>
            </div>
            
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;