import React, { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, ChevronUp, Phone, Mail } from "lucide-react";
import SEO, { faqSchema } from "../components/SEO";

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

const FAQS = [
  {
    question: "What is the minimum group size for a corporate retreat?",
    answer:
      "We typically accommodate groups of 8-30 guests, though we can arrange larger events upon request. Each retreat is customised to your specific team size and requirements.",
  },
  {
    question: "Can you accommodate dietary restrictions and special requests?",
    answer:
      "Absolutely. Our private chefs specialize in accommodating all dietary requirements including vegetarian, vegan, gluten-free, and allergy-specific menus. We'll work with you to ensure every team member is catered for.",
  },
  {
    question: "What's the best time of year to visit Colombia?",
    answer:
      "Colombia offers great weather year-round depending on the region. The dry seasons (December-March and July-August) are popular, but each destination has its own microclimate. We'll help you choose the ideal timing for your retreat.",
  },
  {
    question: "How far in advance should we book?",
    answer:
      "We recommend booking at least 2-3 months in advance to secure your preferred dates and accommodations, especially during peak season. However, we can sometimes accommodate shorter notice depending on availability.",
  },
  {
    question: "Is transportation included in the package?",
    answer:
      "Yes, all our corporate retreat packages include full transportation logistics, from airport pickups to internal transfers between activities and venues. You won't need to worry about any travel arrangements.",
  },
  {
    question: "Can we customise the itinerary?",
    answer:
      "Every retreat is fully customizable. Whether you want to focus on team building, wellness, cultural experiences, or a mix of everything, we'll create a bespoke itinerary tailored to your goals and preferences.",
  },
  {
    question: "What group sizes can you accommodate?",
    answer:
      "We work with groups ranging from intimate executive retreats (8-15 guests) to larger corporate events (50+ attendees). Each experience is tailored to your specific group size and requirements.",
  },
  {
    question: "What's included in your packages?",
    answer:
      "Our packages can include accommodation, all meals and beverages, airport transfers, internal transportation, activities, meeting facilities, and dedicated on-site coordination. We customise each package to your needs.",
  },
  {
    question: "Do you handle visa requirements and travel logistics?",
    answer:
      "While we provide guidance on visa requirements and travel tips, guests are responsible for their own travel documentation. We do coordinate all in-country logistics including airport pickups and internal travel.",
  },
  {
    question: "What types of activities do you offer?",
    answer:
      "We offer a wide range of activities including team building exercises, outdoor adventures (rafting, hiking, cycling), cultural experiences (coffee farm tours, cooking classes), wellness programmes (yoga, meditation, spa), and entertainment (live music, cultural shows).",
  },
  {
    question: "Are your venues suitable for corporate meetings?",
    answer:
      "Yes, all our partner venues feature dedicated meeting spaces with audiovisual equipment, reliable WiFi, and flexible configurations for presentations, workshops, and breakout sessions.",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "Cancellation terms vary depending on the specific services booked. Generally, we offer flexible rescheduling options and partial refunds based on notice period. Full details are provided in your booking confirmation.",
  },
];

const FAQsPage: React.FC = () => {
  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        title="Frequently Asked Questions"
        description="Find answers to common questions about Tropico Retreats corporate retreats in Colombia. Learn about group sizes, booking, dietary requirements, transportation, and more."
        canonicalUrl="/faqs"
        keywords="corporate retreat FAQ, Colombia retreat questions, group size, booking policy, dietary requirements, transportation Colombia"
        structuredData={faqSchema}
      />

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px]">
        <div className="absolute inset-0">
          <img
            src="/public/assets/landing-page/hero.webp"
            alt="Tropico Retreats"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="relative flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl px-4 text-lg text-white/90 md:text-xl">
              Everything you need to know about planning your retreat
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28">
                <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
                  Got Questions?
                </span>
                <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900">
                  We're Here to Help
                </h2>
                <p className="mt-4 text-gray-600 leading-relaxed">
                  Can't find the answer you're looking for? Our team is happy to help with any questions about planning your corporate retreat.
                </p>
                <div className="mt-8 space-y-4">
                  <Link
                    to="/contact"
                    className="flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-800"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </Link>
                  <a
                    href="https://wa.me/447806705494"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border-2 border-emerald-700 px-6 py-3 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-700 hover:text-white"
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp Us
                  </a>
                </div>
              </div>
            </div>

            {/* FAQ List */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl bg-white p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] md:p-12">
                {FAQS.map((faq, index) => (
                  <FAQItem key={index} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-900 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-12">
          <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">
            Still Have Questions?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
            Our team is ready to answer any questions and help you plan the perfect retreat for your team.
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

export default FAQsPage;
