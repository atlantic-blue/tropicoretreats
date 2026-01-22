import React from 'react';
import { Link } from 'react-router';
import { TreePine, Sun, Utensils, Compass, Phone, Mail, ArrowRight, Check } from 'lucide-react';
import SEO from '../../components/SEO';

const CasanarePage: React.FC = () => {
  const highlights = [
    {
      icon: TreePine,
      title: 'Vast Plains',
      description: 'Endless horizons of the Colombian llanos, home to unique wildlife',
    },
    {
      icon: Sun,
      title: 'Golden Sunsets',
      description: 'Spectacular sunrises and sunsets over the savanna landscape',
    },
    {
      icon: Compass,
      title: 'Adventure',
      description: 'Horse riding, wildlife safaris, and authentic llanero experiences',
    },
    {
      icon: Utensils,
      title: 'Ranch Cuisine',
      description: 'Traditional Colombian dishes cooked over open fires',
    },
  ];

  const activities = [
    'Horseback riding across the plains',
    'Wildlife observation safaris',
    'Capybara and caiman spotting',
    'Traditional llanero music and dance',
    'Cattle herding experiences',
    'Sunrise and sunset excursions',
    'Birdwatching expeditions',
    'River boat trips',
    'Outdoor team building challenges',
    'Stargazing sessions',
  ];

  const venues = [
    {
      name: 'Luxury Ranch Estate',
      capacity: 'Up to 25 guests',
      features: ['Private hacienda', 'Pool', 'Meeting space', 'Stables'],
    },
    {
      name: 'Eco-Lodge Retreat',
      capacity: 'Up to 35 guests',
      features: ['Sustainable design', 'Nature immersion', 'Conference facilities', 'Spa'],
    },
    {
      name: 'Traditional Hato',
      capacity: 'Up to 20 guests',
      features: ['Working ranch', 'Authentic experience', 'Private chef', 'Exclusive use'],
    },
  ];

  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        title="Casanare Plains Retreats"
        description="Experience Colombia's vast Llanos plains for your corporate retreat. Authentic ranch experiences, wildlife safaris, horseback riding, and team building in untamed wilderness."
        canonicalUrl="/destinations/casanare"
        keywords="Casanare corporate retreat, Los Llanos Colombia, ranch retreat, wildlife safari Colombia, cowboy experience, team building adventure"
        ogImage="https://tropicoretreat.com/public/assets/landing-page/casanare.jpg"
      />

      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px]">
        <div className="absolute inset-0">
          <img
            src="/public/assets/landing-page/casanare.jpg"
            alt="Casanare plains Colombia"
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
              Casanare Plains
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90 md:text-xl">
              Untamed wilderness, authentic ranch experiences, and breathtaking horizons
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
                The Llanos
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
                Disconnect to Reconnect
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
                <p>
                  The Casanare plains, known as Los Llanos, offer a completely different side of
                  Colombia. Here, vast savannas stretch to the horizon, and the rhythm of life
                  follows the sun and the seasons.
                </p>
                <p>
                  This is the perfect destination for teams seeking to disconnect from the digital
                  world and reconnect with each other. Experience the authentic cowboy culture of
                  the llaneros, encounter incredible wildlife, and find inspiration in the endless
                  open spaces.
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
                  src="/public/assets/landing-page/casanare.jpg"
                  alt="Casanare landscape"
                  className="rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/svc2b.jpg"
                  alt="Ranch activities"
                  className="rounded-xl shadow-lg"
                />
              </div>
              <div className="mt-8 space-y-4">
                <img
                  src="/public/assets/landing-page/svc3b.jpg"
                  alt="Wildlife"
                  className="rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/svc4.jpg"
                  alt="Team experience"
                  className="rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-amber-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">
              Why Choose Casanare?
            </h2>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(highlight => (
              <div
                key={highlight.title}
                className="rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
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
                Authentic Llanos Activities
              </h2>
              <p className="mt-6 text-gray-600 leading-relaxed">
                Immerse your team in the cowboy culture of the Colombian plains with unique
                experiences that foster teamwork and create lasting memories.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {activities.map(activity => (
                  <li key={activity} className="flex items-center gap-3 text-gray-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Check className="h-4 w-4" />
                    </span>
                    {activity}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <img
                src="/public/assets/landing-page/casanare.jpg"
                alt="Casanare activities"
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
            {venues.map(venue => (
              <div
                key={venue.name}
                className="overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div className="h-48 bg-amber-100">
                  <img
                    src="/public/assets/landing-page/casanare.jpg"
                    alt={venue.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl font-semibold text-gray-900">{venue.name}</h3>
                  <p className="mt-2 text-sm text-[#C9A227] font-medium">{venue.capacity}</p>
                  <ul className="mt-4 space-y-2">
                    {venue.features.map(feature => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-amber-600" />
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
      <section className="bg-amber-900 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-12">
          <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">
            Plan Your Llanos Adventure
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-amber-100">
            Experience the untamed beauty of Colombia's plains with your team. Contact us today to
            start planning.
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
              className="flex items-center gap-2 rounded-full border-2 border-white px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-amber-900"
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

export default CasanarePage;
