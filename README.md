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
- Local-only persistence (IndexedDB)
- Export/Import JSON backup

### Planningn algorithm

**Budgeted Weighted Fair Interleaving (BWFI)** — is a practical planning heuristic that behaves well, is explainable to users, and is easy to maintain.

#### Core idea

- Maintain two candidate pools: `needsActive` and `wantsActive`, each ordered by “desirability”.
- Build a purchase sequence by repeatedly selecting the next affordable item from one of the pools.
- Selection alternates in a **weighted-fair** way: needs are favored, but wants are guaranteed opportunities when affordable.

#### Desirability score

For an item i:

- If using ranks: score = (maxRank + 1 - rank)
- If using weights: score = weight. Then adjust for “value for money” slightly:
    - finalScore = score / (price ^ alpha) where alpha is small (e.g. 0.35)

This prevents very expensive items from always blocking better progress, without turning it into pure “cheapest-first”.

#### Fairness / interleaving rule

- Choose a target ratio like 2 needs : 1 want (tunable; default 2:1).
- Keep counters pickedNeeds, pickedWants.
- At each step:
    - Prefer the list whose current share is below its target share and has an affordable item.
    - If that list has no affordable items, take from the other list if possible.
    - If neither has an affordable item, stop.

This guarantees “simultaneous pickup” because wants will be pulled in regularly as long as they’re affordable, but needs still dominate.

## Run
```bash
npm install
npm run dev
```

## Notes
- Planning only includes items in the Base Currency.
- Items in other currencies are shown as excluded until you change them.
