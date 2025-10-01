# Maintenance Brief

## Loop Snapshot
- Players juggle daily hours across hustles, upkeep, automation, and study; assets only pay when setup and upkeep are funded.
- Morning automation reserves upkeep first and keeps a manual buffer so players retain agency each day.
- The schedule summary projects earnings, costs, and knowledge commitments to plan the next day quickly.

## Top Maintenance Priorities
- Keep onboarding smooth by documenting install steps and adding CI coverage for `npm install && npm test`.
- Separate gameplay definitions from copy and ad-hoc mutations so designers can rebalance without touching engine code.
- Provide prioritization controls for directing upkeep when schedules overrun.

## Success Metrics
- Fresh environments pass `npm install && npm test` without manual fixes.
- Designers tweak payouts, durations, and copy without editing core logic files.
- Telemetry shows players exploring multiple early hustle paths while feeling in control of upkeep trade-offs.
