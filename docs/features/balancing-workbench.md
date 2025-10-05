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
- Asset roster & upgrade picks live in the sidebar: select any mix of assets and layer on upgrades to see their combined upkeep and payouts.
- Multipliers target the freelance writing hustle, survey sprint hustle, and the first blog's payout/expenses, and now stack with upgrade modifiers.
- Sensitivity scans run a short sweep of multipliers to spotlight how final-day cash responds across a given range.

## Recent Enhancements
- The workbench previews the daily setup/maintenance load for every selected asset, including upgrade-provided bonuses.
- Upgrade choices apply their full modifier set across assets, hustles, and bonus time so designers can model late-game automation plans.
- Hustle and time bonuses are summarized inline, making it easier to narrate how a build achieves a given cashflow profile.

## Follow-up Actions
- When the team approves a new target, update `docs/normalized_economy.json`, rerun `npm run rebuild-economy-docs`, and
  regenerate `docs/economy_sim_report_assets` with the workbench snapshot button.
- Capture notable findings in `docs/economy_sim_report.md` and the main `docs/changelog.md` entry for transparency.
