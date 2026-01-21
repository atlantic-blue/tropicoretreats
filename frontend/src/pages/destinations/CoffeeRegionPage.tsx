import React from "react";
import { Link } from "react-router";
import {
  Coffee,
  Mountain,
  Users,
  Utensils,
  Leaf,
  TreePine,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Check,
} from "lucide-react";

const CoffeeRegionPage: React.FC = () => {
  const highlights = [
    {
      icon: Coffee,
      title: "Coffee Culture",
      description: "UNESCO-recognised coffee cultural landscape with farm tours",
    },
    {
      icon: Mountain,
      title: "Mountain Views",
      description: "Stunning Andean scenery with rolling green hills",
    },
    {
      icon: Leaf,
      title: "Eco-Experiences",
      description: "Sustainable practices and nature immersion",
    },
    {
      icon: Utensils,
      title: "Farm-to-Table",
      description: "Fresh local cuisine featuring regional specialities",
    },
  ];

  const activities = [
    "Coffee farm tours and tastings",
    "Coffee roasting workshops",
    "Hiking through coffee plantations",
    "Wax palm forest treks",
    "Hot spring visits",
    "Bird watching expeditions",
    "Colombian cooking classes",
    "Mountain biking",
    "Wellness and yoga retreats",
    "Village cultural tours",
  ];

  const venues = [
    {
      name: "Historic Coffee Hacienda",
      capacity: "Up to 30 guests",
      features: ["Heritage property", "Working farm", "Conference room", "Garden pool"],
    },
    {
      name: "Boutique Mountain Lodge",
      capacity: "Up to 40 guests",
      features: ["Panoramic views", "Spa facilities", "Meeting spaces", "Fine dining"],
    },
    {
      name: "Eco Coffee Retreat",
      capacity: "Up to 25 guests",
      features: ["Sustainable design", "Nature trails", "Private chef", "Yoga deck"],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px]">
        <div className="absolute inset-0">
          <img
            src="/public/assets/landing-page/valley.jpg"
            alt="Coffee Region Colombia"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        </div>
        <div className="relative flex h-full items-center justify-center">
          <div className="text-center px-4">
            <span className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
              Destination
            </span>
            <h1 className="mt-6 font-serif text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              Coffee Region
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90 md:text-xl">
              UNESCO heritage landscapes, world-famous coffee, and mountain serenity
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
                Eje Cafetero
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
                Where Ideas Brew
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Colombia's Coffee Region, a UNESCO World Heritage Cultural Landscape,
                  offers the perfect setting for retreats that inspire creativity and
                  foster deep connections. Rolling hills covered with coffee plantations,
                  charming colonial towns, and the freshest coffee in the world await.
                </p>
                <p>
                  Your team will experience the magic of the coffee-making process from
                  seed to cup, explore misty cloud forests, and unwind in the tranquillity
                  of one of the world's most beautiful agricultural landscapes.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/#contact-heading"
                  className="flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-800"
                >
                  Enquire Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img
                  src="/public/assets/landing-page/valley.jpg"
                  alt="Coffee landscape"
                  className="rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/svc1b.jpg"
                  alt="Coffee farm"
                  className="rounded-xl shadow-lg"
                />
              </div>
              <div className="mt-8 space-y-4">
                <img
                  src="/public/assets/landing-page/svc2.jpg"
                  alt="Mountain views"
                  className="rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/svc3.jpg"
                  alt="Team activities"
                  className="rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-emerald-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">
              Why Choose the Coffee Region?
            </h2>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((highlight) => (
              <div
                key={highlight.title}
                className="rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <highlight.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-serif text-xl font-semibold text-gray-900">
                  {highlight.title}
                </h3>
                <p className="mt-3 text-gray-600">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activities */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
                Experiences
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
                Coffee Region Activities
              </h2>
              <p className="mt-6 text-gray-600 leading-relaxed">
                From coffee workshops to mountain adventures, the Coffee Region offers
                diverse experiences that combine learning, teamwork, and natural beauty.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {activities.map((activity) => (
                  <li key={activity} className="flex items-center gap-3 text-gray-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-4 w-4" />
                    </span>
                    {activity}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <img
                src="/public/assets/landing-page/valley.jpg"
                alt="Coffee Region activities"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 rounded-xl bg-emerald-700 p-6 text-white shadow-xl">
                <p className="text-3xl font-bold">UNESCO</p>
                <p className="text-sm">World Heritage Site</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Venues */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
              Accommodation
            </span>
            <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
              Featured Venues
            </h2>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {venues.map((venue) => (
              <div
                key={venue.name}
                className="overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div className="h-48 bg-emerald-100">
                  <img
                    src="/public/assets/landing-page/valley.jpg"
                    alt={venue.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl font-semibold text-gray-900">
                    {venue.name}
                  </h3>
                  <p className="mt-2 text-sm text-[#C9A227] font-medium">{venue.capacity}</p>
                  <ul className="mt-4 space-y-2">
                    {venue.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-900 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-12">
          <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">
            Plan Your Coffee Region Retreat
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
            Discover the magic of Colombia's coffee heartland with your team.
            Contact us today to start planning.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/#contact-heading"
              className="flex items-center gap-2 rounded-full bg-[#C9A227] px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-[#B8860B] hover:shadow-xl"
            >
              <Mail className="h-5 w-5" />
              Get a Quote
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

export default CoffeeRegionPage;
