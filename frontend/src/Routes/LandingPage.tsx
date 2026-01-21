import React, { useEffect, useRef, useState } from "react";

/**
 * Tropico Retreats – Corporate Wellness Retreats Landing Page
 * React + TypeScript + Tailwind v4
 * Inspired by Bainland.co.uk corporate wellness design
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

// ---- Image assets ----
const IMAGES = {
  hero: "/public/assets/landing-page/hero.webp",
  inset: "/public/assets/landing-page/inset.webp",
  caribbean: "/public/assets/landing-page/caribbean.webp",
  casanare: "/public/assets/landing-page/casanare.jpg",
  coffee: "/public/assets/landing-page/valley.jpg",
  valley: "/public/assets/landing-page/valley.jpg",
  svc1a: "/public/assets/landing-page/svc1a.jpg",
  svc1b: "/public/assets/landing-page/svc1b.jpg",
  svc2: "/public/assets/landing-page/svc2.jpg",
  svc2b: "/public/assets/landing-page/svc2b.jpg",
  svc3: "/public/assets/landing-page/svc3.jpg",
  svc3b: "/public/assets/landing-page/svc3b.jpg",
  svc4: "/public/assets/landing-page/svc4.jpg",
  footer: "/public/assets/landing-page/footer.jpg",
  van: "/public/assets/landing-page/van.jpg",
  driver: "/public/assets/landing-page/driver.jpg",
};

// ---- Amenity Icons (SVG components) ----
const AmenityIcon: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div className="flex flex-col items-center gap-2 p-4">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
      <span className="text-2xl">{icon}</span>
    </div>
    <span className="text-center text-xs font-medium text-gray-700">{label}</span>
  </div>
);

// ---- FAQ Item ----
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-emerald-900/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        aria-expanded={isOpen}
      >
        <span className="pr-4 font-medium text-gray-900">{question}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-transform duration-200">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-gray-600">{answer}</p>
      </div>
    </div>
  );
};

// ---- Small UI atoms ----
const PillButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string }> = ({
  className = "",
  children,
  href,
  ...props
}) => {
  const baseClasses = `inline-flex items-center justify-center rounded-full px-6 py-2.5 text-[13px] font-semibold tracking-wide shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50 ${className}`;

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {children}
      </a>
    );
  }

  return (
    <button {...props} className={baseClasses}>
      {children}
    </button>
  );
};

type BespokeCardProps = {
  title: string;
  description: string;
  imageUrl: string;
  cta?: string;
};

const BespokeCard: React.FC<BespokeCardProps> = ({ title, description, imageUrl, cta = "Details" }) => {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <article
      ref={ref}
      className={`group relative overflow-hidden rounded-[22px] bg-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.2)] transition-all duration-700 hover:shadow-[0_15px_40px_-12px_rgba(0,0,0,0.3)] ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          loading="lazy"
        />
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold tracking-wide text-emerald-800">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
        <button className="mt-4 text-sm font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition hover:decoration-emerald-700">
          {cta} →
        </button>
      </div>
    </article>
  );
};

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
  const amenitiesReveal = useReveal<HTMLDivElement>();

  return (
    <main className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      {/* HERO */}
      <section className="relative w-full" role="banner" aria-label="Hero">
        <img src={IMAGES.hero} alt="Jungle terrace in Colombia" className="h-[86dvh] w-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div
          ref={heroReveal.ref}
          className={`absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white transition-all duration-700 ${
            heroReveal.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <p className="mb-3 text-sm tracking-[0.3em] uppercase opacity-90 md:text-base">
            corporate stays · wellness getaways · team retreats
          </p>
          <h1 className="text-[44px] leading-tight drop-shadow md:text-[74px]">
            <span className="font-serif">Tropico Retreats</span>
          </h1>
          <p className="mt-2 text-lg/6 tracking-wide drop-shadow-md md:text-2xl">
            Corporate & Wellness Retreats
          </p>
          <PillButton
            className="mt-8 bg-emerald-600 text-white hover:translate-y-[-1px] hover:bg-emerald-700"
            aria-label="Enquire about a corporate retreat"
          >
            ENQUIRE HERE
          </PillButton>
        </div>
      </section>

      {/* TAILORED FOR YOU - Intro Section */}
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <section className="grid grid-cols-1 gap-10 py-16 md:grid-cols-12" aria-labelledby="intro-heading">
          <div
            ref={introReveal.ref}
            className={`md:col-span-7 transition-all duration-700 ${
              introReveal.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Tailored for You</p>
            <h2 id="intro-heading" className="mt-2 font-serif text-[30px] md:text-[40px]">
              Corporate & Wellness Retreats in Colombia
            </h2>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-gray-700">
              <p>
                Experience Colombia's most spectacular destinations with our luxury villas, each featuring private pools and
                dedicated team support. We specialize in creating the perfect Corporate or Wellness event tailored to your needs.
              </p>
              <p>
                Our specialized team will be delighted to assist you in creating your bespoke retreat—from venue selection
                to full logistics coordination.
              </p>
              <p className="mt-4 font-medium text-emerald-800">
                Contact us:{" "}
                <a
                  href="mailto:hello@tropicoretreats.com"
                  className="underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-700"
                >
                  hello@tropicoretreats.com
                </a>
              </p>
            </div>
          </div>
          <figure className="md:col-span-5">
            <div className="relative overflow-hidden rounded-[22px] shadow-[0_18px_38px_-14px_rgba(0,0,0,0.35)]">
              <img
                src={IMAGES.inset}
                alt="Boutique veranda with curtains and mountain views"
                className="h-[46dvh] aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
            </div>
          </figure>
        </section>

        {/* BESPOKE ESCAPES - 3 Cards */}
        <section className="border-t border-emerald-900/10 py-14" aria-labelledby="bespoke-heading">
          <header className="mb-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Bespoke Escapes</p>
            <h2 id="bespoke-heading" className="mt-2 font-serif text-[30px] md:text-[36px]">
              Everything You Need
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600">
              From luxury accommodations to gourmet dining and unique experiences—we handle every detail.
            </p>
          </header>
          <div className="grid gap-8 md:grid-cols-3">
            <BespokeCard
              title="Accommodations"
              description="Luxury villas and boutique lodges for 8–30 guests, featuring private pools, stunning views, and exclusive amenities."
              imageUrl={IMAGES.svc1b}
            />
            <BespokeCard
              title="Gastronomy"
              description="Private chefs crafting bespoke menus with local Colombian flavors and international cuisine tailored to your preferences."
              imageUrl={IMAGES.svc2b}
            />
            <BespokeCard
              title="Experiences"
              description="Instructor-led activities, team building, cultural immersion, and wellness sessions designed for your team."
              imageUrl={IMAGES.svc3b}
            />
          </div>
        </section>

        {/* WHAT'S AVAILABLE - Amenities Icons */}
        <section
          ref={amenitiesReveal.ref}
          className={`border-t border-emerald-900/10 py-14 transition-all duration-700 ${
            amenitiesReveal.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          aria-labelledby="amenities-heading"
        >
          <header className="mb-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
              Corporate & Wellness Events
            </p>
            <h2 id="amenities-heading" className="mt-2 font-serif text-[30px] md:text-[36px]">
              What's Available
            </h2>
          </header>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-10">
            <AmenityIcon icon="👨‍🍳" label="Private Chefs" />
            <AmenityIcon icon="📋" label="Bespoke Itinerary" />
            <AmenityIcon icon="🧘" label="Yoga Instructor" />
            <AmenityIcon icon="🏢" label="Conference Room" />
            <AmenityIcon icon="🎵" label="Live Music" />
            <AmenityIcon icon="🛁" label="Private Pools" />
            <AmenityIcon icon="🏊" label="Swimming Pool" />
            <AmenityIcon icon="📶" label="Free WiFi" />
            <AmenityIcon icon="🚐" label="Transportation" />
            <AmenityIcon icon="🎯" label="Team Building" />
          </div>
        </section>

        {/* DESTINATIONS */}
        <section className="border-t border-emerald-900/10 py-14" aria-labelledby="collection-heading">
          <header className="mb-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Our Destinations</p>
            <h2 id="collection-heading" className="mt-2 font-serif text-[30px] md:text-[36px]">
              Collection of Special Places
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600">
              Adaptable to your desires, everywhere in Colombia
            </p>
          </header>
          <div className="grid gap-7 md:grid-cols-3">
            <ImageCard title="Caribbean" imageUrl={IMAGES.caribbean} />
            <ImageCard title="Casanare" imageUrl={IMAGES.casanare} />
            <ImageCard title="Coffee Region" imageUrl={IMAGES.coffee} />
          </div>
        </section>
      </div>

      {/* MEETING SPACE BANNER */}
      <section className="relative w-full" aria-label="Meeting space">
        <img src={IMAGES.svc2} alt="Meeting space venue" className="h-[50dvh] w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 mx-auto flex max-w-[1400px] items-center px-4 sm:px-6 lg:px-10">
          <div className="max-w-xl text-white">
            <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-90">Conference Facilities</p>
            <h2 className="mt-2 font-serif text-[34px] md:text-[44px]">The Meeting Room</h2>
            <p className="mt-4 text-sm leading-relaxed md:text-base">
              Our configurable meeting spaces accommodate up to 24 boardroom-style or 40 theatre-style attendees—perfect
              for training sessions, presentations, or private meetings in a stunning natural setting.
            </p>
            <PillButton
              className="mt-6 bg-white/90 text-gray-900 hover:bg-white"
              aria-label="Enquire about meeting space"
            >
              ENQUIRE HERE
            </PillButton>
          </div>
        </div>
      </section>

      {/* TAILOR-MADE BANNER */}
      <section className="relative mt-0 w-full" aria-label="Tailor made banner">
        <img src={IMAGES.svc1a} alt="Cocora Valley palms" className="h-[50dvh] w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 mx-auto flex max-w-[1400px] flex-col justify-center px-4 sm:px-6 lg:px-10 text-white">
          <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-90">Bespoke Packages</p>
          <h2 className="mt-2 font-serif text-[34px] md:text-[44px]">Tailor‑made for You</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed md:text-base">
            Let us take care of every detail—ensuring a seamless stay with our bespoke itineraries curated to meet your
            unique needs. From accommodation to activities, we'll handle all the details at a special rate.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <PillButton className="bg-white/90 text-gray-900 hover:bg-white" aria-label="View sample itinerary">
              Sample Itinerary
            </PillButton>
            <PillButton className="bg-emerald-600 text-white hover:bg-emerald-700" aria-label="Contact us">
              CONTACT US
            </PillButton>
          </div>
        </div>
      </section>

      {/* SERVICES – four blocks matching final design */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 py-14" aria-labelledby="services-heading">
        <header className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">What We Offer</p>
          <h2 id="services-heading" className="mt-2 font-serif text-[30px] md:text-[36px]">
            Our Corporate Services
          </h2>
        </header>

        {/* Row 1 */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-4" aria-label="Choice of destination imagery">
            <img
              src={IMAGES.svc1b}
              alt="Mountain lodge"
              className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md"
              loading="lazy"
            />
            <img
              src={IMAGES.svc2}
              alt="Boutique venue terrace"
              className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-[18px] font-semibold tracking-[.12em] text-emerald-700">
              CHOICE OF DESTINATION & VENUE
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-700">
              The venue makes all the difference. Our team guides you in selecting the perfect property—from beachfront
              villas to mountain lodges—tailored to your needs and desires.
            </p>
            <div className="mt-5">
              <PillButton
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                aria-label="Contact us about destination"
              >
                CONTACT US
              </PillButton>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="flex flex-col justify-center order-2 md:order-1">
            <h3 className="text-[18px] font-semibold tracking-[.12em] text-emerald-700">CATERING & PRIVATE CHEFS</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-700">
              Elevate your dining experience with private chefs and high‑end catering. We craft bespoke menus featuring
              local Colombian flavors and international cuisine, tailored to your team's preferences and dietary needs.
            </p>
            <div className="mt-5">
              <PillButton
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                aria-label="Contact us about catering"
              >
                CONTACT US
              </PillButton>
            </div>
          </div>
          <div className="order-1 md:order-2 grid grid-cols-2 gap-4" aria-label="Catering imagery">
            <img
              src={IMAGES.svc2b}
              alt="Chef preparing food"
              className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md"
              loading="lazy"
            />
            <img
              src={IMAGES.svc3}
              alt="Plated gourmet dishes"
              className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md"
              loading="lazy"
            />
          </div>
        </div>

        {/* Row 3 */}
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-4" aria-label="Excursions imagery">
            <img
              src={IMAGES.svc3b}
              alt="Colorful town street"
              className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md"
              loading="lazy"
            />
            <img
              src={IMAGES.svc4}
              alt="Historic architecture"
              className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-[18px] font-semibold tracking-[.12em] text-emerald-700">
              EXCURSIONS & CULTURAL IMMERSION
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-700">
              Give your team a true taste of Colombia. We organize curated excursions—from private coffee farm tours and
              historical city walks to jungle hikes and sailing trips—creating unforgettable shared memories.
            </p>
            <div className="mt-5">
              <PillButton
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                aria-label="Contact us about excursions"
              >
                CONTACT US
              </PillButton>
            </div>
          </div>
        </div>

        {/* Row 4 */}
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="flex flex-col justify-center order-2 md:order-1">
            <h3 className="text-[18px] font-semibold tracking-[.12em] text-emerald-700">
              FULL LOGISTICS & TRANSPORTATION
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-700">
              We handle full logistics, transportation, and coordination for your entire retreat. This includes all
              airport transfers, internal travel, scheduling, and vendor management—so you can focus on your team.
            </p>
            <div className="mt-5">
              <PillButton
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                aria-label="Contact us about logistics"
              >
                CONTACT US
              </PillButton>
            </div>
          </div>
          <div className="order-1 md:order-2 grid grid-cols-2 gap-4" aria-label="Transportation imagery">
            <img
              src={IMAGES.van}
              alt="SUV transportation"
              className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md"
              loading="lazy"
            />
            <img
              src={IMAGES.driver}
              alt="Driver detail"
              className="aspect-[4/3] w-full rounded-[18px] object-cover shadow-md"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 py-14" aria-labelledby="faq-heading">
        <header className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Common Questions</p>
          <h2 id="faq-heading" className="mt-2 font-serif text-[30px] md:text-[36px]">
            Frequently Asked Questions
          </h2>
        </header>
        <div className="mx-auto max-w-3xl">
          <FAQItem
            question="What is the minimum group size for a corporate retreat?"
            answer="We typically accommodate groups of 8–30 guests, though we can arrange larger events upon request. Each retreat is customized to your specific team size and requirements."
          />
          <FAQItem
            question="Can you accommodate dietary restrictions and special requests?"
            answer="Absolutely. Our private chefs specialize in accommodating all dietary requirements including vegetarian, vegan, gluten-free, and allergy-specific menus. We'll work with you to ensure every team member is catered for."
          />
          <FAQItem
            question="What's the best time of year to visit Colombia?"
            answer="Colombia offers great weather year-round depending on the region. The dry seasons (December–March and July–August) are popular, but each destination has its own microclimate. We'll help you choose the ideal timing for your retreat."
          />
          <FAQItem
            question="How far in advance should we book?"
            answer="We recommend booking at least 2–3 months in advance to secure your preferred dates and accommodations, especially during peak season. However, we can sometimes accommodate shorter notice depending on availability."
          />
          <FAQItem
            question="Is transportation included in the package?"
            answer="Yes, all our corporate retreat packages include full transportation logistics—from airport pickups to internal transfers between activities and venues. You won't need to worry about any travel arrangements."
          />
          <FAQItem
            question="Can we customize the itinerary?"
            answer="Every retreat is fully customizable. Whether you want to focus on team building, wellness, cultural experiences, or a mix of everything, we'll create a bespoke itinerary tailored to your goals and preferences."
          />
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-emerald-800 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-serif text-[28px] md:text-[36px]">Ready to Plan Your Retreat?</h2>
          <p className="mt-4 text-sm leading-relaxed opacity-90 md:text-base">
            Get in touch with our team to start planning your unforgettable corporate experience in Colombia.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <PillButton className="bg-white text-emerald-800 hover:bg-gray-100" aria-label="Enquire now">
              ENQUIRE NOW
            </PillButton>
            <PillButton
              className="border border-white/50 bg-transparent text-white hover:bg-white/10"
              aria-label="View sample itinerary"
            >
              VIEW SAMPLE ITINERARY
            </PillButton>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white" role="contentinfo" aria-label="Footer">
        {/* Footer Image Banner */}
        <div className="relative h-[30dvh] w-full">
          <img src={IMAGES.footer} alt="Colorful colonial street" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900" />
        </div>

        {/* Footer Content */}
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
          {/* Logo */}
          <div className="mb-10 text-center">
            <h2 className="font-serif text-[28px] md:text-[34px]">TROPICO RETREATS</h2>
            <p className="mt-2 text-sm opacity-70">Corporate & Wellness Retreats in Colombia</p>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-1 gap-10 border-t border-white/10 pt-10 md:grid-cols-4">
            {/* Browse */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">Browse</h3>
              <nav className="space-y-2">
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  Destinations
                </a>
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  Accommodations
                </a>
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  Experiences
                </a>
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  Corporate Services
                </a>
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  Sample Itinerary
                </a>
              </nav>
            </div>

            {/* Information */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">Information</h3>
              <nav className="space-y-2">
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  About Us
                </a>
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  FAQs
                </a>
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  Terms & Conditions
                </a>
                <a href="#" className="block text-sm opacity-70 transition hover:opacity-100">
                  Privacy Policy
                </a>
              </nav>
            </div>

            {/* Find Us */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">Find Us</h3>
              <div className="space-y-2 text-sm opacity-70">
                <p>London, UK</p>
                <p>+44 78 06705494</p>
                <a
                  href="mailto:hello@tropicoretreats.com"
                  className="block underline decoration-white/30 underline-offset-4 transition hover:decoration-white hover:opacity-100"
                >
                  hello@tropicoretreats.com
                </a>
              </div>
              <div className="mt-4 text-sm opacity-70">
                <p>Mon–Thu: 9am – 6pm</p>
                <p>Friday: 9am – 1pm</p>
              </div>
            </div>

            {/* Social */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">Get Social</h3>
              <nav aria-label="Social links" className="flex gap-3">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  IG
                </a>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  IN
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  FB
                </a>
              </nav>
              <p className="mt-6 text-xs opacity-50">
                © {new Date().getFullYear()} Tropico Retreats. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default TropicoRetreatsPage;
