import React from "react";
import { Link } from "react-router";
import { Users, Heart, Globe, Award, Phone, Mail } from "lucide-react";
import SEO from "../components/SEO";

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        title="About Us"
        description="Learn about Tropico Retreats - your trusted partner for unforgettable corporate retreats in Colombia. We combine local expertise with international standards to create transformative team experiences."
        canonicalUrl="/about"
        keywords="about Tropico Retreats, corporate retreat planners, Colombia travel experts, team retreat organisers, wellness retreat company"
      />

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px]">
        <div className="absolute inset-0">
          <img
            src="/public/assets/landing-page/hero.webp"
            alt="Tropico Retreats team"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="relative flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              About Us
            </h1>
            <p className="mx-auto mt-4 max-w-2xl px-4 text-lg text-white/90 md:text-xl">
              Your trusted partner for unforgettable corporate retreats in Colombia
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
                Our Story
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
                Crafting Exceptional Experiences Since Day One
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Tropico Retreats was born from a passion for showcasing Colombia's incredible
                  diversity and a deep understanding of what makes corporate events truly
                  transformative. We believe that the right environment can spark creativity,
                  strengthen teams, and create lasting memories.
                </p>
                <p>
                  Our team combines local expertise with international standards, ensuring every
                  retreat is seamlessly organised while capturing the authentic spirit of Colombia.
                  From the Caribbean coast to the coffee highlands, we've curated a collection of
                  exclusive venues and experiences that cater to every corporate need.
                </p>
                <p>
                  We handle every detail including accommodation, transport, activities, catering and
                  entertainment, so you can focus on what matters most: connecting with your team
                  and achieving your objectives.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src="/public/assets/landing-page/inset.webp"
                alt="Colombia landscape"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 rounded-xl bg-emerald-700 p-6 text-white shadow-xl">
                <p className="text-3xl font-bold">100%</p>
                <p className="text-sm">Client Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
              Our Values
            </span>
            <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
              What Drives Us
            </h2>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Heart,
                title: "Passion",
                description:
                  "We're passionate about Colombia and dedicated to sharing its beauty with the world through exceptional retreat experiences.",
              },
              {
                icon: Users,
                title: "Personalisation",
                description:
                  "Every retreat is tailored to your unique needs. We listen, understand, and deliver bespoke experiences.",
              },
              {
                icon: Award,
                title: "Excellence",
                description:
                  "We partner only with the finest venues and suppliers, ensuring every aspect of your retreat meets the highest standards.",
              },
              {
                icon: Globe,
                title: "Sustainability",
                description:
                  "We're committed to responsible tourism, supporting local communities and protecting Colombia's natural heritage.",
              },
            ].map((value) => (
              <div
                key={value.title}
                className="rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <value.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-serif text-xl font-semibold text-gray-900">
                  {value.title}
                </h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Colombia Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="/public/assets/landing-page/caribbean.webp"
                  alt="Caribbean coast"
                  className="rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/svc2.jpg"
                  alt="Coffee region"
                  className="mt-8 rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/casanare.jpg"
                  alt="Casanare plains"
                  className="rounded-xl shadow-lg"
                />
                <img
                  src="/public/assets/landing-page/valley.jpg"
                  alt="Valley landscape"
                  className="mt-8 rounded-xl shadow-lg"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
                Why Colombia?
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
                A Destination Like No Other
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Colombia offers an unparalleled diversity of landscapes, cultures, and experiences
                  within a single country. From the turquoise waters of the Caribbean to the misty
                  peaks of the Coffee Triangle, every region tells a unique story.
                </p>
                <p>
                  The country's transformation over the past two decades has made it one of the
                  world's most exciting emerging destinations, with world-class infrastructure,
                  warm hospitality, and a vibrant culinary scene.
                </p>
              </div>
              <ul className="mt-8 space-y-3">
                {[
                  "Year-round tropical climate",
                  "Direct flights from major cities worldwide",
                  "Rich biodiversity and natural wonders",
                  "UNESCO World Heritage sites",
                  "Award-winning gastronomy",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-900 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-12">
          <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">
            Ready to Plan Your Retreat?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
            Let's create an unforgettable experience for your team. Get in touch today
            and discover how we can bring your vision to life.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/#contact-heading"
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

export default AboutPage;
