import { IMAGES } from "../Routes/LandingPage"
import React from "react"
import { Link } from "react-router"

const Footer: React.FC = () => {
    return (
      <footer className="bg-gray-950 text-white" role="contentinfo" aria-label="Footer">
        {/* Footer Image Banner */}
        <div className="relative h-[35dvh] w-full">
          <img src={IMAGES.footer} alt="Colourful colonial street" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-gray-950" />
        </div>

        {/* Footer Content */}
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-12">
          {/* Logo */}
          <div className="mb-14 text-center">
            <h2 className="text-[32px] md:text-[40px]">TROPICO RETREATS</h2>
            <p className="mt-3 text-base text-[#C9A227]">Corporate & Wellness Retreats in Colombia</p>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-1 gap-12 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Browse */}
            <div>
              <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-[#C9A227]">Browse</h3>
              <nav className="space-y-3">
                <Link to="/destinations/caribbean" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  Caribbean
                </Link>
                <Link to="/destinations/casanare" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  Casanare
                </Link>
                <Link to="/destinations/coffee-region" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  Coffee Region
                </Link>
                <Link to="/services" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  Our Services
                </Link>
                <Link to="/contact" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  Contact Us
                </Link>
              </nav>
            </div>

            {/* Information */}
            <div>
              <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-[#C9A227]">Information</h3>
              <nav className="space-y-3">
                <Link to="/about" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  About Us
                </Link>
                <Link to="/faqs" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  FAQs
                </Link>
                <Link to="/terms" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  Terms & Conditions
                </Link>
                <Link to="/privacy" className="block text-sm text-gray-300 transition-all hover:text-white hover:translate-x-1">
                  Privacy Policy
                </Link>
              </nav>
            </div>

            {/* Find Us */}
            <div>
              <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-[#C9A227]">Find Us</h3>
              <div className="space-y-3 text-sm">
                <p className="text-gray-300">London, United Kingdom</p>
                <a href="tel:+447806705494" className="block text-gray-300 transition hover:text-white">
                  +44 78 0670 5494
                </a>
                <a
                  href="mailto:hello@tropicoretreats.com"
                  className="block text-gray-300 transition hover:text-white"
                >
                  hello@tropicoretreats.com
                </a>
              </div>
              <div className="mt-5 space-y-1 text-sm text-gray-400">
                <p>Mon-Thu: 9am - 6pm</p>
                <p>Friday: 9am - 1pm</p>
              </div>
            </div>

            {/* Social */}
            <div>
              <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-[#C9A227]">Get Social</h3>
              <nav aria-label="Social links" className="flex gap-3">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-sm font-medium transition-all hover:bg-[#C9A227] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
                >
                  IG
                </a>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-sm font-medium transition-all hover:bg-[#C9A227] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
                >
                  IN
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-sm font-medium transition-all hover:bg-[#C9A227] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
                >
                  FB
                </a>
              </nav>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-14 border-t border-white/10 pt-8 text-center">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Tropico Retreats. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    )
}

export default Footer
