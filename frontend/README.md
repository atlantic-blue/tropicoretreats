# Tropico Retreats Frontend

Corporate & Wellness Retreats landing page built with React, TypeScript, and Tailwind CSS v4.

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS v4
- React Router
- react-helmet-async (SEO)

## Getting Started

```bash
npm install
npm start
```

## Creating a New Page

When adding a new page to the application, follow these steps:

### 1. Create the Page Component

Create a new file in `src/pages/` (or `src/pages/destinations/` for destination pages):

```tsx
// src/pages/MyNewPage.tsx
import React from "react";
import SEO from "../components/SEO";

const MyNewPage: React.FC = () => {
  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        title="Page Title"
        description="Page description for search engines"
        canonicalUrl="/my-new-page"
        keywords="relevant, keywords, here"
      />

      {/* Page content */}
    </div>
  );
};

export default MyNewPage;
```

### 2. Add the Route Enum

Update `src/Routes/appRoutes.tsx`:

```tsx
export enum Routes {
  // ... existing routes
  MY_NEW_PAGE = '/my-new-page',
}
```

### 3. Register the Route

Update `src/Routes/router.tsx`:

```tsx
import MyNewPage from '../pages/MyNewPage';

// Inside the Router component:
<Route path={Routes.MY_NEW_PAGE} element={<MyNewPage />} />
```

### 4. Update Navigation (if needed)

If the page should appear in the navigation, update `src/components/Navigation.tsx`:

```tsx
const navLinks = [
  // ... existing links
  { label: "My New Page", href: "/my-new-page" },
];
```

### 5. Update Footer (if needed)

If the page should appear in the footer, update `src/components/Footer.tsx`:

```tsx
<Link to="/my-new-page" className="block text-sm opacity-70 transition-all hover:opacity-100 hover:translate-x-1">
  My New Page
</Link>
```

### 6. Update Sitemap

Add the new page to `public/sitemap.xml`:

```xml
<url>
  <loc>https://tropicoretreat.com/my-new-page</loc>
  <lastmod>2025-01-21</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

### 7. Update Pre-render Script

Add the route to `scripts/prerender.js`:

```js
const routes = [
  // ... existing routes
  '/my-new-page',
];
```

## SEO Component

The `SEO` component (`src/components/SEO.tsx`) handles all meta tags. Available props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | "Tropico Retreats \| Corporate & Wellness Retreats in Colombia" | Page title |
| `description` | string | Default business description | Meta description |
| `keywords` | string | Default keywords | Meta keywords |
| `canonicalUrl` | string | - | Canonical URL path (e.g., "/about") |
| `ogType` | "website" \| "article" | "website" | Open Graph type |
| `ogImage` | string | Default hero image | Open Graph image URL |
| `twitterCard` | "summary" \| "summary_large_image" | "summary_large_image" | Twitter card type |
| `noIndex` | boolean | false | Prevent search engine indexing |
| `structuredData` | object \| object[] | - | JSON-LD structured data |

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Navigation.tsx   # Site navigation
│   ├── Footer.tsx       # Site footer
│   ├── SEO.tsx          # SEO meta tags
│   ├── ScrollToTop.tsx  # Scroll restoration
│   └── ...
├── pages/               # Page components
│   ├── AboutPage.tsx
│   ├── ContactPage.tsx
│   ├── FAQsPage.tsx
│   ├── ServicesPage.tsx
│   └── destinations/    # Destination pages
│       ├── CaribbeanPage.tsx
│       ├── CasanarePage.tsx
│       └── CoffeeRegionPage.tsx
├── Routes/
│   ├── appRoutes.tsx    # Route definitions
│   ├── router.tsx       # Router configuration
│   └── LandingPage.tsx  # Home page
└── App.tsx              # App entry point
```

## Design System

- **Background colour:** `#F7F1EC`
- **Primary colour:** Emerald (`emerald-700`, `emerald-800`, `emerald-900`)
- **Accent colour:** Gold (`#C9A227`, `#B8860B`)
- **Typography:** Playfair Display (headings), Inter (body)

## Build & Deploy

```bash
npm run build        # Build for production
npm run prerender    # Generate static HTML (after build)
```

The site is designed to be hosted on S3 with static HTML pre-rendering for SEO.
