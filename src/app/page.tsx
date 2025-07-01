import styles from '@/styles/Home.module.css';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-oraculo-purple to-oraculo-cyan h-2" />

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
            
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl xl:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan animate-gradient">Conheça o Oráculo!</h1>
            <h3 className="font-light text-3xl mt-6">
              Um lugar pra se conectar com sua alma gêmea e celebrar suas raízes
            </h3>

            <div className="rounded-md shadow mt-6 px-6">
              <a
                href="/signup"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-oraculo-purple to-oraculo-cyan hover:opacity-90 md:py-4 md:text-lg md:px-10 transition-all duration-300"
              >
                Cadastre-se agora e esteja mais próximo a quem você ama
              </a>
            </div>


            <div className="rounded-md shadow mt-6  px-6">
              <a
                href="/login"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-oraculo-purple to-oraculo-cyan hover:opacity-90 md:py-4 md:text-lg md:px-10 transition-all duration-300"
              >
                Entrar agora 
              </a>
            </div>

            
          </div>
        </section>

      </div>

    </div>
  );
}