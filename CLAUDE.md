# Unified Tourist App — CLAUDE.md

## Project Overview
Educational web app for solving graph theory problems (Hamiltonian Cycle/Path, TSP) using Ho Chi Minh City tourist destinations. Users select destinations, run algorithms, and view step-by-step solutions on an interactive D3 graph.

## Tech Stack
- **Frontend:** React 19, TypeScript ~5.8, Tailwind CSS 4, Vite 6
- **Routing:** React Router DOM 7
- **Backend:** None — data is embedded in `src/data/hcmcLocations.ts`; admin edits persist to localStorage only
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
├── lib/               # dataStore.ts, permissions.ts, geo.ts, presetRoutes.ts
├── data/              # hcmcLocations.ts (static initial data)
└── types/             # index.ts (all TypeScript definitions)
```

## Key Architectural Decisions
- **Data:** Built-in `INITIAL_GRAPH_DATA` (src/data/hcmcLocations.ts), overridden by localStorage edits made in /admin.
- **Auth:** No real auth. Admin mode is a localStorage flag (`tourist.demo.admin`). Guest access requires no login.
- **RBAC:** `src/lib/permissions.ts` defines guest vs. admin capabilities.
- **i18n:** `LanguageContext` provides Vietnamese/English toggle at runtime.
- **Path alias:** `@/*` maps to `src/*`.

## Three App Modes
- **Bài 1:** Hamiltonian Cycle — shortest cycle visiting all selected destinations, return to start
- **Bài 2:** Hamiltonian Path — shortest path from A to B visiting all selected destinations
- **Bài 3:** Subset Route — TSP on any user-chosen subset of destinations

## Images
Location images expected in `/public/images/`.
