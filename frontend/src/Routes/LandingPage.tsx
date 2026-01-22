import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import SEO, { localBusinessSchema, faqSchema } from "../components/SEO";
import {
  Building2,
  Bus,
  ChefHat,
  Dumbbell,
  Hotel,
  Mail,
  MapPin,
  Music,
  Phone,
  Send,
  Sparkles,
  Target,
  Theater,
  TreePine,
  Users,
  Wifi,
  Waves,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * Tropico Retreats - Corporate Wellness Retreats Landing Page
 * React + TypeScript + Tailwind v4
 * Typography: Playfair Display (headings) + Inter (body)
 * Colour palette: Emerald + Gold accent
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
export const IMAGES = {
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

// ---- Amenity Icons (using Lucide) ----
const AmenityIcon: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex flex-col items-center gap-3 p-4">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-all duration-300 hover:bg-emerald-100 hover:scale-110">
      {icon}
    </div>
    <span className="text-center text-xs font-medium leading-tight text-gray-700">{label}</span>
  </div>
);

// ---- FAQ Item ----
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-emerald-900/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between py-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        aria-expanded={isOpen}
      >
        <span className="pr-6 text-lg font-semibold text-gray-900 transition-colors group-hover:text-emerald-700">
          {question}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-all duration-300 group-hover:bg-emerald-200">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96 pb-6" : "max-h-0"
        }`}
      >
        <p className="text-base leading-relaxed text-gray-600 pr-12">{answer}</p>
      </div>
    </div>
  );
};

// ---- Full Services Data ----
const FULL_SERVICES = [
  {
    id: "accommodation",
    icon: Hotel,
    title: "ACCOMMODATION",
    subtitle: "Luxury Stays",
    description:
      "We work with the finest exclusive properties across Colombia: luxury villas, colonial haciendas, eco-lodges and boutique hotels. Each accommodation is carefully selected to meet your needs, from intimate retreats for 8 guests to corporate events for 50+ attendees. All our properties feature meeting spaces, wellness areas, private pools and personalised service.",
    highlights: ["Private villas with pools", "Historic haciendas", "Exclusive eco-lodges", "Boutique hotels"],
  },
  {
    id: "transport",
    icon: Bus,
    title: "TRANSPORT",
    subtitle: "Seamless Logistics",
    description:
      "We manage all transport logistics from start to finish. We coordinate airport-hotel transfers, internal transport between activities, and any special journeys your group requires. We work with modern fleets and professional bilingual drivers who know every route and destination.",
    highlights: ["Airport transfers", "Premium vehicles", "Bilingual drivers", "24/7 coordination"],
  },
  {
    id: "venues",
    icon: Building2,
    title: "VENUES",
    subtitle: "Meeting Spaces",
    description:
      "We provide versatile spaces for any type of corporate event: conference rooms equipped with audiovisual technology, outdoor spaces for team building activities, workshop rooms and private areas for networking. Each space adapts to your specific capacity and configuration requirements.",
    highlights: ["Conference rooms", "Outdoor spaces", "Full AV equipment", "Flexible layouts"],
  },
  {
    id: "activities",
    icon: Target,
    title: "ACTIVITIES",
    subtitle: "Team Building",
    description:
      "We design activity programmes that strengthen teams and create lasting memories. From outdoor adventures such as rafting, hiking and cycling tours, to cultural experiences like Colombian cooking classes, coffee farm visits and artisan workshops. We also offer wellness programmes including yoga, meditation and spa treatments.",
    highlights: ["Bespoke team building", "Outdoor adventures", "Cultural experiences", "Wellness programmes"],
  },
  {
    id: "catering",
    icon: ChefHat,
    title: "CATERING",
    subtitle: "Dining Experiences",
    description:
      "Gastronomy is a fundamental part of the experience. We work with private chefs who create bespoke menus featuring the finest Colombian and international cuisine. We organise everything from executive breakfasts to gala dinners, outdoor barbecues and themed culinary experiences. All dietary requirements are catered for in advance.",
    highlights: ["Private chefs", "Bespoke menus", "Local & international cuisine", "Culinary events"],
  },
  {
    id: "leisure",
    icon: Theater,
    title: "LEISURE",
    subtitle: "Entertainment",
    description:
      "We complement your retreat with memorable leisure experiences. We organise live music performances, traditional dance shows, cultural tours with specialist guides, excursions to natural sites and relaxation activities. Every free moment becomes an opportunity to discover Colombia.",
    highlights: ["Live music", "Cultural shows", "Guided tours", "Exclusive experiences"],
  },
];

// ---- Service Tab Component ----
const ServiceTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(FULL_SERVICES[0].id);
  const activeService = FULL_SERVICES.find((s) => s.id === activeTab) || FULL_SERVICES[0];
  const IconComponent = activeService.icon;

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        {FULL_SERVICES.map((service) => {
          const TabIcon = service.icon;
          return (
            <button
              key={service.id}
              onClick={() => setActiveTab(service.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-all duration-300 md:px-6 md:text-sm ${
                activeTab === service.id
                  ? "bg-emerald-700 text-white shadow-lg shadow-emerald-700/25"
                  : "bg-white text-gray-700 shadow-md hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg"
              }`}
              aria-pressed={activeTab === service.id}
            >
              <TabIcon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">{service.title}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-12 rounded-3xl bg-white p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] md:p-14">
        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          {/* Left: Content */}
          <div>
            <div className="mb-6 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700">
                <IconComponent className="h-7 w-7" />
              </span>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 md:text-3xl">{activeService.title}</h3>
                <p className="text-sm font-medium text-[#C9A227]">{activeService.subtitle}</p>
              </div>
            </div>
            <p className="text-base leading-relaxed text-gray-600">{activeService.description}</p>
          </div>

          {/* Right: Highlights */}
          <div className="flex flex-col justify-center">
            <p className="mb-5 text-sm font-bold uppercase tracking-widest text-emerald-700">What's Included</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeService.highlights.map((highlight, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-50/50 px-4 py-4 text-sm font-medium text-emerald-900 transition-all hover:from-emerald-100 hover:to-emerald-50"
                >
                  <Sparkles className="h-4 w-4 text-[#C9A227]" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Small UI atoms ----
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
};

const PillButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string; to?: string; variant?: "primary" | "secondary" | "gold" }
> = ({ className = "", children, href, to, variant = "primary", ...props }) => {
  const baseClasses = `inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold tracking-widest uppercase transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50`;

  const variantClasses = {
    primary: "bg-emerald-700 text-white shadow-lg shadow-emerald-700/30 hover:bg-emerald-800 hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-emerald-600",
    secondary: "bg-white text-gray-900 shadow-lg hover:bg-gray-50 hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-gray-400",
    gold: "bg-[#C9A227] text-white shadow-lg shadow-[#C9A227]/30 hover:bg-[#B8860B] hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-[#C9A227]",
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={combinedClasses}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={combinedClasses}>
        {children}
      </a>
    );
  }

  return (
    <button {...props} className={combinedClasses}>
      {children}
    </button>
  );
};

type BespokeCardProps = {
  title: string;
  description: string;
  imageUrl: string;
  cta?: string;
  scrollTo?: string;
};

const BespokeCard: React.FC<BespokeCardProps> = ({ title, description, imageUrl, cta = "Details", scrollTo = "full-services-heading" }) => {
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
        <button
          onClick={() => scrollToSection(scrollTo)}
          className="mt-4 text-sm font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition hover:decoration-emerald-700"
        >
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
  href?: string;
};

const ImageCard: React.FC<ImageCardProps> = ({ title, cta = "See More", imageUrl, href }) => {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const content = (
    <>
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
        <span
          className="rounded-full bg-white/90 px-4 py-2 text-[11px] font-semibold text-gray-900 backdrop-blur-md transition group-hover:bg-white"
        >
          {cta}
        </span>
      </div>
    </>
  );

  const className = `h-[60dvh] group relative aspect-[4/3] w-full overflow-hidden rounded-[22px] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] transition-all ${
    shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
  } duration-700 block`;

  if (href) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={href}
        className={className}
        aria-label={`View ${title} destination`}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      ref={ref}
      className={className}
      aria-label={`${title} destination card`}
      role="article"
    >
      {content}
    </article>
  );
};

// ---- Page ----
const TropicoRetreatsPage: React.FC = () => {
  const heroReveal = useReveal<HTMLDivElement>();
  const introReveal = useReveal<HTMLDivElement>();
  const amenitiesReveal = useReveal<HTMLDivElement>();

  return (
    <main className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        canonicalUrl="/"
        structuredData={[localBusinessSchema, faqSchema]}
      />

      {/* HERO */}
      <section className="relative w-full" role="banner" aria-label="Hero">
        <img
          src={IMAGES.hero}
          alt="Jungle terrace in Colombia"
          className="h-[90dvh] w-full object-cover"
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40" />
        <div
          ref={heroReveal.ref}
          className={`absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white transition-all duration-700 ${
            heroReveal.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <p className="mb-4 text-sm tracking-[0.35em] uppercase md:text-base font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            corporate stays · wellness getaways · team retreats
          </p>
          <h1 className="text-[48px] leading-[1.1] drop-shadow-lg md:text-[80px]">
            Tropico Retreats
          </h1>
          <p className="mt-3 text-lg tracking-wide drop-shadow-md md:text-2xl font-light">
            Corporate & Wellness Retreats in Colombia
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <PillButton variant="gold" aria-label="Enquire about a corporate retreat" onClick={() => scrollToSection("contact-heading")}>
              ENQUIRE NOW
            </PillButton>
            <PillButton variant="secondary" className="bg-white/90 backdrop-blur-sm" aria-label="View our services" onClick={() => scrollToSection("full-services-heading")}>
              OUR SERVICES
            </PillButton>
          </div>
        </div>
      </section>

      {/* TAILORED FOR YOU - Intro Section */}
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-12">
        <section className="grid grid-cols-1 gap-12 py-20 md:grid-cols-12 md:py-28" aria-labelledby="intro-heading">
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
                Our specialised team will be delighted to assist you in creating your bespoke retreat, from venue selection
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

        {/* WE HANDLE EVERYTHING - Full Services Section */}
        <section className="border-t border-emerald-900/10 py-20 md:py-28" aria-labelledby="full-services-heading">
          <header className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Full Service</p>
            <h2 id="full-services-heading" className="mt-2 font-serif text-[30px] md:text-[44px]">
              We Handle the Entire Organisation
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-gray-600">
              From the moment your team lands until the final day of the retreat, every detail is covered.
              We are your single point of contact for accommodation, transport, venues, activities, catering and
              entertainment. All coordinated to perfection.
            </p>
          </header>
          <ServiceTabs />
        </section>

        {/* BESPOKE ESCAPES - 3 Cards */}
        <section className="border-t border-emerald-900/10 py-20 md:py-24" aria-labelledby="bespoke-heading">
          <header className="mb-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Bespoke Escapes</p>
            <h2 id="bespoke-heading" className="mt-2 font-serif text-[30px] md:text-[36px]">
              Everything You Need
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600">
              From luxury accommodations to gourmet dining and unique experiences, we handle every detail.
            </p>
          </header>
          <div className="grid gap-8 md:grid-cols-3">
            <BespokeCard
              title="Accommodations"
              description="Luxury villas and boutique lodges for 8-30 guests, featuring private pools, stunning views, and exclusive amenities."
              imageUrl={IMAGES.svc1b}
            />
            <BespokeCard
              title="Gastronomy"
              description="Private chefs crafting bespoke menus with local Colombian flavours and international cuisine tailored to your preferences."
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
          className={`border-t border-emerald-900/10 py-20 md:py-24 transition-all duration-700 ${
            amenitiesReveal.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          aria-labelledby="amenities-heading"
        >
          <header className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              Corporate & Wellness Events
            </p>
            <h2 id="amenities-heading" className="mt-3 text-[32px] md:text-[40px]">
              What's Available
            </h2>
          </header>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
            <AmenityIcon icon={<ChefHat className="h-6 w-6" />} label="Private Chefs" />
            <AmenityIcon icon={<Calendar className="h-6 w-6" />} label="Bespoke Itinerary" />
            <AmenityIcon icon={<Dumbbell className="h-6 w-6" />} label="Yoga & Wellness" />
            <AmenityIcon icon={<Building2 className="h-6 w-6" />} label="Conference Room" />
            <AmenityIcon icon={<Music className="h-6 w-6" />} label="Live Music" />
            <AmenityIcon icon={<Waves className="h-6 w-6" />} label="Private Pools" />
            <AmenityIcon icon={<TreePine className="h-6 w-6" />} label="Nature Access" />
            <AmenityIcon icon={<Wifi className="h-6 w-6" />} label="Free WiFi" />
            <AmenityIcon icon={<Bus className="h-6 w-6" />} label="Transportation" />
            <AmenityIcon icon={<Users className="h-6 w-6" />} label="Team Building" />
          </div>
        </section>

        {/* DESTINATIONS */}
        <section className="border-t border-emerald-900/10 py-20 md:py-24" aria-labelledby="collection-heading">
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
            <ImageCard title="Caribbean" imageUrl={IMAGES.caribbean} href="/destinations/caribbean" />
            <ImageCard title="Casanare" imageUrl={IMAGES.casanare} href="/destinations/casanare" />
            <ImageCard title="Coffee Region" imageUrl={IMAGES.coffee} href="/destinations/coffee-region" />
          </div>
        </section>
      </div>

      {/* MEETING SPACE BANNER */}
      <section className="relative w-full" aria-label="Meeting space">
        <img src={IMAGES.svc2} alt="Meeting space venue" className="h-[60dvh] w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="absolute inset-0 mx-auto flex max-w-[1400px] items-center px-4 sm:px-6 lg:px-12">
          <div className="max-w-xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A227]">Conference Facilities</p>
            <h2 className="mt-3 text-[36px] md:text-[48px]">The Meeting Room</h2>
            <p className="mt-5 text-base leading-relaxed opacity-90 md:text-lg">
              Our configurable meeting spaces accommodate up to 24 boardroom-style or 40 theatre-style attendees, perfect
              for training sessions, presentations, or private meetings in a stunning natural setting.
            </p>
            <div className="mt-8">
              <PillButton variant="gold" aria-label="Enquire about meeting space" onClick={() => scrollToSection("contact-heading")}>
                ENQUIRE NOW
              </PillButton>
            </div>
          </div>
        </div>
      </section>

      {/* TAILOR-MADE BANNER */}
      <section className="relative w-full" aria-label="Tailor made banner">
        <img src={IMAGES.svc1a} alt="Cocora Valley palms" className="h-[60dvh] w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="absolute inset-0 mx-auto flex max-w-[1400px] flex-col justify-center px-4 sm:px-6 lg:px-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A227]">Bespoke Packages</p>
          <h2 className="mt-3 text-[36px] md:text-[48px]">Tailor‑made for You</h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed opacity-90 md:text-lg">
            Let us take care of every detail, ensuring a seamless stay with our bespoke itineraries curated to meet your
            unique needs. From accommodation to activities, we'll handle all the details at a special rate.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PillButton variant="secondary" className="bg-white/95 backdrop-blur-sm" aria-label="View sample itinerary" onClick={() => scrollToSection("contact-heading")}>
              Request Itinerary
            </PillButton>
            <PillButton variant="primary" aria-label="Contact us" onClick={() => scrollToSection("contact-heading")}>
              CONTACT US
            </PillButton>
          </div>
        </div>
      </section>

      {/* SERVICES - four blocks matching final design */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-12 py-20 md:py-28" aria-labelledby="services-heading">
        <header className="mb-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A227]">What We Offer</p>
          <h2 id="services-heading" className="mt-3 text-[32px] md:text-[40px]">
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
              The venue makes all the difference. Our team guides you in selecting the perfect property, from beachfront
              villas to mountain lodges, tailored to your needs and desires.
            </p>
            <div className="mt-5">
              <PillButton
                variant="primary"
                aria-label="Contact us about destination"
                onClick={() => scrollToSection("contact-heading")}
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
              local Colombian flavours and international cuisine, tailored to your team's preferences and dietary needs.
            </p>
            <div className="mt-5">
              <PillButton
                variant="primary"
                aria-label="Contact us about catering"
                onClick={() => scrollToSection("contact-heading")}
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
              alt="Colourful town street"
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
              Give your team a true taste of Colombia. We organise curated excursions, from private coffee farm tours and
              historical city walks to jungle hikes and sailing trips, creating unforgettable shared memories.
            </p>
            <div className="mt-5">
              <PillButton
                variant="primary"
                aria-label="Contact us about excursions"
                onClick={() => scrollToSection("contact-heading")}
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
              airport transfers, internal travel, scheduling, and vendor management, so you can focus on your team.
            </p>
            <div className="mt-5">
              <PillButton
                variant="primary"
                aria-label="Contact us about logistics"
                onClick={() => scrollToSection("contact-heading")}
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
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-12 py-20 md:py-28" aria-labelledby="faq-heading">
        <header className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A227]">Common Questions</p>
          <h2 id="faq-heading" className="mt-3 text-[32px] md:text-[40px]">
            Frequently Asked Questions
          </h2>
        </header>
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] md:p-12">
          <FAQItem
            question="What is the minimum group size for a corporate retreat?"
            answer="We typically accommodate groups of 8-30 guests, though we can arrange larger events upon request. Each retreat is customised to your specific team size and requirements."
          />
          <FAQItem
            question="Can you accommodate dietary restrictions and special requests?"
            answer="Absolutely. Our private chefs specialize in accommodating all dietary requirements including vegetarian, vegan, gluten-free, and allergy-specific menus. We'll work with you to ensure every team member is catered for."
          />
          <FAQItem
            question="What's the best time of year to visit Colombia?"
            answer="Colombia offers great weather year-round depending on the region. The dry seasons (December-March and July-August) are popular, but each destination has its own microclimate. We'll help you choose the ideal timing for your retreat."
          />
          <FAQItem
            question="How far in advance should we book?"
            answer="We recommend booking at least 2-3 months in advance to secure your preferred dates and accommodations, especially during peak season. However, we can sometimes accommodate shorter notice depending on availability."
          />
          <FAQItem
            question="Is transportation included in the package?"
            answer="Yes, all our corporate retreat packages include full transportation logistics, from airport pickups to internal transfers between activities and venues. You won't need to worry about any travel arrangements."
          />
          <FAQItem
            question="Can we customise the itinerary?"
            answer="Every retreat is fully customizable. Whether you want to focus on team building, wellness, cultural experiences, or a mix of everything, we'll create a bespoke itinerary tailored to your goals and preferences."
          />
        </div>
      </section>

      {/* CONTACT FORM SECTION */}
      <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 py-20 md:py-28" aria-labelledby="contact-heading">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            {/* Left: Contact Info */}
            <div className="text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A227]">Get in Touch</p>
              <h2 id="contact-heading" className="mt-3 text-[32px] md:text-[44px]">
                Ready to Plan Your Retreat?
              </h2>
              <p className="mt-6 text-lg leading-relaxed opacity-90">
                Get in touch with our team to start planning your unforgettable corporate experience in Colombia.
                We'll respond within 24 hours.
              </p>

              <div className="mt-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Mail className="h-5 w-5 text-[#C9A227]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-200">Email</p>
                    <a href="mailto:hello@tropicoretreats.com" className="text-lg hover:text-[#C9A227] transition-colors">
                      hello@tropicoretreats.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Phone className="h-5 w-5 text-[#C9A227]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-200">Phone</p>
                    <a href="tel:+447806705494" className="text-lg hover:text-[#C9A227] transition-colors">
                      +44 78 0670 5494
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <MapPin className="h-5 w-5 text-[#C9A227]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-200">Location</p>
                    <p className="text-lg">London, United Kingdom</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Clock className="h-5 w-5 text-[#C9A227]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-200">Business Hours</p>
                    <p className="text-lg">Mon-Thu: 9am - 6pm</p>
                    <p className="text-lg">Friday: 9am - 1pm</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="rounded-3xl bg-white p-8 shadow-2xl md:p-10">
              <h3 className="text-2xl font-bold text-gray-900">Send Us an Enquiry</h3>
              <p className="mt-2 text-gray-600">Fill out the form below and we'll be in touch shortly.</p>

              <form className="mt-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-gray-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Company Ltd"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="groupSize" className="block text-sm font-semibold text-gray-700">
                      Group Size
                    </label>
                    <select
                      id="groupSize"
                      name="groupSize"
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select size</option>
                      <option value="8-15">8-15 guests</option>
                      <option value="16-25">16-25 guests</option>
                      <option value="26-40">26-40 guests</option>
                      <option value="40+">40+ guests</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="preferredDates" className="block text-sm font-semibold text-gray-700">
                      Preferred Dates
                    </label>
                    <input
                      type="text"
                      id="preferredDates"
                      name="preferredDates"
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="e.g., March 2026"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
                    Tell Us About Your Retreat *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="What are your goals for the retreat? Any specific activities or experiences you're interested in?"
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C9A227] px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-[#C9A227]/30 transition-all duration-300 hover:bg-[#B8860B] hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2"
                >
                  <Send className="h-4 w-4" />
                  Send Enquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default TropicoRetreatsPage;
