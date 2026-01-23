# Phase 5: Admin Dashboard - Research

**Researched:** 2026-01-23
**Domain:** React SPA with TanStack Query, Cognito Auth, and Tailwind CSS
**Confidence:** HIGH

## Summary

This research covers building a React admin dashboard for lead management using React 19, TanStack Query v5 for server state management, React Router v7 for SPA routing, and Tailwind CSS for styling. The dashboard will authenticate via the Cognito User Pool established in Phase 4 using amazon-cognito-identity-js.

The application architecture follows a clean separation: TanStack Query handles all server state (fetching, caching, mutations), React Router manages navigation and URL state for filters, and React Context provides authentication state. The card-based lead grid uses Tailwind's responsive grid system with a 3-column layout on desktop.

**Primary recommendation:** Use Vite for fast builds, TanStack Query v5 for server state with optimistic updates, React Router v7 for routing with `useSearchParams` for filter persistence, date-fns for relative timestamps, and lucide-react for icons (already in the existing frontend).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Already in project, concurrent rendering features |
| @tanstack/react-query | 5.x | Server state management | Industry standard for caching, mutations, optimistic updates |
| react-router | 7.x | SPA routing | Already in project (devDependencies), URL state management |
| amazon-cognito-identity-js | 6.x | Cognito auth | Works with Terraform-managed pools (per Phase 4 research) |
| Vite | 6.x | Build tool | Fast HMR, React 19 support, production-ready |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.x | Date formatting | Relative timestamps ("2 hours ago") |
| lucide-react | latest | Icons | Temperature flame, status icons (already in frontend) |
| tailwindcss | 4.x | Styling | Already in project, utility-first CSS |
| react-day-picker | 9.x | Date range picker | Filter by date range |
| @aws-sdk/client-cognito-identity-provider | 3.x | List Cognito users | Fetch team members for assignee dropdown (backend) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query | SWR | TanStack has better mutation support, optimistic updates |
| Vite | Webpack | Existing frontend uses Webpack, but Vite is faster for new project |
| react-day-picker | react-datepicker | react-day-picker has better accessibility (WCAG 2.1 AA) |
| nuqs | useSearchParams | nuqs adds type-safety but another dependency; useSearchParams sufficient |

**Installation (admin dashboard):**
```bash
npm create vite@latest admin -- --template react-ts
cd admin
npm install @tanstack/react-query react-router amazon-cognito-identity-js date-fns lucide-react react-day-picker
npm install -D tailwindcss @tailwindcss/postcss postcss
```

## Architecture Patterns

### Recommended Project Structure
```
admin/
├── src/
│   ├── api/                    # API client functions
│   │   ├── client.ts           # Fetch wrapper with auth headers
│   │   ├── leads.ts            # Lead CRUD operations
│   │   └── users.ts            # Cognito user listing
│   ├── components/
│   │   ├── ui/                 # Reusable UI primitives
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   └── Pagination.tsx
│   │   ├── leads/              # Lead-specific components
│   │   │   ├── LeadCard.tsx
│   │   │   ├── LeadGrid.tsx
│   │   │   ├── LeadDetail.tsx
│   │   │   ├── LeadFilters.tsx
│   │   │   └── NotesTimeline.tsx
│   │   └── layout/
│   │       ├── AppShell.tsx
│   │       └── Header.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx     # Cognito auth state
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth hook
│   │   ├── useLeads.ts         # Lead queries/mutations
│   │   └── useFilters.ts       # URL filter state
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── LeadsListPage.tsx
│   │   └── LeadDetailPage.tsx
│   ├── types/
│   │   └── lead.ts             # TypeScript interfaces
│   ├── lib/
│   │   ├── cognito.ts          # Cognito configuration
│   │   └── queryClient.ts      # TanStack Query client
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

### Pattern 1: TanStack Query with Optimistic Updates
**What:** Mutations that update UI immediately while syncing with server
**When to use:** Status changes, temperature updates, note additions
**Example:**
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
const queryClient = useQueryClient();

const updateLeadStatus = useMutation({
  mutationFn: (data: { leadId: string; status: LeadStatus }) =>
    api.updateLeadStatus(data.leadId, data.status),
  onMutate: async ({ leadId, status }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['leads'] });

    // Snapshot previous value
    const previousLeads = queryClient.getQueryData(['leads']);

    // Optimistically update
    queryClient.setQueryData(['leads'], (old: Lead[]) =>
      old.map(lead => lead.id === leadId ? { ...lead, status } : lead)
    );

    return { previousLeads };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['leads'], context?.previousLeads);
  },
  onSettled: () => {
    // Always refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  },
});
```

### Pattern 2: URL State for Filters with useSearchParams
**What:** Store filter state in URL for persistence and sharing
**When to use:** Search, status filters, temperature filters, date ranges
**Example:**
```typescript
// Source: https://reactrouter.com/api/hooks/useSearchParams
import { useSearchParams } from 'react-router';

function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    search: searchParams.get('search') || '',
    status: searchParams.getAll('status'),        // Multi-select
    temperature: searchParams.getAll('temp'),     // Multi-select
    assignee: searchParams.get('assignee') || '',
    dateFrom: searchParams.get('from') || '',
    dateTo: searchParams.get('to') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  };

  const setFilter = (key: string, value: string | string[]) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(key);
    if (Array.isArray(value)) {
      value.forEach(v => newParams.append(key, v));
    } else if (value) {
      newParams.set(key, value);
    }
    newParams.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const clearFilters = () => setSearchParams({});

  return { filters, setFilter, clearFilters };
}
```

### Pattern 3: Auth Context with amazon-cognito-identity-js
**What:** React Context wrapping Cognito authentication state
**When to use:** Global auth state, protected routes, API calls
**Example:**
```typescript
// Source: Phase 4 research + https://medium.com/@yogeshmulecraft/building-aws-cognito-authentication-context-in-react-js
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
};
const userPool = new CognitoUserPool(poolData);

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CognitoUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<CognitoUser | null>(null);

  useEffect(() => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (!err && session?.isValid()) {
          setIsAuthenticated(true);
          setUser(cognitoUser);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const getAccessToken = async (): Promise<string> => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) throw new Error('Not authenticated');

    return new Promise((resolve, reject) => {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) reject(new Error('Invalid session'));
        else resolve(session.getAccessToken().getJwtToken());
      });
    });
  };

  // ... signIn, signOut implementations

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, signIn, signOut, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Pattern 4: Pagination with keepPreviousData
**What:** Keep previous page data visible while loading next page
**When to use:** Paginated lead list to avoid UI flicker
**Example:**
```typescript
// Source: https://tanstack.com/query/v5/docs/react/guides/paginated-queries
import { keepPreviousData, useQuery } from '@tanstack/react-query';

function useLeadsPaginated(page: number, filters: Filters) {
  return useQuery({
    queryKey: ['leads', page, filters],
    queryFn: () => fetchLeads({ page, limit: 15, ...filters }),
    placeholderData: keepPreviousData, // v5 replacement for keepPreviousData: true
  });
}

// In component:
const { data, isFetching, isPlaceholderData } = useLeadsPaginated(page, filters);
// isPlaceholderData indicates we're showing cached data while fetching new data
```

### Pattern 5: Relative Timestamps with date-fns
**What:** Display "2 hours ago" style timestamps
**When to use:** Lead cards, notes timeline
**Example:**
```typescript
// Source: https://date-fns.org/
import { formatDistanceToNow } from 'date-fns';

function RelativeTime({ date }: { date: string }) {
  const formatted = formatDistanceToNow(new Date(date), { addSuffix: true });
  return <span title={new Date(date).toLocaleString()}>{formatted}</span>;
}

// Usage: <RelativeTime date={lead.createdAt} /> -> "2 hours ago"
```

### Anti-Patterns to Avoid
- **Storing filter state in useState:** Loses state on refresh, not shareable. Use URL params instead.
- **Fetching on every keystroke:** Debounce search input (300-500ms) before triggering queries.
- **Manual cache management:** Let TanStack Query handle caching; don't duplicate in useState.
- **Direct localStorage for auth tokens:** Use CognitoUserPool.getCurrentUser() which handles secure storage.
- **Mixing server and client state:** Server data in TanStack Query, UI state in local state/URL.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data caching | Custom fetch + useState | TanStack Query | Handles stale data, refetch, deduplication |
| Optimistic updates | Manual state rollback | useMutation onMutate/onError | Built-in rollback pattern |
| Token refresh | Manual refresh logic | CognitoUser.getSession() | Auto-refreshes expired tokens |
| Pagination state | useState for page | TanStack Query + URL params | Caching per page, no refetch |
| Date range picker | Custom calendar | react-day-picker | Accessibility, localization |
| Relative time | Manual calculation | date-fns formatDistanceToNow | Handles edge cases, i18n |
| Filter persistence | localStorage | useSearchParams | Shareable URLs, browser history |

**Key insight:** Server state (leads, users) belongs in TanStack Query. URL state (filters, pagination) belongs in useSearchParams. Local UI state (modal open, form draft) belongs in useState. Mixing these leads to bugs and stale data.

## Common Pitfalls

### Pitfall 1: Query Key Serialization
**What goes wrong:** Queries don't update when filters change because query key isn't stable
**Why it happens:** Using object references that change identity on every render
**How to avoid:** Use primitive values or stable object references in query keys
**Warning signs:** Filters change but data doesn't refetch; stale data after mutations
```typescript
// BAD: New object every render
useQuery({ queryKey: ['leads', { status, temp }], ... });

// GOOD: Stable serialization
useQuery({ queryKey: ['leads', status, temp, page], ... });
```

### Pitfall 2: Forgetting to Invalidate After Mutations
**What goes wrong:** UI shows stale data after status change, note addition
**Why it happens:** Mutation succeeds but cached data isn't refreshed
**How to avoid:** Always call `invalidateQueries` in `onSettled` callback
**Warning signs:** Changes don't appear until manual refresh; inconsistent UI

### Pitfall 3: Search Input Causes Too Many Requests
**What goes wrong:** Every keystroke triggers an API call, overwhelming server
**Why it happens:** Not debouncing search input before updating filters
**How to avoid:** Debounce search input by 300-500ms before triggering query
**Warning signs:** High API request count, slow UI, potential rate limiting
```typescript
// Use a debounced value for the query
const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);
// Use debouncedSearch in query key, not search
```

### Pitfall 4: Stale Closure in Auth Context
**What goes wrong:** getAccessToken returns expired token even after refresh
**Why it happens:** Closure captures stale session reference
**How to avoid:** Always call `cognitoUser.getSession()` which auto-refreshes
**Warning signs:** 401 errors after ~1 hour; works after re-login

### Pitfall 5: Status Progression Validation Only on Frontend
**What goes wrong:** Malicious user can POST invalid status transitions
**Why it happens:** Status progression (New -> Contacted -> Quoted) only enforced in UI
**How to avoid:** Validate status transitions in backend Lambda
**Warning signs:** Leads with impossible status transitions; audit trail inconsistencies

### Pitfall 6: Mobile Layout Breaks
**What goes wrong:** 3-column grid doesn't reflow properly on mobile
**Why it happens:** Not using responsive Tailwind classes
**How to avoid:** Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
**Warning signs:** Cards overflow viewport; horizontal scrolling on mobile

## Code Examples

Verified patterns from official sources:

### Tailwind: Responsive Card Grid (3 columns)
```tsx
// Source: https://tailwindcss.com/docs/grid-template-columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {leads.map(lead => (
    <LeadCard key={lead.id} lead={lead} />
  ))}
</div>
```

### Lead Card with Status Badge and Temperature
```tsx
// Source: lucide-react + Tailwind
import { Flame } from 'lucide-react';

const statusColors: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-l-blue-500',
  CONTACTED: 'bg-yellow-100 text-yellow-800 border-l-yellow-500',
  QUOTED: 'bg-purple-100 text-purple-800 border-l-purple-500',
  WON: 'bg-green-100 text-green-800 border-l-green-500',
  LOST: 'bg-gray-100 text-gray-800 border-l-gray-500',
};

const tempColors: Record<Temperature, string> = {
  HOT: 'text-red-500',
  WARM: 'text-orange-400',
  COLD: 'text-blue-400',
};

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link
      to={`/leads/${lead.id}`}
      className={`block p-4 bg-white rounded-lg shadow-sm border-l-4
        hover:shadow-md transition-shadow ${statusColors[lead.status]}`}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
        <Flame className={`w-5 h-5 ${tempColors[lead.temperature]}`} />
      </div>
      <span className={`inline-block px-2 py-1 text-xs rounded mt-2
        ${statusColors[lead.status]}`}>
        {lead.status}
      </span>
      <p className="text-gray-500 text-sm mt-2">
        <RelativeTime date={lead.createdAt} />
      </p>
    </Link>
  );
}
```

### API Client with Auth Headers
```typescript
// Source: Phase 4 research patterns
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_ENDPOINT;

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = await getAccessToken(); // From AuthContext

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const leadsApi = {
  list: (params: FilterParams) =>
    fetchWithAuth(`/leads?${new URLSearchParams(params as Record<string, string>)}`),
  get: (id: string) =>
    fetchWithAuth(`/leads/${id}`),
  update: (id: string, data: Partial<Lead>) =>
    fetchWithAuth(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addNote: (leadId: string, content: string) =>
    fetchWithAuth(`/leads/${leadId}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
};
```

### Date Range Picker with react-day-picker
```tsx
// Source: https://daypicker.dev/docs/selection-modes
import { DateRange, DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

function DateRangeFilter({
  from,
  to,
  onSelect
}: {
  from?: Date;
  to?: Date;
  onSelect: (range: DateRange | undefined) => void;
}) {
  return (
    <DayPicker
      mode="range"
      selected={{ from, to }}
      onSelect={onSelect}
      numberOfMonths={2}
    />
  );
}
```

### TanStack Query Client Configuration
```typescript
// Source: https://tanstack.com/query/latest
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useState + useEffect for fetching | TanStack Query useQuery | 2020+ | Automatic caching, deduplication, retry |
| keepPreviousData: true | placeholderData: keepPreviousData | TanStack Query v5 (2023) | Same behavior, different API |
| React Router v6 | React Router v7 | 2024 | Framework mode option, better TypeScript |
| Moment.js | date-fns | 2019+ | Tree-shakeable, smaller bundle |
| Create React App | Vite | 2021+ | 10-100x faster HMR and builds |
| cacheTime | gcTime | TanStack Query v5 | Renamed for clarity |

**Deprecated/outdated:**
- **Moment.js**: Use date-fns instead (smaller, tree-shakeable)
- **React.FC type**: Just use regular function components with typed props
- **class-based React components**: Use functional components with hooks
- **keepPreviousData option**: Renamed to placeholderData in TanStack Query v5

## Backend API Requirements

The admin dashboard requires these API endpoints (to be implemented):

### Required Endpoints
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /leads | List leads with pagination/filters | JWT |
| GET | /leads/{id} | Get single lead with notes | JWT |
| PATCH | /leads/{id} | Update lead (status, temp, assignee) | JWT |
| POST | /leads/{id}/notes | Add note to lead | JWT |
| PATCH | /leads/{id}/notes/{noteId} | Edit note content | JWT |
| GET | /users | List Cognito users for assignee dropdown | JWT |

### Lead Entity Extension
Current Lead type needs these additional fields:
```typescript
interface Lead {
  // ... existing fields from types.ts
  temperature: 'HOT' | 'WARM' | 'COLD';  // NEW
  assigneeId?: string;                    // NEW (Cognito user sub)
  assigneeName?: string;                  // NEW (denormalized for display)
}

interface Note {
  id: string;           // ULID
  leadId: string;
  content: string;
  authorId: string;     // Cognito user sub
  authorName: string;   // Denormalized
  type: 'MANUAL' | 'SYSTEM';  // SYSTEM for auto-logged changes
  createdAt: string;
  updatedAt: string;
}
```

### DynamoDB Schema Extension
Notes stored as separate items in same table:
```
PK: LEAD#{leadId}
SK: NOTE#{timestamp}#{noteId}  // Timestamp prefix for sort order
```

## Infrastructure Requirements

### Admin Dashboard Deployment
- S3 bucket: `admin.tropicoretreat.com`
- CloudFront distribution with custom domain
- ACM certificate (can use existing wildcard or create new)
- Route53 A record alias to CloudFront

The existing marketing site infrastructure (cloudfront.tf, s3.tf) can be referenced but admin needs separate resources to maintain isolation.

## Open Questions

Things that couldn't be fully resolved:

1. **Team member management**
   - What we know: Assignee dropdown needs list of Cognito users
   - What's unclear: Who creates team members? Admin via console or self-service?
   - Recommendation: For MVP, use AWS Console to create users. Add user management UI in future phase.

2. **Notes search scope**
   - What we know: "Search searches everything: name, email, phone, message, notes"
   - What's unclear: Full-text search in DynamoDB requires OpenSearch or client-side filtering
   - Recommendation: For MVP, implement search on lead attributes only. Notes search requires either: (a) loading all leads client-side, (b) adding OpenSearch, or (c) scan with filter expression (not scalable).

3. **Offline support**
   - What we know: TanStack Query has offline mode capabilities
   - What's unclear: Is offline admin access a requirement?
   - Recommendation: Not needed for MVP. Admin typically has connectivity.

## Sources

### Primary (HIGH confidence)
- [TanStack Query v5 Documentation](https://tanstack.com/query/latest) - Queries, mutations, pagination
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Mutation patterns
- [TanStack Query Paginated Queries](https://tanstack.com/query/v5/docs/react/guides/paginated-queries) - keepPreviousData pattern
- [React Router useSearchParams](https://reactrouter.com/api/hooks/useSearchParams) - URL state management
- [React 19 useTransition](https://react.dev/reference/react/useTransition) - Concurrent rendering
- [Tailwind CSS Grid](https://tailwindcss.com/docs/grid-template-columns) - Responsive grid layout
- [date-fns Documentation](https://date-fns.org/) - Date formatting
- [Lucide React Icons](https://lucide.dev/guide/packages/lucide-react) - Icon library
- [react-day-picker](https://daypicker.dev/) - Date range picker
- [AWS Cognito ListUsers API](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsers.html) - User listing
- Phase 4 Research (04-RESEARCH.md) - Cognito auth patterns

### Secondary (MEDIUM confidence)
- [React Router v7 Modes](https://blog.logrocket.com/react-router-v7-modes/) - SPA mode configuration
- [URL State with useSearchParams](https://blog.logrocket.com/url-state-usesearchparams/) - Filter persistence patterns
- [TkDodo's Blog - Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) - Advanced patterns
- [Vite React TypeScript Setup](https://medium.com/@robinviktorsson/complete-guide-to-setting-up-react-with-typescript-and-vite-2025-468f6556aaf2) - Project setup

### Tertiary (LOW confidence)
- [DynamoDB Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/) - Schema patterns for notes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation for all libraries
- Architecture: HIGH - Verified patterns from TanStack, React Router docs
- Pitfalls: HIGH - Common issues documented in official guides and community
- Backend requirements: MEDIUM - Extrapolated from existing types.ts and Phase 4

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - TanStack Query v5 is stable, React Router v7 is stable)
