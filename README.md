# Wish Plan (Local-only SPA)

A local-first wish list + acquisition planner.

## Tech stack
- **Build:** Vite 7, React 18, TypeScript 5
- **UI:** Tailwind CSS, Radix UI primitives (dialog, tabs, dropdown, etc.), Lucide icons
- **State:** Zustand
- **Storage:** LocalForage (IndexedDB)

## Features
- Needs + Wants lists
- Price + currency per item
- Priority (rank or weight)
- Achieved toggle (strikethrough)
- Plan settings: start date + monthly free budget + carryover
- Month-by-month acquisition plan (fair interleaving of needs/wants)
- Local-only persistence (IndexedDB) + Export/Import JSON backup

## Run
```bash
npm install
npm run dev
```

## Notes
- Planning only includes items in the Base Currency.
- Items in other currencies are shown as excluded until you change them.
