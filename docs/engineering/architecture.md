# Architecture guardrails

## UI coupling monitor
We track how often UI modules reach directly into the `game/` and `core/` layers. High counts
increase the risk of tightly coupled features that are difficult to refactor. The `scripts/check-coupling.mjs`
helper wraps [`madge`](https://github.com/pahen/madge) to generate a dependency graph and tallies every
UI → game/core edge. The current baseline lives in `scripts/coupling-baseline.json` and defines both the
recorded edge count and the maximum allowed growth before CI fails.

## When the check fails
1. Re-run the guard locally with `npm run check:coupling` to confirm the failure and review the list of
   noisiest sources/targets printed by the script.
2. Open the flagged UI modules and identify why they need direct access to `core` or `game` internals.
   In many cases, formatting or light aggregation code has drifted into UI helpers.
3. Move heavy lifting into view-model modules inside `src/game/` or `src/ui/**/model/`. These modules
   should expose pre-digested data structures that the UI can render without reaching deeper layers.
4. Prefer exporting formatting/selector helpers from a shared UI utility instead of importing from
   `core/helpers.js` or `core/state.js` in multiple places. Centralizing these adapters turns dozens of
   imports into a single, well-audited edge.
5. After reducing the edge count, run `npm run check:coupling` again to make sure it now passes. Commit
   the code and keep the baseline untouched.

## Adjusting the baseline
Only update `scripts/coupling-baseline.json` when architecture work intentionally raises the steady-state
edge count (for example, introducing a new view-model pipeline). Document the rationale in the associated
pull request and capture the new total in the baseline file. Favor lowering the threshold after large
refactors so that the trend line keeps moving downward instead of locking in regressions.
