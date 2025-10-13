interface CourseLink {
  href: string;
  title: string;
}
interface CourseModule {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  videoUrl: string;
  links?: CourseLink[];
}

interface Course {
  id: string;
  priceId: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  instructor: string;
  modules: CourseModule[];
}

export const ofertasConPoder: Course = {
  id: 'ofertas-con-poder',
  priceId: 'prctbl_1RT6fJHdug2e0offfaTbneb2',
  title: 'Ofertas con Poder',
  description: `No es lo que vendes, sino cómo lo estás ofreciendo.`,
  thumbnail:
    'https://maistro.website/assets/videos/offertas-con-poder/thumbnails/ofertas_con_poder_modulo_0.png',
  instructor: 'Patricia Gomez',
  duration: '30 mins',
  modules: [
    {
      id: 'module-0',
      title: '🎯 ¿Qué es una Oferta Irresistible?',
      description: 'Haz que tu cliente diga: “Sería estúpido decir que no”',
      duration: '14 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/offertas-con-poder/thumbnails/ofertas_con_poder_modulo_0.png',
      videoUrl:
        'https://maistro.website/assets/videos/offertas-con-poder/ofertas_con_poder_modulo_0.mp4',
    },
    {
      id: 'module-1',
      title: 'La ecuación del valor y el poder del nicho',
      description: `👉 Tu trabajo es aumentar el resultado soñado y la confianza del cliente en que lo logrará,
 y reducir al máximo el tiempo y el esfuerzo necesarios.`,
      duration: '7 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/offertas-con-poder/thumbnails/ofertas_con_poder_modulo_1.png',
      videoUrl:
        'https://maistro.website/assets/videos/offertas-con-poder/ofertas_con_poder_modulo_1.mp4',
    },
    {
      id: 'module-2',
      title: 'Precios premium, high ticket y el ciclo emocional',
      description: `¿Por qué deberías cobrar más (y no menos)?`,
      duration: '8 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/offertas-con-poder/thumbnails/ofertas_con_poder_modulo_2.png',
      videoUrl:
        'https://maistro.website/assets/videos/offertas-con-poder/ofertas_con_poder_modulo_2.mp4',
    },
    {
      id: 'module-3',
      title: 'Escasez y los 4 activadores de acción',
      description: `Para que una oferta se venda, no basta con que sea buena. Debe ser urgente, única y generar acción inmediata.`,
      duration: `1 minuto 30 sec`,
      thumbnail:
        'https://maistro.website/assets/videos/offertas-con-poder/thumbnails/ofertas_con_poder_modulo_3.png',
      videoUrl:
        'https://maistro.website/assets/videos/offertas-con-poder/ofertas_con_poder_modulo_3.mp4',
    },
  ],
};

export const contenidoConPoder: Course = {
  id: 'contenido-con-poder',
  priceId: 'prctbl_1RQcs6Hdug2e0offAywTsD9R',
  title: 'Contenido con Poder',
  description: 'Emprende con intencion, juega a ganar!',
  thumbnail:
    'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_0.png',
  instructor: 'Patricia Gomez',
  duration: '30 mins',
  modules: [
    {
      id: 'module-intro',
      title: 'Intro – Activa tu Poder Digital 🚀',
      description:
        'Hoy comienza tu transformación. ¡Activa tu poder digital y crea contenido que conecta, inspira y vende! ✨',
      duration: '30 sec',
      thumbnail:
        'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_0.png',
      videoUrl:
        'https://maistro.website/assets/videos/contenido-con-poder/contenido_con_poder_modulo_0.mp4',
    },
    {
      id: 'module-1',
      title: 'Módulo 1 – Construye tu Base de Poder 🧠',
      description:
        'Tu éxito comienza con una base sólida. Define tu propósito, tu cliente ideal y tu mensaje poderoso. ¡Vamos juntas a construirlo! 💥',
      duration: '5 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_1.png',
      videoUrl:
        'https://maistro.website/assets/videos/contenido-con-poder/contenido_con_poder_modulo_1.mp4',
    },
    {
      id: 'module-2',
      title: 'Módulo 2 – Instagram con Intención 📲',
      description:
        'No publiques por publicar. Aprende a usar Instagram de forma estratégica para atraer, enamorar y vender. 🌟',
      duration: '6 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_2.png',
      videoUrl:
        'https://maistro.website/assets/videos/contenido-con-poder/contenido_con_poder_modulo_2.mp4',
    },
    {
      id: 'module-3',
      title: 'Módulo 3 – Webs que Convierten 💻',
      description:
        'Una web no es solo presencia, es poder de venta. Aprende a transformar tu web en tu mejor embudo de ventas. 🚀',
      duration: '3 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_3.png',
      videoUrl:
        'https://maistro.website/assets/videos/contenido-con-poder/contenido_con_poder_modulo_3.mp4',
    },
    {
      id: 'module-4',
      title: 'Módulo 4 – Ventas que Enamoran 💖',
      description:
        'Vende sin miedo, sin sonar a robot. Conecta desde el corazón y conviértete en una vendedora que inspira. ❤️',
      duration: '6 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_4.png',
      videoUrl:
        'https://maistro.website/assets/videos/contenido-con-poder/contenido_con_poder_modulo_4.mp4',
    },
    {
      id: 'module-5',
      title: 'Módulo 5 – Clientes que se Quedan 🤗',
      description:
        'Fidelizar es más poderoso que vender. Aprende a construir relaciones que duren y crea una comunidad que te ame. 💬',
      duration: '4 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_5.png',
      videoUrl:
        'https://maistro.website/assets/videos/contenido-con-poder/contenido_con_poder_modulo_5.mp4',
    },
    {
      id: 'module-6',
      title: 'Módulo 6 – Plan Estratégico Express 📋',
      description:
        '¿Publicar todos los días? No. ¡Publicar con intención y estrategia es la clave! Arma tu plan express y conquista tu mercado. 🎯',
      duration: '3 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_6.png',
      videoUrl:
        'https://maistro.website/assets/videos/contenido-con-poder/contenido_con_poder_modulo_6.mp4',
    },
    {
      id: 'module-bonus',
      title: 'BONUS – Impulsa tu Marca Personal 🌟',
      description:
        'Tu historia, tu voz y tu luz son únicas. ¡Es hora de mostrar tu marca personal al mundo y brillar con fuerza! ✨',
      links: [
        {
          href: 'https://docs.google.com/document/d/1NJvHXENLG7vwRSxBVwq3IgpgmIqsDhsP',
          title: 'Planeador',
        },
        {
          href: 'https://docs.google.com/document/d/1PRrA9xM5s9p00yHoUSIGl9rglr9ozcxs',
          title: 'Diario de Emprendedores',
        },
      ],
      duration: '2 minutos',
      thumbnail:
        'https://maistro.website/assets/videos/contenido-con-poder/thumbnails/contenido_con_poder_modulo_7.png',
      videoUrl:
        'https://maistro.website/assets/videos/contenido-con-poder/contenido_con_poder_modulo_7.mp4',
    },
  ],
};

export const courses: Record<string, Course> = {
  'ofertas-con-poder': ofertasConPoder,
  'contenido-con-poder': contenidoConPoder,
};
