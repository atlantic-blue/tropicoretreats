import React, { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "tropico_cookie_consent";

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-6 shadow-2xl sm:p-8">
          {/* Background decoration */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-600/10" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[#C9A227]/10" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600/20">
                <Cookie className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">We value your privacy</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-400">
                  We use cookies to enhance your browsing experience, analyse site traffic, and
                  personalise content. By clicking "Accept", you consent to our use of cookies.{" "}
                  <a
                    href="/privacy"
                    className="text-[#C9A227] underline underline-offset-2 transition-colors hover:text-[#D4AF37]"
                  >
                    Learn more
                  </a>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-3">
              <button
                onClick={handleDecline}
                className="rounded-full border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-700 hover:shadow-xl"
              >
                Accept All
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDecline}
            className="absolute right-4 top-4 p-1 text-gray-500 transition-colors hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
