import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, Phone } from "lucide-react";

const Navigation: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const scrollToSection = (sectionId: string) => {
    if (!isHomePage) {
      window.location.href = `/#${sectionId}`;
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { label: "Services", href: "/services" },
    { label: "Destinations", action: () => scrollToSection("collection-heading") },
    { label: "About", href: "/about" },
    { label: "FAQs", href: "/faqs" },
    { label: "Contact", href: "/contact" },
  ];

  // On non-home pages, always show solid nav; on home page, show solid after scroll
  const showSolidNav = !isHomePage || isScrolled || isMobileMenuOpen;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showSolidNav
            ? "bg-white/95 backdrop-blur-md shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
          <nav className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className={`text-xl font-bold tracking-wide transition-colors md:text-2xl ${
                showSolidNav ? "text-gray-900" : "text-white"
              }`}
            >
              TROPICO RETREATS
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-8 lg:flex">
              {navLinks.map((link) =>
                link.href ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    className={`text-sm font-medium tracking-wide transition-colors hover:text-[#C9A227] ${
                      showSolidNav ? "text-gray-700" : "text-white/90"
                    }`}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={link.label}
                    onClick={link.action}
                    className={`text-sm font-medium tracking-wide transition-colors hover:text-[#C9A227] ${
                      showSolidNav ? "text-gray-700" : "text-white/90"
                    }`}
                  >
                    {link.label}
                  </button>
                )
              )}
              <Link
                to="/contact"
                className="flex items-center gap-2 rounded-full bg-[#C9A227] px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-[#B8860B] hover:shadow-xl"
              >
                <Phone className="h-4 w-4" />
                Enquire
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 lg:hidden ${
                showSolidNav ? "text-gray-900" : "text-white"
              }`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </nav>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? "max-h-[400px] border-t border-gray-100" : "max-h-0"
          }`}
        >
          <div className="bg-white px-4 py-6 sm:px-6">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) =>
                link.href ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="py-2 text-base font-medium text-gray-700 transition-colors hover:text-[#C9A227]"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={link.label}
                    onClick={link.action}
                    className="py-2 text-left text-base font-medium text-gray-700 transition-colors hover:text-[#C9A227]"
                  >
                    {link.label}
                  </button>
                )
              )}
              <Link
                to="/contact"
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#C9A227] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-[#B8860B]"
              >
                <Phone className="h-4 w-4" />
                Enquire Now
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header - only on non-home pages */}
      {!isHomePage && <div className="h-20" />}
    </>
  );
};

export default Navigation;
