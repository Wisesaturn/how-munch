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
- Entity cross-import policy (`@x`):
  - `eslint-plugin-fsd-lint` does not provide first-class semantic validation for FSD `@x` contracts by itself.
  - For cross-entity dependencies, use `@x/<consumer>` public API only (example: `@/entities/ingredient/@x/fridge-item`).
  - `@x` imports are allowed only inside `src/entities/**`; non-entities layers must not import `@x`.
  - In entities, importing other entity slice root public APIs for cross-slice coupling is disallowed; prefer explicit `@x/<consumer>` contracts.
  - Do not import `@x` root (`@/entities/*/@x`); always import concrete consumer entry (`@/entities/*/@x/<consumer>`).
- Server Components are default; add `"use client"` only where needed.
- Use inline type imports (example: `import { type Profile } from '@/entities/profile'`).
- Common UI files should use section comment blocks (e.g., `Root`, `Header`, `Content`) in the same style as existing shared UI components.
- For common UI components (non-native wrapper abstractions), do not expose raw browser event prop names like `onChange`.
  - use semantic value handlers such as `onValueChange`, `onCheckedChange`, `onOpenChange` instead.
  - keep native browser event names only for direct native element wrappers where event passthrough is the primary purpose.
- Common UI components must model `disabled` and `invalid` states by default:
  - expose `invalid` via props/API and wire `data-invalid`/`aria-invalid` state styles.
  - do not rely on opacity-only disabled styling; use explicit disabled tokens (gray background/text/border).
- For compound components, keep `Header`/`Content`/`Footer` as sibling regions; do not nest `Header` or `Footer` inside `Content`.
- `Content` should only render body content and must not absorb title, summary, or action areas.
- React Query pattern per feature `api/`: `queryKey.ts`, `queries.ts`, `mutations.ts`; prefer `skipToken` over `enabled`.
- Supabase client error handling rule:
  - when handling Supabase responses in `queries`/`mutations`, do not throw raw errors directly (`throw error` 금지).
  - always wrap with a domain-specific resolver first (example: `throw resolveFridgeError(error)`).
  - if a resolver does not exist for the slice, add one and use it consistently.
- Transaction boundary rule (Supabase):
  - if one user action mutates multiple tables, requires read-modify-write consistency, or must be all-or-nothing, implement it as a DB RPC (`security definer`) instead of chaining multiple client queries.
  - simple single-table CRUD may stay in feature mutations (`from(...).insert/update/delete`).
  - examples that must prefer RPC: stock consume/restore, meal+usage writes, cross-table link sync, membership slot/count updates.
- Transactional RPC naming convention:
  - use `snake_case` with intent-first verb: `create_`, `update_`, `delete_`, `upsert_`, `mark_`, `deactivate_`, `generate_`, `get_`.
  - for multi-entity transactional workflows, append scope with `with_<domain>` (example: `upsert_meal_with_usage`, `create_fridge_item_with_batch`, `delete_ingredient_with_cleanup`).
  - for guarded read-modify-write updates, use `_guarded` suffix (example: `update_fridge_batch_guarded`).
  - RPC args must use `p_` prefix (example: `p_household_id`, `p_updates`).
  - keep one RPC responsible for one transaction boundary and one return contract.
  - every RPC custom exception must set both `errcode` and `hint` (`raise exception ... using errcode = 'X0001', hint = 'SOME_DOMAIN_REASON'`).
  - whenever adding/changing RPC custom exceptions, update `src/commons/lib/domainError.ts` with both code and hint entries in the same change.
- Supabase SQL function source management:
  - keep function SQL split by unit under `supabase/sql/functions/public/<category>/*.sql` (one function per file).
  - every function file must include top comments for `역할` and `동작` so contributors can quickly understand intent and flow.
  - when a function changes, update the corresponding function file and create a new migration in `supabase/migrations`.
  - follow Supabase-specific agent docs in `supabase/AGENTS.md` and function index/docs in `supabase/sql/functions/AGENTS.md`.
  - `supabase/sql/functions/*` are source references for review/maintenance; migrations remain the executable history.
- TanStack Form validation rule:
  - use `zod` schema and connect it through `useForm({ validators: { onSubmit: schema, onChange: schema } })` by default.
  - `onSubmit` and `onChange` must both be set for standard form validation flows (add `onBlur` only when needed).
  - when writing Zod schema error messages, use `ERROR_MSG` from `src/commons/lib/errorMessage.ts` first.
  - if a message pattern is reusable and not covered by `ERROR_MSG`, add it to `ERROR_MSG` and reuse it instead of hardcoded strings.
  - avoid ad-hoc `safeParse` inside submit handlers when `useForm` is already used.
  - show field-level errors inline with shared form UI patterns (`Form.Control` + `Form.Error`) rather than toast-first validation UX.
  - define form schema at module scope (outside component body) by default; only use component-scope schema when runtime props/state must affect schema shape.
  - define reusable utility/helper functions at module scope (outside component body) by default to avoid recreation on each render.
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
- Avoid mutable JSX accumulator patterns such as `let section = null; if (...) section = (...)`. Prefer explicit conditional returns or direct declarative rendering.
- For functions in any `lib` folder, add a mandatory JSDoc comment above the function and include an `@description` line describing intent.
- For functions/hooks in `model` or `lib`, add a mandatory JSDoc comment above each exported unit and include an `@description` line for purpose and behavior.
- FSD segment rule:
  - `model`: stateful/behavior logic (store, schema, business logic, effectful hooks).
  - `lib`: focused utility/library code (prefer pure helpers, no side effects).
- Hooks that register browser/global events with `useEffect` (example: gesture/touch listeners) must be placed in `model`, not `lib`.

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
