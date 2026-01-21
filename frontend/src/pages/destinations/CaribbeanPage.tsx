import React from "react";
import { Link } from "react-router";
import {
  Waves,
  Sun,
  Users,
  Utensils,
  Camera,
  TreePine,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Check,
} from "lucide-react";

const CaribbeanPage: React.FC = () => {
  const highlights = [
    {
      icon: Waves,
      title: "Beach Retreats",
      description: "Private beachfront villas with direct access to crystal-clear waters",
    },
    {
      icon: Sun,
      title: "Year-Round Sun",
      description: "Tropical climate with warm temperatures throughout the year",
    },
    {
      icon: Users,
      title: "Team Building",
      description: "Water sports, sailing excursions, and beach activities",
    },
    {
      icon: Utensils,
      title: "Fresh Seafood",
      description: "Caribbean cuisine featuring the freshest catch of the day",
    },
  ];

  const activities = [
    "Snorkelling and scuba diving",
    "Catamaran sailing trips",
    "Island hopping excursions",
    "Beach yoga and wellness sessions",
    "Sunset cocktail cruises",
    "Water sports (kayaking, paddleboarding)",
    "Fishing expeditions",
    "Cultural tours to Cartagena",
    "Private beach barbecues",
    "Mangrove nature tours",
  ];

  const venues = [
    {
      name: "Beachfront Villa Estate",
      capacity: "Up to 30 guests",
      features: ["Private beach", "Infinity pool", "Conference room", "Chef service"],
    },
    {
      name: "Boutique Island Resort",
      capacity: "Up to 50 guests",
      features: ["Multiple pools", "Spa facilities", "Meeting rooms", "Water sports centre"],
    },
    {
      name: "Colonial Cartagena Palace",
      capacity: "Up to 40 guests",
      features: ["Historic setting", "Rooftop terrace", "City centre location", "Private courtyard"],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px]">
        <div className="absolute inset-0">
          <img
            src="/public/assets/landing-page/caribbean.webp"
            alt="Caribbean coast Colombia"
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
              Caribbean Coast
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90 md:text-xl">
              Turquoise waters, historic cities, and unforgettable team experiences
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
                Colombia's Caribbean
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
                Where Business Meets Paradise
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Colombia's Caribbean coast offers the perfect blend of relaxation and
                  inspiration for your corporate retreat. From the historic streets of Cartagena
                  to the pristine beaches of the Rosario Islands, this region captivates with
                  its vibrant culture and natural beauty.
                </p>
                <p>
                  Your team will bond over water activities, savour fresh seafood dinners
                  on the beach, and find creative inspiration in one of the most beautiful
                  coastal settings in South America.
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
                  src="/public/assets/landing-page/svc1a.jpg"
                  alt="Caribbean beach"
                  className="rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/svc2.jpg"
                  alt="Cartagena streets"
                  className="rounded-xl shadow-lg"
                />
              </div>
              <div className="mt-8 space-y-4">
                <img
                  src="/public/assets/landing-page/svc3.jpg"
                  alt="Team activity"
                  className="rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/svc4.jpg"
                  alt="Dining experience"
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
              Why Choose the Caribbean?
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
                Team Activities & Experiences
              </h2>
              <p className="mt-6 text-gray-600 leading-relaxed">
                From adventurous water sports to relaxing wellness sessions, the Caribbean
                coast offers endless possibilities for team building and memorable experiences.
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
                src="/public/assets/landing-page/caribbean.webp"
                alt="Caribbean activities"
                className="rounded-2xl shadow-2xl"
              />
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
                    src="/public/assets/landing-page/svc1a.jpg"
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
            Plan Your Caribbean Retreat
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
            Let us create an unforgettable Caribbean experience for your team.
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

export default CaribbeanPage;
