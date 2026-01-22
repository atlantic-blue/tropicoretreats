# Phase 2: Frontend Integration - Research

**Researched:** 2026-01-22
**Domain:** React 19 form submission, toast notifications, API integration
**Confidence:** HIGH

## Summary

This phase connects the existing marketing site contact form to the Phase 1 API and implements user feedback (loading, success, error states). The project uses React 19, TypeScript, Tailwind CSS, and webpack with dotenv-webpack for environment variables.

**Key findings:**
- React 19 introduces `useActionState` for form submission with built-in pending state - but this requires action functions, which adds complexity for a simple fetch POST. For this project's vanilla fetch approach, `useState` remains cleaner.
- The project already has a `ToastProvider` component with a `useToast` hook - it needs modification to support bottom-center positioning and a retry callback for error toasts.
- The existing form is uncontrolled (no state) - converting to controlled state with `useState` enables field preservation on error and proper clearing on success.
- Environment variables are already configured via `dotenv-webpack` - add `API_URL` to `.env` files for environment-specific endpoints.

**Primary recommendation:** Use controlled form state with `useState`, native `fetch` with `AbortController` timeout, and extend the existing Toast component to meet the design requirements.

## Standard Stack

The established libraries/tools for this phase:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.0.0 | UI framework | Already in use, native form features available |
| TypeScript | 5.8.x | Type safety | Already configured |
| Tailwind CSS | 4.1.x | Styling | Already in use with existing design system |
| lucide-react | 0.488.0 | Icons (spinner, check, x) | Already installed |
| dotenv-webpack | 8.1.1 | Environment variables | Already configured |

### No New Dependencies Required
The project already has everything needed. Do NOT add:

| Library | Why NOT |
|---------|---------|
| react-hook-form | Overkill for single form with 9 fields |
| Zod (client-side) | Backend already validates - client validation is duplicate effort |
| sonner/react-hot-toast | Existing Toast component can be extended |
| axios | Native fetch with AbortController is sufficient |

**Rationale:** The form is simple (9 fields, one API call). React 19's native capabilities plus the existing Toast infrastructure handle this without additional dependencies. Adding libraries increases bundle size and maintenance burden for marginal benefit.

## Architecture Patterns

### Recommended File Structure
```
src/
├── components/
│   └── Toast.tsx              # Existing - MODIFY for bottom-center + retry
├── pages/
│   └── ContactPage.tsx        # Existing - ADD form submission logic
├── api/
│   └── submitContact.ts       # NEW - API call with timeout handling
├── types/
│   └── contact.ts             # NEW - TypeScript interfaces
└── env.ts                     # Existing - ADD api.contactUrl
```

### Pattern 1: Controlled Form State with Single Object
**What:** Store all form fields in one state object instead of individual useState calls
**When to use:** Forms with multiple fields that submit together
**Why:** Simpler state management, easy to reset all fields, easy to preserve on error

```typescript
// Source: React patterns for multi-field forms
interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  groupSize: string;
  preferredDates: string;
  destination: string;
  message: string;
}

const initialFormData: ContactFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  groupSize: '',
  preferredDates: '',
  destination: '',
  message: '',
};

const [formData, setFormData] = useState<ContactFormData>(initialFormData);

// Generic handler for all fields
const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

// Reset on success
setFormData(initialFormData);
```

### Pattern 2: Fetch with AbortController Timeout
**What:** Wrap fetch in timeout handling using AbortController
**When to use:** Any API call where you want to fail gracefully after a timeout
**Why:** Fetch has no built-in timeout - AbortController provides clean cancellation

```typescript
// Source: MDN AbortSignal documentation
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}
```

### Pattern 3: Submission State Machine
**What:** Track form state as idle/submitting/success/error
**When to use:** Forms with async submission
**Why:** Prevents double-submit, enables proper UI feedback

```typescript
type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
const [errorMessage, setErrorMessage] = useState<string | null>(null);

const isSubmitting = submissionState === 'submitting';
```

### Anti-Patterns to Avoid
- **Calling setState in useEffect after submission:** Use the submission handler directly
- **Using uncontrolled inputs with reset via ref:** Harder to preserve state on error
- **Multiple loading states:** One `submissionState` is sufficient
- **Inline fetch calls:** Extract to separate function for testability and reuse

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification system | Extend existing `Toast.tsx` | Already has provider, context, auto-dismiss |
| Loading spinner | Custom SVG animation | lucide-react `Loader2` with `animate-spin` | Already installed, consistent with site icons |
| Environment variables | Manual window.ENV | dotenv-webpack `process.env.API_URL` | Already configured in webpack |
| Form field disabling | Individual disabled props | Single `disabled={isSubmitting}` on fieldset | Cleaner, fewer props |

**Key insight:** The project already has 80% of what's needed. The work is integration and extension, not building from scratch.

## Common Pitfalls

### Pitfall 1: Toast Position Mismatch
**What goes wrong:** Current Toast is positioned `top-24 right-4`, but design requires bottom-center
**Why it happens:** Existing component was built for different use case
**How to avoid:** Modify Toast.tsx to accept position prop or create variant
**Warning signs:** Toast appears in wrong position during testing

### Pitfall 2: Form Not Clearing After Success
**What goes wrong:** Form fields retain values after successful submission
**Why it happens:** Uncontrolled inputs don't respond to state changes
**How to avoid:** Use controlled inputs with explicit `value={formData.fieldName}`
**Warning signs:** User submits, sees success, but form still shows their data

### Pitfall 3: Network Errors Swallowed
**What goes wrong:** Silent failure when API is unreachable
**Why it happens:** Catch block doesn't distinguish network errors from API errors
**How to avoid:** Check for `TypeError` (network) vs Response with error status (API)
**Warning signs:** User clicks submit, nothing happens, no error shown

### Pitfall 4: Double Submit
**What goes wrong:** User clicks submit multiple times, creates duplicate leads
**Why it happens:** Button not disabled during submission
**How to avoid:** Disable button immediately on click, use submissionState check
**Warning signs:** Multiple identical leads in DynamoDB

### Pitfall 5: Environment Variable Missing in Production
**What goes wrong:** API calls fail in production but work in dev
**Why it happens:** `.env.production` missing API_URL
**How to avoid:** Create `.env.production` with production API URL, verify in build output
**Warning signs:** `undefined` in network tab URL

### Pitfall 6: CORS Errors
**What goes wrong:** Browser blocks request to API Gateway
**Why it happens:** Origin not in API Gateway CORS configuration
**How to avoid:** Verify CORS includes both localhost:3000 and production domain
**Warning signs:** "Access-Control-Allow-Origin" error in console

## Code Examples

Verified patterns for this implementation:

### API Service Function
```typescript
// src/api/submitContact.ts
import { ContactFormData } from '../types/contact';

const API_URL = process.env.API_URL;
const TIMEOUT_MS = 30000; // 30 seconds per design decision

export interface SubmitContactResult {
  success: boolean;
  message?: string;
  leadId?: string;
}

export async function submitContact(data: ContactFormData): Promise<SubmitContactResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || 'Something went wrong. Please try again.',
      };
    }

    const result = await response.json();
    return {
      success: true,
      leadId: result.leadId,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timed out. Please check your connection and try again.',
        };
      }
    }

    return {
      success: false,
      message: 'Unable to connect. Please check your internet and try again.',
    };
  }
}
```

### Extended Toast with Retry Support
```typescript
// Addition to existing Toast.tsx
interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  onRetry?: () => void; // NEW: retry callback for error toasts
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, onRetry?: () => void) => void;
}

// In toast rendering, add retry button if onRetry provided:
{toast.onRetry && (
  <button
    onClick={() => {
      removeToast(toast.id);
      toast.onRetry?.();
    }}
    className="mt-2 text-sm font-semibold text-red-700 hover:text-red-800"
  >
    Try Again
  </button>
)}
```

### Form Submission Handler
```typescript
// In ContactPage.tsx
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (submissionState === 'submitting') return; // Prevent double-submit

  setSubmissionState('submitting');
  setErrorMessage(null);

  const result = await submitContact(formData);

  if (result.success) {
    setSubmissionState('success');
    setFormData(initialFormData); // Clear form
    showToast('success', "Thanks! We'll be in touch soon.");
  } else {
    setSubmissionState('error');
    setErrorMessage(result.message || 'Something went wrong');
    showToast(
      'error',
      'Oops! Something went wrong.',
      result.message,
      () => handleSubmit(e) // Retry callback
    );
  }
};
```

### Submit Button with Loading State
```typescript
<button
  type="submit"
  disabled={submissionState === 'submitting'}
  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C9A227] px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-[#C9A227]/30 transition-all duration-300 hover:bg-[#B8860B] hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
>
  {submissionState === 'submitting' ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Sending...
    </>
  ) : (
    <>
      <Send className="h-4 w-4" />
      Send Enquiry
    </>
  )}
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useFormState (react-dom) | useActionState (react) | React 19 stable | Hook renamed and moved to react package |
| Manual pending state | isPending from useActionState | React 19 | Automatic pending tracking (if using actions) |
| Context-based toast | Observer pattern (Sonner) | 2024 | Simpler API, but existing Context works fine |

**Not applicable to this project:**
- Server Actions - this is a client-side SPA, not Next.js
- useActionState - simpler to use useState for this single-form use case
- useFormStatus - requires form actions, which we're not using

## Open Questions

Things that couldn't be fully resolved:

1. **Toast animation for bottom-center**
   - What we know: Current Toast uses `slide-in-from-right` animation
   - What's unclear: Best animation for bottom-center (slide-up? fade?)
   - Recommendation: Use `slide-in-from-bottom` from tailwindcss-animate (already installed)

2. **Validation error inline positioning**
   - What we know: Design says inline errors under fields AND summary banner
   - What's unclear: Exact visual design for inline errors
   - Recommendation: Match existing field styling with red border and small red text below

3. **Form field values in API payload**
   - What we know: Backend expects specific field names
   - What's unclear: Whether backend schema matches exactly (firstName vs first_name)
   - Recommendation: Verify with Phase 1 Zod schema before implementation

## Sources

### Primary (HIGH confidence)
- [React useActionState docs](https://react.dev/reference/react/useActionState) - Official React 19 documentation
- [React useFormStatus docs](https://react.dev/reference/react-dom/hooks/useFormStatus) - Official React 19 documentation
- [MDN AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) - Timeout handling
- Existing codebase: `/frontend/src/components/Toast.tsx`, `/frontend/src/pages/ContactPage.tsx`

### Secondary (MEDIUM confidence)
- [LogRocket: React toast libraries](https://blog.logrocket.com/react-toast-libraries-compared-2025/) - Toast positioning patterns
- [dotenv-webpack GitHub](https://github.com/mrsteele/dotenv-webpack) - Environment variable handling
- [Sonner position patterns](https://www.shadcn.io/patterns/sonner-position-5) - Bottom-center toast UX

### Tertiary (LOW confidence)
- Various Medium/Dev.to articles on React 19 form patterns - confirmed against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified against existing package.json and webpack config
- Architecture: HIGH - Patterns verified against React 19 official docs and existing codebase
- Pitfalls: HIGH - Based on common issues in similar implementations
- Code examples: MEDIUM - Patterns verified, exact integration needs testing

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable patterns, no expected changes)
