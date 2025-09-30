# Hustle Module Structure

## Purpose
Reorganize instant and study hustles into small, purpose-driven modules so designers can expand the catalog without digging through cross-cutting logic.

## File Map
- `src/game/hustles/helpers.js` – requirement utilities, metric helpers, and shared constants. UI modules import from here to reuse requirement rendering logic.
- `src/game/hustles/definitions/` – instant hustle configuration objects grouped by family. Each export is a plain object that `createInstantHustle` turns into a runnable definition.
- `src/game/hustles/knowledgeHustles.js` – study program factory and card wiring. Education pacing stays isolated from instant gigs.
- `src/game/hustles.js` – index that composes the exported `HUSTLES` array and re-exports helper utilities for consumers.

## Adding a Hustle
1. Create or update a definition module under `src/game/hustles/definitions/` and push a new plain object into the exported array (or export a helper that returns a list). Keep copy upbeat and align metrics with existing naming patterns.
2. Reference reusable requirement constants from `helpers.js` or create new ones there so UI requirement badges stay consistent.
3. If the hustle introduces bespoke daily limit rules, rely on the shared helpers (`normalizeHustleDailyUsage`, `describeDailyLimit`) so requirement chips and tooltips stay in sync.
4. Import any new definition module inside `src/game/hustles.js` and spread its results into `HUSTLES`. The index handles `createInstantHustle` calls so definition files stay data-driven.
5. For study programs, update `createKnowledgeHustles` instead—those cards live entirely inside `knowledgeHustles.js`.
6. Update docs and changelog entries to reflect new hustle themes or balancing adjustments.

## Testing Checklist
- Launch the new hustle from a fresh save to ensure requirements, metrics, and payouts resolve correctly.
- Verify the hustle appears in offline processing and daily-limit UI chips render accurate counts.
- Run `npm test` to confirm hustle registration doesn’t break save/load or progression flows.
