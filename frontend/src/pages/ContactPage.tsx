import React from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import SEO from "../components/SEO";

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        title="Contact Us"
        description="Get in touch with Tropico Retreats to plan your corporate retreat in Colombia. Contact us by email, phone, or WhatsApp. We respond within 24 hours."
        canonicalUrl="/contact"
        keywords="contact Tropico Retreats, corporate retreat enquiry, Colombia retreat booking, team retreat contact"
      />

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px]">
        <div className="absolute inset-0">
          <img
            src="/public/assets/landing-page/inset.webp"
            alt="Contact Tropico Retreats"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="relative flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              Contact Us
            </h1>
            <p className="mx-auto mt-4 max-w-2xl px-4 text-lg text-white/90 md:text-xl">
              Let's start planning your unforgettable retreat
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Contact Info */}
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
                Get in Touch
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
                Ready to Plan Your Retreat?
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-600">
                Get in touch with our team to start planning your unforgettable corporate experience in Colombia.
                We'll respond within 24 hours.
              </p>

              <div className="mt-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Mail className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Email</p>
                    <a href="mailto:hello@tropicoretreats.com" className="text-lg text-gray-900 hover:text-emerald-700 transition-colors">
                      hello@tropicoretreats.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Phone className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Phone / WhatsApp</p>
                    <a href="tel:+447806705494" className="text-lg text-gray-900 hover:text-emerald-700 transition-colors">
                      +44 78 0670 5494
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <MapPin className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Location</p>
                    <p className="text-lg text-gray-900">London, United Kingdom</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Clock className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Business Hours</p>
                    <p className="text-lg text-gray-900">Mon-Thu: 9am - 6pm</p>
                    <p className="text-lg text-gray-900">Friday: 9am - 1pm</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <div className="mt-10 rounded-2xl bg-emerald-50 p-6">
                <h3 className="font-semibold text-gray-900">Prefer WhatsApp?</h3>
                <p className="mt-2 text-gray-600">Get a quick response via WhatsApp for immediate enquiries.</p>
                <a
                  href="https://wa.me/447806705494"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#20BD5A]"
                >
                  <Phone className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
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
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="+44 7000 000000"
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
                  <label htmlFor="destination" className="block text-sm font-semibold text-gray-700">
                    Preferred Destination
                  </label>
                  <select
                    id="destination"
                    name="destination"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select destination</option>
                    <option value="caribbean">Caribbean Coast</option>
                    <option value="coffee-region">Coffee Region</option>
                    <option value="casanare">Casanare</option>
                    <option value="not-sure">Not sure yet</option>
                  </select>
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
    </div>
  );
};

export default ContactPage;
