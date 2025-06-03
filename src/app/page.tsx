import styles from '@/styles/Home.module.css';

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
              src="https://videos.pexels.com/video-files/8079132/8079132-uhd_2732_1440_25fps.mp4"
              autoPlay
              muted
              loop
            ></video>
          </div>
          <div className={styles.videoContent}>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl xl:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan animate-gradient mb-4">Em Breve!!!</h1>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl xl:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan animate-gradient">Conheça o Oráculo</h1>
            <h3 className="font-light text-3xl mt-6">
              Um lugar pra se conectar com sua alma gêmea e celebrar suas raízes
            </h3>

            <div className="rounded-md shadow mt-6">
              <a
                href="/signup"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-oraculo-purple to-oraculo-cyan hover:opacity-90 md:py-4 md:text-lg md:px-10 transition-all duration-300"
              >
                Cadastre-se agora e esteja mais próximo a quem você ama
              </a>
            </div>
          </div>
        </section>

        {/* Seção Sobre */}
        <section className="sm:mt-6 lg:mt-8 mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white py-16">
          <div className="my-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28 flex gap-3 lg:flex lg:flex-row">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl">
                <span className="block xl:inline text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan">Conexões Afrocentradas</span>
                <span className="block text-amber-600 xl:inline ml-2"> Para Relacionamentos Reais</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Encontre pessoas que valorizam sua identidade e cultura. No Oráculo, cada match é uma oportunidade de celebrar sua ancestralidade e construir laços autênticos.
              </p>
              {/* Botões */}
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <a
                    href="/signup"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-oraculo-purple to-oraculo-cyan hover:opacity-90 md:py-4 md:text-lg md:px-10 transition-all duration-300"
                  >
                    Cadastre-se agora
                  </a>
                </div>
              </div>
            </div>
            {/* Imagem */}
            <div className="lg:inset-y-0 lg:right-0 lg:w-1/2 my-4">
              <img
                className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full rounded-2xl shadow-lg"
                src="https://images.pexels.com/photos/6578920/pexels-photo-6578920.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                alt="Casal afro-brasileiro sorrindo juntos"
              />
            </div>
          </div>
        </section>

        {/* Seção Chamada à Ação */}
        <section className="relative z-10 overflow-hidden bg-gradient-to-r from-oraculo-purple to-oraculo-cyan py-16 px-8 mt-20">
          <div className="container mx-auto">
            <div className="-mx-4 flex flex-wrap items-center">
              <div className="w-full px-4 lg:w-1/2">
                <div className="text-center lg:text-left">
                  <h1 className="mt-0 mb-3 text-3xl font-bold leading-tight sm:text-4xl sm:leading-tight md:text-[40px] md:leading-tight text-white">
                    Construa Relacionamentos com Propósito
                  </h1>
                  <p className="w-full text-base font-medium leading-relaxed sm:text-lg sm:leading-relaxed text-white">
                    Junte-se a uma comunidade que celebra a diversidade cultural e promove conexões verdadeiras.
                  </p>
                </div>
              </div>
              <div className="w-full px-4 lg:w-1/2">
                <div className="text-center lg:text-right">
                  <a
                    href="/signup"
                    className="font-semibold rounded-lg mx-auto inline-flex items-center justify-center bg-white py-4 px-9 hover:bg-opacity-90 transition-all duration-300"
                  >
                    Comece Sua Jornada
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}