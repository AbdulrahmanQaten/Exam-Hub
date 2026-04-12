# Issues and Proposed Fixes

## 1. ESLint Errors and Warnings (47 problems)

### Type Errors (`@typescript-eslint/no-explicit-any`)
Many components and stores are using the `any` type, which bypasses TypeScript's strict typing.
- `src/components/ExcelColumnSelector.tsx`
- `src/lib/bankStore.ts`
- `src/lib/quizStore.ts`
- `src/pages/BankDashboard.tsx`
- `src/pages/BankDetails.tsx`
- `src/pages/CreateQuiz.tsx`
- `src/pages/QuizComplete.tsx`
- `src/pages/QuizResults.tsx`

**Proposed Fix:** Replace `any` with proper TypeScript interfaces/types matching the expected data shapes, specifically for Supabase responses and local state.

### React Hooks Exhaustive Deps (`react-hooks/exhaustive-deps`)
Missing dependencies in `useEffect` and `useCallback` hooks.
- `src/pages/BankDashboard.tsx`
- `src/pages/BankDetails.tsx`
- `src/pages/QuizResults.tsx`
- `src/pages/TakeQuiz.tsx`

**Proposed Fix:** Include the missing dependencies in the dependency array or use `useRef`/`useCallback` properly if functions are causing infinite loops.

### React Refresh Warnings (`react-refresh/only-export-components`)
Fast refresh only works when a file only exports components.
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/toggle.tsx`
- `src/hooks/useAuth.tsx`
- `src/lib/ThemeProvider.tsx`

**Proposed Fix:** Move non-component exports (like utility functions, constants, or contexts) to separate files.

### Empty Object Types (`@typescript-eslint/no-empty-object-type`)
- `src/components/ui/command.tsx`
- `src/components/ui/textarea.tsx`

**Proposed Fix:** Remove the empty interface or replace it with a type alias.

### Miscellaneous Linting Issues
- `src/components/BankImportDialog.tsx`: `pool` is never reassigned. Use `const` instead.
- `tailwind.config.ts`: A `require()` style import is forbidden. Convert to an ES module import if supported, or use an `eslint-disable-next-line` if necessary for Tailwind plugin compatibility.

## 2. Architectural & Infrastructure Issues

### Missing Database Migrations
- The codebase relies on Question Bank features, but there are potential missing migrations for these tables in Supabase.

**Proposed Fix:** Create and apply the necessary Supabase migrations for the question bank tables to ensure the database schema is complete and matches the application logic.

### Lack of Functional Test Coverage
- There is a lack of comprehensive functional tests for the core flows (e.g., taking a quiz, importing a bank).

**Proposed Fix:** Implement Vitest for unit tests (stores, utilities) and Playwright for end-to-end testing, covering critical user paths.

## 3. TypeScript Compiler
- `tsc --noEmit` runs successfully with 0 errors, meaning type definitions are structurally sound aside from the explicit `any` usage.