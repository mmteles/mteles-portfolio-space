# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint on TypeScript/TSX files
npm run test         # Run Vitest once
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build
```

To run a single test file:
```sh
npx vitest run src/test/example.test.ts
```

## Architecture

**Routing** (defined in `src/App.tsx`):
- `/` — Home with hero, bio, timeline sections
- `/projects` / `/projects/:id` — Project gallery and detail
- `/contact` — Contact form (submits to Supabase, triggers `send-contact-email` edge function)
- `/login` — Supabase Auth login
- `/admin` — Protected dashboard (requires auth + admin role)

**Backend: Supabase**
- Client initialized in `src/integrations/supabase/client.ts`
- Auto-generated DB types at `src/integrations/supabase/types.ts` — do not edit manually
- Database migrations in `supabase/migrations/`
- Edge function in `supabase/functions/send-contact-email/`
- Storage buckets: `project-media` (public) and `resume` (public)

**Key tables:** `profiles` (single row for portfolio owner), `projects`, `project_media`, `timeline_entries`, `contact_messages`, `user_roles`

**Auth & Authorization:**
- `src/hooks/useAuth.ts` — session management, admin role detection
- `src/components/admin/ProtectedRoute.tsx` — guards `/admin`, requires session + admin role in `user_roles` table
- RLS is enabled on all tables; admin access gated by `has_role()` DB function

**Data fetching:** React Query hooks in `src/hooks/` (`useProjects`, `useProfile`, `useTimeline`) — all data comes from Supabase

**UI components:** shadcn/ui components in `src/components/ui/` (51 components). Custom theme colors: `navy`, `slate-blue`, `warm-gray`, `gold-accent` defined in `tailwind.config.ts`

**Path alias:** `@` maps to `src/` in both TypeScript and Vite configs

## Environment

Requires `.env` in the project root with Supabase credentials:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Deployment

This project is managed via [Lovable.dev](https://lovable.dev). Changes pushed to the repo are synced with Lovable. Deploy via Lovable's Share → Publish.
