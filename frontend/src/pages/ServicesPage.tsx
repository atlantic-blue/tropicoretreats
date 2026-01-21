import React, { useState } from "react";
import { Link } from "react-router";
import {
  Building2,
  Bus,
  ChefHat,
  Hotel,
  Target,
  Theater,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import SEO from "../components/SEO";

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

const ServiceTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(FULL_SERVICES[0].id);
  const activeService = FULL_SERVICES.find((s) => s.id === activeTab) || FULL_SERVICES[0];
  const IconComponent = activeService.icon;

  return (
    <div className="w-full">
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

      <div className="mt-12 rounded-3xl bg-white p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] md:p-14">
        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
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

const ServicesPage: React.FC = () => {
  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        title="Our Services"
        description="Tropico Retreats offers comprehensive corporate retreat services in Colombia including luxury accommodation, transport, venues, team building activities, catering, and entertainment."
        canonicalUrl="/services"
        keywords="corporate retreat services Colombia, team building Colombia, luxury accommodation, private chefs, transport logistics, meeting venues Colombia"
      />

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px]">
        <div className="absolute inset-0">
          <img
            src="/public/assets/landing-page/svc2.jpg"
            alt="Corporate meeting venue"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="relative flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              Our Services
            </h1>
            <p className="mx-auto mt-4 max-w-2xl px-4 text-lg text-white/90 md:text-xl">
              Everything you need for an unforgettable corporate retreat
            </p>
          </div>
        </div>
      </section>

      {/* Full Services Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <header className="mb-10 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
              Full Service
            </span>
            <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
              We Handle the Entire Organisation
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-gray-600">
              From the moment your team lands until the final day of the retreat, every detail is covered.
              We are your single point of contact for accommodation, transport, venues, activities, catering and
              entertainment. All coordinated to perfection.
            </p>
          </header>
          <ServiceTabs />
        </div>
      </section>

      {/* Service Cards Grid */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
              At a Glance
            </span>
            <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
              All Services Overview
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FULL_SERVICES.map((service) => {
              const IconComponent = service.icon;
              return (
                <div
                  key={service.id}
                  className="rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <IconComponent className="h-7 w-7" />
                  </div>
                  <h3 className="mt-6 font-serif text-xl font-semibold text-gray-900">
                    {service.title}
                  </h3>
                  <p className="text-sm font-medium text-[#C9A227]">{service.subtitle}</p>
                  <p className="mt-3 text-gray-600 leading-relaxed text-sm">
                    {service.description.substring(0, 150)}...
                  </p>
                  <ul className="mt-4 space-y-2">
                    {service.highlights.slice(0, 3).map((highlight) => (
                      <li key={highlight} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-900 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-12">
          <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
            Let us create a bespoke retreat package tailored to your team's needs.
            Contact us today to start planning.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/contact"
              className="flex items-center gap-2 rounded-full bg-[#C9A227] px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-[#B8860B] hover:shadow-xl"
            >
              <Mail className="h-5 w-5" />
              Get in Touch
            </Link>
            <a
              href="https://wa.me/447806705494"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border-2 border-white px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-emerald-900"
            >
              <Phone className="h-5 w-5" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
