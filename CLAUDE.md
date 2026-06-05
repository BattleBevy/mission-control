# Mission Control Dashboard

**Goal:** Local HTML/JS dashboard in OneDrive, opens in any browser without a server. Single hub replacing the weekly bill-pay workflow of tabbing between spreadsheets. The dashboard IS the app — data entry happens here, not in Excel.

## Architecture
- Pure HTML/CSS/JS — no build tools, no server, no frameworks
- Each domain = its own folder with `index.html`
- `index.html` = hub/launcher
- Data persists in `localStorage` (key: `finance-v1`). No external data files.
- Export/Import buttons in Finance let the user back up and restore as JSON.

## Domains
| Domain | Status |
|---|---|
| **Finance** | ✓ Complete — see below |
| **Meal & Nutrition Hub** | ✓ Complete — see below |
| **Game World Codex** | Not started — Sims 4 world: characters, households, relationships, lore (POV: "fairy godmother" who designs homes) |

> ⚠️ **Debt avalanche template** — purchased Excel template the user actively uses. Out of scope for this dashboard. Do not replicate it. The Finance dashboard shows debt balances only as a progress tracker.

## Finance Command Center — `finance/index.html`

Fully self-contained interactive app. All data lives in localStorage.

### Features
- **Bills** — full list sorted by due date, mark paid inline (amount editable), undo, autopay badges, overdue highlighting. Add new bills by inserting into the `SEED.bills` array in the file — must use a unique `id` higher than any existing one (current max: 21).
  - **Bill amount is click-to-edit when unpaid** (same interaction as balance) — useful for variable monthly bills like Gas and Electric whose amount changes each month. Saves to localStorage immediately. Class `bill-amt-edit` triggers this; only rendered when `!b.paid`.
  - **Overdue logic** compares `state.month` against the real calendar month. If the user has advanced to a future month early (e.g. clicks New Month on the 31st), `todayDay` is set to `0` so no bills appear overdue yet. Normal date comparison resumes once the calendar catches up.
- **Debt Overview** — sums all bill balances, progress bar toward salary goal ($125K), individual account list. Balance on each bill is click-to-edit. Goal amount is click-to-edit.
- **Expense Log** — category dropdown, amount, optional description. Collapsible log. Category totals with bars.
- **Receipt Analysis** — per-store-visit entry broken into subcategories: Shared Food, Pet, Bev Food, Rich Food, Misc, Deposit, Tax. Collapsible log. Subcategory totals with bars.
  - **Entry is per-item accumulator** — each bucket has an input + `+` button (or Enter). Items appear as a list with a running total and individual `✕` delete buttons. On save, only bucket totals are stored (same data shape as before); the item list is in-memory only (`recItems` object, cleared on save and New Month). Key functions: `renderRecForm()`, `addRecItem(catId)`, `recBucketTotal(catId)`, `recGrandTotal()`. Event delegation wired on `#rec-cat-grid`.
- **New Month** — resets bill paid status, clears expenses, receipts, and in-memory receipt form (`recItems`). Prompts to export first.
- **Export / Import** — JSON backup/restore.

### Expense categories
walmart · other-food · amazon · vet · anet (ArenaNet/Guild Wars) · gas · house · other · yearly

### Data model
Bills in `SEED.bills` are merged into localStorage on load — any new bill added to SEED with a new unique `id` appears automatically on next refresh without clearing storage.

## File Structure
```
MissionControl/
  index.html              ← hub launcher (reads finance data from localStorage)
  finance/index.html      ← Finance Command Center (self-contained app)
  meal/index.html         ← Meal & Nutrition Hub (self-contained app)
  codex/                  ← not started
```

## Meal & Nutrition Hub — `meal/index.html`

Fully self-contained interactive app. All data lives in `localStorage` key `meal-v1`.

### Tabs
- **Plan** — daily meal plan with nutrition totals and goal progress bars. Grocery List and New Week buttons in toolbar.
- **Foods** — food library. Add/edit/delete foods with full nutrition. "Add to Plan" button on each row.
- **Recipes** — recipe library with ingredient builder. "Add to Plan" button on each card.

### Meal slots
`meal1` · `meal2` · `meal3` · `daysnacks` · `nightsnacks` (displayed as Meal 1, Meal 2, Meal 3, Day Snacks, Night Snacks)

### Nutrition fields (NUTR config array — drives all forms, tables, totals)
`cal` · `fat` · `sfat` · `tfat` · `chol` · `sod` · `potm` · `carb` · `fiber` · `sugar` · `added` · `protein`

Goal progress bars shown for: `cal` (1500 default) · `protein` (140g default) · `fiber` (30g default)

### Key functions
- `nutrOf(item)` — core math. If `item.servingSize` set: `mult = actual / servingSize`. Else: `mult = actual ?? servings ?? 1`. Multiplies all NUTR fields.
- `qtyLabel(item)` — formats quantity display (e.g. `200g / 34g sv` or `×2`).
- `recipeNutr(recipe)` — sums `nutrOf()` across `recipe.ingredients[]`; falls back to stored flat fields if no ingredients.
- `itemNutr(item)` — returns per-serving nutrition. For recipes: `recipeNutr(recipe)` ÷ `recipe.yields`. For foods: flat fields.

### Plan item shapes (two shapes exist — both valid)
Inline add form saves: `{ id, name, actual, servingSize, unit, isAlt, ...nutrFields }`
"Add to Plan" modal saves: `{ id, name, servings, isAlt, ...nutrFields }` (nutrition pre-computed, servings = multiplier, no actual/unit)

`nutrOf()` handles both: checks `servingSize` first, then falls back to `actual`, then `servings`.

### Recipe data model
`{ id, name, category, yields, ingredients: [{ name, actual, servingSize, unit, ...nutrFields }], notes, ...nutrFields }`

`yields` = number of servings (divides totals for per-serving display and plan addition).
`ingredients[]` is optional — if empty, flat nutrFields are used directly (backward compat).

### Categories
Recipe categories stored in `D.categories[]`. Defaults: Beef · Chicken · Pork · Fish · Seafood · Vegetarian · Pasta · Soup / Stew · Salad · Snack · Breakfast · Dessert. New categories auto-created when saving a recipe with an unrecognized category name.

### Grocery List
"Grocery List" button opens modal. Flattens all non-alt plan items, groups by `name.toLowerCase() + '|' + unit`, sums `actual ?? servings ?? 1` per day, multiplies by days (default 5). Copy button exports plain text.

### Data model (`blank()`)
```js
{
  goals:        { cal: 1500, protein: 140, fiber: 30 },
  plan:         { meal1: [], meal2: [], meal3: [], daysnacks: [], nightsnacks: [] },
  foods:        [],
  recipes:      [],
  categories:   [...DEFAULT_CATEGORIES],
  nextFoodId:   1,
  nextRecipeId: 1,
  nextItemId:   1,
}
```

---

## Suite Context

Part of **AppForEverything** — a personal life OS (see parent `CLAUDE.md`).

Siblings: Dynamic Adaptive Scheduler (`PlannerApp/`), Portfolio Website, Job Search Command Center.

Integration targets (long-term, not MVP):
- Bill due dates from Finance feed into PlannerApp as fixed schedule events
- Meal plan slots ("Meal 1 / 2 / 3 / Day Snacks / Night Snacks") map to PlannerApp schedule blocks
- MissionControl data will migrate from `localStorage` to the shared Firebase Firestore instance when PlannerApp's backend is set up — same project, same free tier

The Hearth Witch palette here is the candidate for the eventual unified tablet UI across all apps.

---

## Design: "Hearth Witch" — parchment, copper, moss green
Earthy palette — parchment base with copper/amber and moss/forest green as equally valid accents. Green is not a fallback color; it's as much a part of this palette as amber. New UI elements can reach for green as readily as copper.

All domains share this base palette (CSS vars in every file):
`--bg #ede5d8` · `--surface #faf5eb` · `--border #d4b896` · `--text #2a1a08` · `--muted #7a5c3c` · `--success #4e6b35` · `--warn #c87820` · `--danger #8b3530`

`--muted` (#7a5c3c) is olive-brown; `--success` (#4e6b35) is forest green — both are first-class palette members, not just utility states.

Domain card accents (`border-top`): Finance `#c27c28` copper · Meal `#c06040` terracotta · Codex `#6b4a7a` amethyst

Typography: Georgia serif for `h1` / `.domain-title` · system sans-serif for body and numbers
