# Balancing Workbench

## Goal
Give economy designers a playful sandbox to test pacing changes without editing JSON by hand. The workbench keeps exploration
fast while grounding every experiment in the authoritative simulation logic.

## Player Impact
- Tighter tuning means players feel steady cash momentum and clearer upgrade payoffs throughout the opening hours.
- Designers can vet balance adjustments quickly, reducing the risk of shipping spikes that stall or trivialize progress.
- Exported charts slide straight into changelog notes so stakeholders see the before/after story at a glance.

## Key Parameters
- Starting cash, daily hours, assistant costs, and passive blog upkeep are all adjustable via sliders.
- Multipliers target the freelance writing hustle, survey sprint hustle, and the first blog's payout/expenses.
- Sensitivity scans run a short sweep of multipliers to spotlight how final-day cash responds across a given range.

## Follow-up Actions
- When the team approves a new target, update `docs/normalized_economy.json`, rerun `npm run rebuild-economy-docs`, and
  regenerate `docs/economy_sim_report_assets` with the workbench snapshot button.
- Capture notable findings in `docs/economy_sim_report.md` and the main `docs/changelog.md` entry for transparency.
