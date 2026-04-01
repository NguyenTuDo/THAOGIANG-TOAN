# Unified Tourist App — CLAUDE.md

## Project Overview
Educational web app for solving graph theory problems (Hamiltonian Cycle/Path, TSP) using Ho Chi Minh City tourist destinations. Users select destinations, run algorithms, and view step-by-step solutions on an interactive D3 graph.

## Tech Stack
- **Frontend:** React 19, TypeScript ~5.8, Tailwind CSS 4, Vite 6
- **Routing:** React Router DOM 7
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Visualization:** D3 v7
- **Icons:** lucide-react
- **Testing:** Playwright (E2E)

## Dev Commands
```bash
npm run dev       # Dev server at http://localhost:3000
npm run build     # Production build → /dist
npm run preview   # Preview production build
npm run lint      # TypeScript type check (tsc --noEmit)
```

## Project Structure
```
src/
├── algorithms/        # Graph algorithm implementations
│   ├── hamiltonianCycle.ts
│   ├── hamiltonianPath.ts
│   └── subsetRoute.ts
├── components/        # React UI components
├── contexts/          # AuthContext, LanguageContext (vi/en)
├── pages/             # GuidebookPage.tsx, AdminPage.tsx
├── hooks/             # useAlgorithm.ts, useGraphEditor.ts
├── lib/               # supabase.ts, dataStore.ts, permissions.ts
├── data/              # hcmcLocations.ts (static initial data)
└── types/             # index.ts (all TypeScript definitions)
```

## Key Architectural Decisions
- **Data fallback:** If Supabase is unavailable, app falls back to built-in `INITIAL_GRAPH_DATA` (src/data/hcmcLocations.ts) then localStorage.
- **Auth:** Supabase email/password. Demo mode uses localStorage admin flag. Guest access requires no login.
- **RBAC:** `src/lib/permissions.ts` defines guest vs. admin capabilities. Supabase RLS enforces server-side.
- **i18n:** `LanguageContext` provides Vietnamese/English toggle at runtime.
- **Path alias:** `@/*` maps to `src/*`.

## Three App Modes
- **Bài 1:** Hamiltonian Cycle — shortest cycle visiting all selected destinations, return to start
- **Bài 2:** Hamiltonian Path — shortest path from A to B visiting all selected destinations
- **Bài 3:** Subset Route — TSP on any user-chosen subset of destinations

## Database (Supabase)
Tables: `locations`, `routes`, `preset_selections`
- Public: read-only
- Admin: write/delete (JWT role check: `user_metadata.role == 'admin'`)

See `SUPABASE_SETUP.md` for full schema and setup instructions.

## Environment
Required in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
`.env.example` has the template.

## Images
Location images expected in `/public/images/`.
