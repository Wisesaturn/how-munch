# Repository Guidelines

## Project Structure & Module Organization
- This project uses Next.js App Router with Feature-Sliced Design (FSD).
- `app/`: routing and layout only (`app/(main)/*` routes import page modules from `src/pages`).
- `pages/`: intentionally empty (Next.js path conflict workaround with `src/pages`).
- `proxy.ts`: root-level Next.js 16 proxy convention for Supabase session refresh.
- `src/`: main application code by layer:
  - `apps/`, `pages/`, `modules/`, `features/`, `entities/`, `commons/`
- `src/commons`: shared API/config/lib/types/ui.
- `public/`: static assets.
- `supabase/`: Supabase-related configuration.
- Keep dependencies one-way: `app -> apps -> pages -> modules -> features -> entities -> commons`.

## Build, Test, and Development Commands
- `pnpm dev`: start local dev server.
- `pnpm build`: production build.
- `pnpm start`: run built app.
- `pnpm lint`: run ESLint (run this first before commit).
- `pnpm lint:fix`: auto-fix lint issues.
- `pnpm format`: format all files with Prettier.
- `pnpm format:check`: check formatting without writing.

## Coding Style & Naming Conventions
- Language: TypeScript + React.
- Formatting: Prettier; linting: ESLint 9 (flat config).
- File naming:
  - `*.tsx` PascalCase (e.g., `MealCard.tsx`)
  - `*.ts` camelCase (e.g., `useAuth.ts`)
  - folders kebab-case (e.g., `meal-manager`)
- Prefer `@/*` imports (mapped to `src/*`) over long relative paths.
- Expose slice APIs through `index.ts`; avoid cross-slice direct imports in the same layer.
- Server Components are default; add `"use client"` only where needed.
- Use inline type imports (example: `import { type Profile } from '@/entities/profile'`).
- Common UI files should use section comment blocks (e.g., `Root`, `Header`, `Content`) in the same style as existing shared UI components.
- For compound components, keep `Header`/`Content`/`Footer` as sibling regions; do not nest `Header` or `Footer` inside `Content`.
- `Content` should only render body content and must not absorb title, summary, or action areas.
- React Query pattern per feature `api/`: `queryKey.ts`, `queries.ts`, `mutations.ts`; prefer `skipToken` over `enabled`.
- For shared UI context, use `createSafeContext` from `src/commons/lib/context.ts`.
- Prefer project-standard utilities first:
  - `date-fns` for date/time formatting and calculations
  - `es-toolkit` for general utility helpers
  - `es-hangul` for Korean text handling/search normalization
  - `react-simplikit` / `@react-simplikit/mobile` for optimized hooks and state helpers
- For conditional effect execution, prefer `useConditionalEffect` from `react-simplikit` over branching inside `useEffect`.
- For `useEffect`/`useConditionalEffect`, avoid anonymous callbacks and use purpose-driven named functions. For `useConditionalEffect`, prefer inline named function arguments (example: `useConditionalEffect(function sync...(){ ... })`).
- Do not expose raw `Dispatch<SetStateAction<T>>` through Context values. Expose intent-driven wrapper methods instead (example: `setOtpEmail`, `openSettings`, `resetFilters`).
- For functions returned from hooks, avoid abstract `handle*` names. Use explicit intent verbs instead (example: `resendCode`, `verifyCode`, `openSheet`).
- For slice-local hooks (not intended for reuse), avoid excessive props DI. If data already exists in same-slice Context, read it inside the hook.
- For functions in any `lib` folder, add a mandatory JSDoc comment above the function and include an `@description` line describing intent.

## Testing Guidelines
- There is currently no dedicated unit/integration test runner configured.
- Minimum validation for every change:
  1. `pnpm lint`
  2. Manual smoke test for affected flows (especially `/store`, `/fridge`, `/meal`, `/profile` and StackFlow overlays).
- If you add tests, colocate near feature code and use clear names like `featureName.test.ts`.

## Commit & Pull Request Guidelines
- Commit message format:
  - `type: short summary`
  - blank line
  - `- bullet summary`
- Do not write literal `\n` in commit bodies. Use real newlines via separate `-m` body arguments (example: `git commit -m "fix: ..." -m $'- line1\n- line2'`).
- Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`.
- PRs should include:
  - what changed and why
  - impacted routes/modules
  - lint result (`pnpm lint`)
  - screenshots/GIFs for UI changes
  - notes on environment or Supabase schema changes (if any)

## Security & Configuration Tips
- Required local env values are in `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_DB_PASSWORD`).
- Never commit secrets or real credential values.
