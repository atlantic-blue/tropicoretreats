# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Runner:**
- Jest 29.6.1
- Config: `frontend/jest.config.js` (local configuration)
- TypeScript support via ts-jest

**Assertion Library:**
- Jest built-in expect assertions (no separate library)

**Run Commands:**
```bash
npm test                # Run all tests once
npm run test:watch     # Run tests in watch mode with file monitoring
npm run test:coverage  # Generate coverage report
```

## Test File Organization

**Location:**
- Co-located: Test files sit alongside source code
- Convention: `.test.ts` or `.test.tsx` suffix

**Naming:**
- Files: `[FileName].test.ts` (e.g., `index.test.ts`)
- Suites: Group related tests with `describe()`
- Test cases: Individual assertions with `it()` or `test()`

**Structure:**
```
frontend/
├── src/
│   ├── index.test.ts              # Minimal example test
│   ├── App.tsx
│   ├── components/
│   │   └── [Component files]
│   └── pages/
│       └── [Page files]
└── jest.config.js
```

## Test Structure

**Suite Organization:**

Current minimal example from `src/index.test.ts`:
```typescript
describe('app', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
```

**Patterns:**
- Use `describe()` to group related tests
- Use `it()` or `test()` for individual test cases
- Assertion syntax: `expect(actual).toBe(expected)`
- Async test support: `async () => {}` for async operations

**Setup/Teardown:**
- `beforeEach()`: Run before each test (cleanup, initialization)
- `afterEach()`: Run after each test (teardown, state reset)
- `beforeAll()`: Run once before all tests in suite
- `afterAll()`: Run once after all tests complete

**Example pattern:**
```typescript
describe('Toast', () => {
  beforeEach(() => {
    // Reset component state
    localStorage.clear();
  });

  afterEach(() => {
    // Cleanup
  });

  it('should show toast notification', () => {
    // Test body
  });
});
```

## Mocking

**Framework:**
- Jest's built-in mocking (`jest.mock()`, `jest.fn()`)
- No additional mocking library detected

**Patterns:**
```typescript
// Mock module
jest.mock('./module', () => ({
  Component: jest.fn(() => null),
}));

// Mock function
const mockFunction = jest.fn();
const mockFunction = jest.fn((arg) => arg * 2);

// Spying on functions
jest.spyOn(object, 'method').mockReturnValue('value');
```

**What to Mock:**
- External API calls
- localStorage (for state persistence testing)
- Router navigation
- Context providers
- Third-party library functions

**What NOT to Mock:**
- React components within the component being tested (use real components)
- Built-in methods unless isolating external dependencies
- Tailwind styles or CSS utilities

## Fixtures and Factories

**Test Data:**
- Not currently established in codebase
- Recommended pattern for component data:
```typescript
// Example fixture pattern to implement
const mockToastProps = {
  type: 'success' as const,
  title: 'Success Message',
  message: 'Operation completed',
};

const mockSEOProps = {
  title: 'Test Page',
  description: 'Test description',
  canonicalUrl: '/test',
};
```

**Location:**
- Fixtures should live in `__fixtures__/` directory at test file level
- Or inline in test file for simple cases
- Create `src/__fixtures__/` directory for shared test data

**Example structure:**
```
src/
├── components/
│   └── Toast.tsx
├── __fixtures__/
│   ├── toast.fixtures.ts
│   └── page.fixtures.ts
└── components.test.ts
```

## Coverage

**Requirements:**
- No coverage threshold enforced currently
- Target: 80% for components, 100% for utilities (recommended best practice)

**View Coverage:**
```bash
npm run test:coverage
# Opens coverage report in coverage/lcov-report/index.html
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, custom hooks, utility code
- Approach: Isolate component/function from dependencies via mocking
- Examples to test:
  - `useToast` hook behavior
  - `useReveal` hook in-view detection
  - `env.ts` configuration loading

**Integration Tests:**
- Scope: Multiple components working together
- Approach: Mount component tree with real child components
- Examples to test:
  - Navigation with Router
  - ToastProvider with components using `useToast`
  - SEO component with page content

**E2E Tests:**
- Framework: Not currently used
- Recommendation: Add Playwright or Cypress for full page flows
- Would test: Form submissions, navigation flows, multi-page journeys

## Common Patterns

**Async Testing:**
```typescript
it('should load data asynchronously', async () => {
  const promise = fetchData();
  // Wait for promise to resolve
  await expect(promise).resolves.toEqual({ success: true });
});

it('should handle async errors', async () => {
  const promise = failingAsyncFunction();
  await expect(promise).rejects.toThrow('Error message');
});
```

**Error Testing:**
```typescript
it('should throw error when context not available', () => {
  expect(() => {
    useToast(); // Called outside ToastProvider
  }).toThrow("useToast must be used within a ToastProvider");
});

it('should handle invalid input', () => {
  expect(() => {
    processData(null);
  }).toThrow();
});
```

**Component Testing Pattern:**
```typescript
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

describe('Navigation', () => {
  it('should toggle mobile menu on button click', () => {
    render(<Navigation />);
    const button = screen.getByLabelText('Toggle menu');
    fireEvent.click(button);
    // Assert menu is visible
  });
});
```

## Test Configuration

**TypeScript in Tests:**
- Tests use `.test.ts` files
- Full TypeScript support via jest configuration
- Type checking enforced same as source code

**Setup Files:**
- No setup files currently configured
- Can add `setupFilesAfterEnv` in `jest.config.js` for:
  - Global test utilities
  - Mock localStorage
  - Mock window.matchMedia
  - Test library configuration

**Recommended setup:**
```typescript
// jest.setup.ts
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

## Current Coverage Gaps

**Components with no tests:**
- All React components lack test coverage
- Critical components to test first:
  - `Toast.tsx` - Context provider and hook
  - `Navigation.tsx` - State management and rendering logic
  - `CookieConsent.tsx` - localStorage persistence
  - `useReveal` hook - Intersection Observer logic

**Utilities with no tests:**
- `env.ts` - Environment configuration loading
- `router.tsx` - Route definitions
- `appRoutes.tsx` - Route enum and class

**Integration areas:**
- Page + SEO component integration
- Router + Navigation integration
- Provider nesting (BrowserRouter → HelmetProvider → ToastProvider)

---

*Testing analysis: 2026-01-22*
