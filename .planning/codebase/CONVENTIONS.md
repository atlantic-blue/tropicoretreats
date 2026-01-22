# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `Navigation.tsx`, `Toast.tsx`, `Footer.tsx`) - `src/components/`
- Page files: PascalCase with "Page" suffix (e.g., `AboutPage.tsx`, `ContactPage.tsx`) - `src/pages/`
- Utility/hook files: camelCase (e.g., `env.ts`, `router.tsx`) - `src/Routes/`
- Test files: `.test.ts` suffix (e.g., `index.test.ts`)

**Functions:**
- React components: PascalCase (e.g., `const Navigation: React.FC = () => {}`)
- Event handlers: camelCase with "handle" prefix (e.g., `handleAccept`, `handleScroll`, `handleDecline`)
- Helper functions: camelCase (e.g., `scrollToSection`, `getIcon`, `getStyles`)
- Custom hooks: camelCase with "use" prefix (e.g., `useReveal`, `useToast`)

**Variables:**
- State variables: camelCase (e.g., `isVisible`, `isScrolled`, `isMobileMenuOpen`)
- Constants: UPPER_SNAKE_CASE (e.g., `COOKIE_CONSENT_KEY`, `DEFAULT_TITLE`, `SITE_NAME`)
- Object/data: camelCase (e.g., `navLinks`, `toasts`, `structuredData`)

**Types:**
- Interfaces: PascalCase with descriptive names (e.g., `ToastContextType`, `SEOProps`, `Toast`)
- Type unions: PascalCase (e.g., `ToastType = "success" | "error" | "info"`)
- Enums: PascalCase members (e.g., `enum Routes { HOME = '/', ABOUT = '/about' }`)

## Code Style

**Formatting:**
- Tool: Prettier via `@maistro/prettier-config` (shared config in `.prettierrc.js`)
- Commands: `npm run format` (check), `npm run format:fix` (apply)
- Applies to: `src/**/*.{ts,tsx,js,jsx,json,css}`

**Linting:**
- Tool: ESLint via `@maistro/eslint-config` (shared config in `eslint.config.mjs`)
- Commands: `npm run lint` (check), `npm run lint:fix` (fix)
- Scopes: `.ts` and `.tsx` files in `src/`
- Uses: `@typescript-eslint/parser` for TypeScript support

**TypeScript:**
- Target: ES6
- Strict mode: enabled
- JSX: react-jsx (automatic imports)
- Module resolution: node
- Path alias: `@/*` → `src/*` in `tsconfig.json`

## Import Organization

**Order:**
1. React and external libraries (`import React from 'react'`)
2. Other third-party packages (`import { BrowserRouter } from 'react-router'`)
3. Local components and utilities (`import Navigation from './components/Navigation'`)
4. Relative imports from the same directory or parent

**Path Aliases:**
- `@/*` resolves to `src/*` - use for absolute imports from src
- Example: `import SEO from "@/components/SEO"` works equivalently to `import SEO from "../components/SEO"`

**Example from codebase:**
```typescript
// App.tsx
import React from 'react';
import { BrowserRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import AppRoutes from './Routes/router';
import Navigation from './components/Navigation';
```

## Error Handling

**Patterns:**
- Direct error throwing for critical initialization: `throw new Error('message')` - `src/index.tsx` checks for root element
- Context validation: Custom hooks validate context availability and throw descriptive errors
  ```typescript
  export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
      throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
  };
  ```
- No try-catch blocks observed in component code; errors handled at provider level or propagated
- localStorage operations use direct access without explicit error handling (relies on browser defaults)

## Logging

**Framework:** `console` (standard browser console)

**Patterns:**
- No explicit logging statements found in codebase
- Component lifecycle logged implicitly via React DevTools
- Console available for debugging via browser dev tools
- No structured logging library used

## Comments

**When to Comment:**
- File headers only when documenting complex logic (observed in `LandingPage.tsx`)
- Inline comments for non-obvious logic or setup procedures
- JSDoc rarely used; interfaces and types are self-documenting

**JSDoc/TSDoc:**
- Minimal usage observed
- React component types are inline (e.g., `React.FC<{ children: React.ReactNode }>`)
- No formal JSDoc blocks for component documentation

**Example from codebase:**
```typescript
/**
 * Tropico Retreats - Corporate Wellness Retreats Landing Page
 * React + TypeScript + Tailwind v4
 * Typography: Playfair Display (headings) + Inter (body)
 * Colour palette: Emerald + Gold accent
 */
```

## Function Design

**Size:**
- Page components: 200-300 lines (e.g., `AboutPage.tsx` 241 lines, `ContactPage.tsx` 270 lines)
- Smaller components: 50-150 lines (e.g., `Toast.tsx` 98 lines, `Navigation.tsx` 161 lines)
- Landing page: 999 lines (large but self-contained)

**Parameters:**
- Props destructured in function signature: `const Component: React.FC<Props> = ({ prop1, prop2 }) => {}`
- Single object parameter for multiple related values
- Event handlers receive standard React event types

**Return Values:**
- JSX directly from components (no wrapping)
- Custom hooks return constants or memoized values: `return { ref, shown } as const`
- Early returns for conditional rendering: `if (!isVisible) return null`

## Module Design

**Exports:**
- Default export for main component: `export default ComponentName`
- Named exports for utilities and constants: `export const functionName = ...`, `export const CONSTANT = ...`
- Both patterns in same file: `export { default, ...named }`

**Barrel Files:**
- Minimal use of barrel exports
- `index.tsx` is application entry point, not a barrel file
- Direct imports preferred over barrel pattern: `import Toast from '../components/Toast'`

**Example from codebase:**
```typescript
// Toast.tsx - multiple exports in one file
export const useToast = () => { ... };
export const ToastProvider: React.FC = ({ children }) => { ... };
export default ToastProvider;

// SEO.tsx - component + utility exports
export const localBusinessSchema = { ... };
export const faqSchema = { ... };
export default SEO;
```

## Code Patterns

**React Components:**
- Functional components with `React.FC` type annotation
- Hooks for state and effects: `useState`, `useEffect`, `useContext`, `useCallback`, `useRef`
- Props typed via interfaces defined above component

**State Management:**
- Context API with custom hooks for isolated concerns (e.g., `useToast` for toast notifications)
- React Router for URL state
- localStorage for persistent state (cookie consent, etc.)
- No Redux or other state library

**Event Handling:**
- Inline arrow functions for simple handlers
- Named handler functions for complex logic
- Event delegation using React synthetic events

**Styling:**
- Tailwind CSS v4 exclusively - no CSS modules or styled-components
- Responsive classes: `sm:`, `md:`, `lg:`, `xl:`
- Color palette: emerald (`emerald-*`), gold (`#C9A227`, `#B8860B`), white/black
- Animation: `transition-*` utilities and `animate-*` for Tailwind animations

---

*Convention analysis: 2026-01-22*
