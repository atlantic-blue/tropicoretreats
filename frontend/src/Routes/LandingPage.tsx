import React, { useEffect, useRef, useState } from "react";

/**
 * Tropico Retreats – Final High‑Fidelity Page
 * React + TypeScript + Tailwind v4
 * - Full‑bleed hero, wider grid, pixel‑faithful spacing
 * - ARIA roles/labels, keyboard focus rings
 * - Subtle scroll‑reveal animations and soft shadows
 */

// ---- Simple in‑view reveal hook (no external deps) ----
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown } as const;
}

// ---- Image assets (swap with your own) ----
const IMAGES = {
  hero: "/public/assets/landing-page/hero.webp",
  inset: "/public/assets/landing-page/inset.webp",
  caribbean: "/public/assets/landing-page/caribbean.jpeg",
  casanare: "/public/assets/landing-page/casanare.webp",
  coffee: "/public/assets/landing-page/valley.jpeg",
  valley: "/public/assets/landing-page/valley.jpeg",
  svc1a: "/public/assets/landing-page/svc1a.webp",
  svc1b: "/public/assets/landing-page/svc1b.webp",
  svc2: "/public/assets/landing-page/svc2.webp",
  svc2b: "/public/assets/landing-page/svc2b.jpeg",
  svc3: "/public/assets/landing-page/svc3.webp",
  svc3b: "/public/assets/landing-page/svc3b.jpeg",
  svc4: "/public/assets/landing-page/svc4.jpeg",
  footer: "/public/assets/landing-page/footer.webp",
  van: "/public/assets/landing-page/van.webp",
  driver: "/public/assets/landing-page/driver.webp",
};

// ---- Small UI atoms ----
const PillButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-[13px] font-semibold tracking-wide shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

type ImageCardProps = {
  title: string;
  cta?: string;
  imageUrl: string;
};

const ImageCard: React.FC<ImageCardProps> = ({ title, cta = "See More", imageUrl }) => {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <article
      ref={ref}
      className={`h-[60dvh] group relative aspect-[4/3] w-full overflow-hidden rounded-[22px] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] transition-all ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      } duration-700`}
      aria-label={`${title} destination card`}
      role="article"
    >
      <img
        src={imageUrl}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" aria-hidden />
      <header className="absolute inset-x-0 top-6 flex w-full justify-center">
        <h3 className="rounded-full bg-black/40 px-5 py-2 text-[15px] font-semibold tracking-wide text-white backdrop-blur-sm">
          {title}
        </h3>
      </header>
      <div className="absolute inset-x-0 bottom-6 flex w-full justify-center">
        <button
          className="rounded-full bg-white/90 px-4 py-2 text-[11px] font-semibold text-gray-900 backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          aria-label={`Open ${title}`}
        >
          {cta}
        </button>
      </div>
    </article>
  );
};

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="pl-2 leading-relaxed text-gray-700 before:mr-2 before:inline-block before:h-1.5 before:w-1.5 before:-translate-y-0.5 before:rounded-full before:bg-emerald-600">
    {children}
  </li>
);

// ---- Page ----
const TropicoRetreatsPage: React.FC = () => {
  const heroReveal = useReveal<HTMLDivElement>();
  const introReveal = useReveal<HTMLDivElement>();

  return (
    <main className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      {/* HERO */}
      <section className="relative w-full" role="banner" aria-label="Hero">
        <img src={IMAGES.hero} alt="Jungle terrace in Colombia" className="h-[86dvh] w-full object-cover" />
        <div className="absolute inset-0 bg-black/25" />
        <div
          ref={heroReveal.ref}
          className={`absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white transition-all duration-700 ${
            heroReveal.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <h1 className="text-[44px] leading-tight drop-shadow md:text-[74px]"><span className="font-serif">Tropico Retreats</span></h1>
          <p className="mt-2 text-lg/6 tracking-wide drop-shadow-md md:text-2xl">Corporate Retreats</p>
          <PillButton
            className="mt-6 bg-emerald-600 text-white hover:translate-y-[-1px] hover:bg-emerald-700"
            aria-label="Enquire about a corporate retreat"
          >
            ENQUIRE HERE
          </PillButton>
        </div>
      </section>

      {/* CONTENT WRAPPER */}
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
        {/* INTRO + INSET */}
        <section className="grid grid-cols-1 gap-10 py-14 md:grid-cols-12" aria-labelledby="intro-heading">
          <div ref={introReveal.ref} className={`md:col-span-7 transition-all duration-700 ${introReveal.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <h2 id="intro-heading" className="font-serif text-[30px] md:text-[36px]">Corporate Retreats in Colombia</h2>
            <p className="mt-1 text-emerald-700">With us, everything is included!</p>
            <div className="mt-6 space-y-4 text-[15px]">
              <p>
                Host an unforgettable corporate retreat in Colombia's most spectacular destinations. We can create a
                tailor‑made package for your retreat. Our specialised team will be delighted to assist you in creating
                your corporate retreat including:
              </p>
              <ul className="mt-2 space-y-2">
                <ListItem>Exclusive villas and accommodations</ListItem>
                <ListItem>Private chefs and high‑end catering</ListItem>
                <ListItem>Unique team‑building activities</ListItem>
                <ListItem>Excursions and cultural immersion</ListItem>
                <ListItem>Full logistics, transportation, and coordination</ListItem>
              </ul>
            </div>
          </div>
          <figure className="md:col-span-5">
            <div className="relative overflow-hidden rounded-[22px] shadow-[0_18px_38px_-14px_rgba(0,0,0,0.35)]">
              <img src={IMAGES.inset} alt="Boutique veranda with curtains and mountain views" className="h-[46dvh] aspect-[4/5] w-full object-cover" loading="lazy" />
            </div>
          </figure>
        </section>

        {/* COLLECTION */}
        <section className="border-t border-emerald-900/10 py-12" aria-labelledby="collection-heading">
          <header className="mb-6">
            <h2 id="collection-heading" className="font-serif text-[30px] md:text-[36px]">Our collection of special places</h2>
            <p className="mt-1 text-sm text-gray-600">Adaptable to your desires, everywhere in Colombia</p>
          </header>
          <div className="grid gap-7 md:grid-cols-3">
            <ImageCard title="Caribbean" imageUrl={IMAGES.caribbean} />
            <ImageCard title="Casanare" imageUrl={IMAGES.casanare} />
            <ImageCard title="Coffee Region" imageUrl={IMAGES.coffee} />
          </div>
        </section>
      </div>

      {/* BANNER */}
      <section className="relative mt-6 w-full" aria-label="Tailor made banner">
        <img src={IMAGES.svc1a} alt="Cocora Valley palms" className="h-[56dvh] w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 mx-auto flex max-w-[1400px] flex-col justify-center px-4 sm:px-6 lg:px-10 text-white">
          <h2 className="font-serif text-[34px] md:text-[44px]">Tailor‑made for you</h2>
          <p className="mt-3 max-w-2xl text-sm md:text-base">
            Let us take care of every detail, ensuring a seamless stay with our bespoke itineraries curated to meet your
            unique needs, from start to finish.
          </p>
          <div className="mt-6">
            <PillButton className="bg-white/90 text-gray-900 hover:bg-white" aria-label="Open sample itinerary">
              Sample itinerary
            </PillButton>
          </div>
        </div>
      </section>

      {/* SERVICES – four blocks matching final design */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 py-14" aria-labelledby="services-heading">
        <h2 id="services-heading" className="font-serif text-[30px] md:text-[36px]">Our Corporate Services</h2>

        {/* Row 1 */}
        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
          {/* Choice of destination & venue (two stacked images on left, text+CTA on right) */}
          <div className="grid grid-cols-2 gap-4" aria-label="Choice of destination imagery">
            <img src={IMAGES.svc1b} alt="Mountain lodge" className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md" loading="lazy" />
            <img src={IMAGES.svc2} alt="Boutique venue terrace" className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md" loading="lazy" />
          </div>
          <div className="flex flex-col justify-between rounded-[18px] items-center">
            <div>
              <h3 className="text-[18px] font-semibold tracking-[.12em] text-emerald-700">CHOICE OF DESTINATION & VENUE</h3>
              <p className="mt-2 text-[14px] text-gray-700">
                The venue makes all the difference. Our team guides you in selecting the perfect property, tailored to
                your needs and desire.
              </p>
            </div>
            <div className="pt-4">
              <PillButton className="bg-emerald-700 text-white hover:bg-emerald-800" aria-label="Contact us about destination">
                CONTACT US
              </PillButton>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-[18px] order-2 md:order-1 items-center">
            <div>
              <h3 className="text-[18px] font-semibold tracking-[.12em] text-emerald-700">CATERING & PRIVATE CHEFS</h3>
              <p className="mt-2 text-[14px] text-gray-700">
                Elevate your dining experience with private chefs and high‑end catering. We craft bespoke menus featuring
                local Colombian flavors and international cuisine, tailored to your team's preferences and dietary needs.
                Enjoy gourmet meals and seamless dining service delivered right to your villa.
              </p>
            </div>
            <div className="pt-4">
              <PillButton className="bg-emerald-700 text-white hover:bg-emerald-800" aria-label="Contact us about catering">
                CONTACT US
              </PillButton>
            </div>
          </div>
          <div className="order-1 md:order-2 grid grid-cols-2 gap-4" aria-label="Catering imagery">
            <img src={IMAGES.svc2b} alt="Chef preparing food" className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md" loading="lazy" />
            <img src={IMAGES.svc3} alt="Plated gourmet dishes" className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md" loading="lazy" />
          </div>
        </div>

        {/* Row 3 */}
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-4" aria-label="Excursions imagery">
            <img src={IMAGES.svc3b} alt="Colorful town street" className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md" loading="lazy" />
            <img src={IMAGES.svc4} alt="Historic architecture" className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md" loading="lazy" />
          </div>
          <div className="flex flex-col justify-between rounded-[18px] items-center">
            <div>
              <h3 className="text-[18px] font-semibold tracking-[.12em] text-emerald-700">EXCURSIONS & CULTURAL IMMERSION</h3>
              <p className="mt-2 text-[14px] text-gray-700">
                Give your team a true taste of Colombia. We organize curated excursions and cultural immersion
                experiences, from private coffee farm tours and historical city walks to jungle hikes and sailing trips.
                These opportunities offer a break from the boardroom, providing inspiration and shared unforgettable
                memories.
              </p>
            </div>
            <div className="pt-4">
              <PillButton className="bg-emerald-700 text-white hover:bg-emerald-800" aria-label="Contact us about excursions">
                CONTACT US
              </PillButton>
            </div>
          </div>
        </div>

        {/* Row 4 */}
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-[18px] order-2 md:order-1 items-center">
            <div>
              <h3 className="text-[18px] font-semibold tracking-[.12em] text-emerald-700">FULL LOGISTICS & TRANSPORTATION</h3>
              <p className="mt-2 text-[14px] text-gray-700">
                We handle full logistics, transportation, and coordination for your entire retreat. This includes all
                airport transfers, internal travel, scheduling, and vendor management.
              </p>
            </div>
            <div className="pt-4">
              <PillButton className="bg-emerald-700 text-white hover:bg-emerald-800" aria-label="Contact us about logistics">
                CONTACT US
              </PillButton>
            </div>
          </div>
          <div className="order-1 md:order-2 grid grid-cols-2 gap-4" aria-label="Transportation imagery">
            <img src={IMAGES.van} alt="SUV transportation" className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md" loading="lazy" />
            <img src={IMAGES.driver} alt="Driver detail" className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md" loading="lazy" />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative mt-10 w-full" role="contentinfo" aria-label="Footer">
        <img src={IMAGES.footer} alt="Colorful colonial street" className="h-[46dvh] w-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 mx-auto grid max-w-[1400px] grid-cols-1 items-center justify-between gap-8 px-4 text-white sm:px-6 lg:grid-cols-3 lg:px-10">
          <h2 className="mt-10 text-center font-serif text-[30px] md:text-[36px] lg:col-span-3">TROPICO RETREATS</h2>

          <div className="space-y-2">
            <p className="text-sm/6 opacity-90">LOCATION</p>
            <p className="text-sm">London, UK</p>
            <p className="text-sm">+44 78 06705494</p>
            <a href="mailto:hello@tropicoretreats.com" className="text-sm underline decoration-white/40 underline-offset-4 hover:decoration-white" aria-label="Email us">
              hello@tropicoretreats.com
            </a>
          </div>

          <div className="space-y-2">
            <p className="text-sm/6 opacity-90">BUSINESS HOURS</p>
            <p className="text-sm">Mon–Thu: 9am – 6pm</p>
            <p className="text-sm">Friday: 9am – 1pm</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm/6 opacity-90">GET SOCIAL</p>
            <nav aria-label="Social links" className="flex gap-4">
              <a href="#" aria-label="Instagram" className="rounded-full bg-white/20 px-3 py-1 text-sm hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">IG</a>
              <a href="#" aria-label="LinkedIn" className="rounded-full bg-white/20 px-3 py-1 text-sm hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">IN</a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default TropicoRetreatsPage;
