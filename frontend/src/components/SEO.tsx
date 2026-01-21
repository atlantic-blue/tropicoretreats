import React from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
  structuredData?: object | object[];
}

const SITE_NAME = "Tropico Retreats";
const DEFAULT_TITLE = "Tropico Retreats | Corporate & Wellness Retreats in Colombia";
const DEFAULT_DESCRIPTION =
  "Plan your corporate retreat in Colombia with Tropico Retreats. We handle accommodation, transport, venues, activities, catering, and entertainment for unforgettable team experiences.";
const DEFAULT_KEYWORDS =
  "corporate retreats Colombia, wellness retreats, team building Colombia, corporate events, luxury retreats, Caribbean retreats, Coffee Region Colombia, Casanare, business travel Colombia";
const DEFAULT_IMAGE = "https://tropicoretreat.com/public/assets/landing-page/hero.webp";
const SITE_URL = "https://tropicoretreat.com";

const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonicalUrl,
  ogType = "website",
  ogImage = DEFAULT_IMAGE,
  twitterCard = "summary_large_image",
  noIndex = false,
  structuredData,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const canonical = canonicalUrl ? `${SITE_URL}${canonicalUrl}` : undefined;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Additional SEO Meta Tags */}
      <meta name="author" content="Tropico Retreats" />
      <meta name="geo.region" content="CO" />
      <meta name="geo.placename" content="Colombia" />
      <meta name="language" content="en-GB" />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(structuredData) ? structuredData : [structuredData])}
        </script>
      )}
    </Helmet>
  );
};

// Pre-built structured data for the business
export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: "Tropico Retreats",
  description: DEFAULT_DESCRIPTION,
  url: SITE_URL,
  logo: `${SITE_URL}/public/assets/logo.png`,
  image: DEFAULT_IMAGE,
  telephone: "+447806705494",
  email: "hello@tropicoretreats.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "London",
    addressCountry: "GB",
  },
  areaServed: {
    "@type": "Country",
    name: "Colombia",
  },
  priceRange: "$$$$",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Friday",
      opens: "09:00",
      closes: "13:00",
    },
  ],
  sameAs: [
    "https://www.instagram.com/tropicoretreat",
    "https://www.linkedin.com/company/tropicoretreat",
    "https://www.facebook.com/tropicoretreat",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Corporate Retreat Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Accommodation",
          description: "Luxury villas, haciendas, eco-lodges and boutique hotels across Colombia",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Transport",
          description: "Airport transfers, internal transport, premium vehicles with bilingual drivers",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Venues",
          description: "Conference rooms, outdoor spaces, meeting facilities with full AV equipment",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Activities",
          description: "Team building, outdoor adventures, cultural experiences, wellness programmes",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Catering",
          description: "Private chefs, bespoke menus, local and international cuisine",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Entertainment",
          description: "Live music, cultural shows, guided tours, exclusive experiences",
        },
      },
    ],
  },
};

// FAQ Schema for the landing page
export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What group sizes can you accommodate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We work with groups ranging from intimate executive retreats (8–15 guests) to larger corporate events (50+ attendees). Each experience is tailored to your specific group size and requirements.",
      },
    },
    {
      "@type": "Question",
      name: "How far in advance should we book?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We recommend booking at least 3–6 months in advance for the best availability, especially during peak season (December–March). However, we can sometimes accommodate shorter notice requests.",
      },
    },
    {
      "@type": "Question",
      name: "What's included in your packages?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our packages can include accommodation, all meals and beverages, airport transfers, internal transportation, activities, meeting facilities, and dedicated on-site coordination. We customise each package to your needs.",
      },
    },
    {
      "@type": "Question",
      name: "Do you handle visa requirements and travel logistics?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "While we provide guidance on visa requirements and travel tips, guests are responsible for their own travel documentation. We do coordinate all in-country logistics including airport pickups and internal travel.",
      },
    },
    {
      "@type": "Question",
      name: "Can you accommodate dietary restrictions?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Our private chefs are experienced in catering to all dietary requirements including vegetarian, vegan, gluten-free, kosher, halal, and allergy-specific needs. Please inform us at booking.",
      },
    },
  ],
};

export default SEO;
