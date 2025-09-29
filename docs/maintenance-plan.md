# Maintenance Brief

For the full historical analysis and detailed recommendations, see the [Maintenance Review Archive](docs/archive/maintenance-review.md).

## Loop Snapshot
- Players start each day with fixed hours and cash, investing time in hustles, asset setup, upkeep, and study before ending the day.
- Passive assets only pay out when their setup is complete and upkeep is funded, making maintenance choices central to income.
- The schedule summary surfaces projected earnings, costs, and knowledge commitments so players can plan the next day at a glance.

## Top Maintenance Priorities
- Stabilize tooling so a clean clone can run tests without manual fixes, including documenting installs and adding CI coverage.
- Separate gameplay definitions from copy and ad-hoc state mutations to simplify tuning, localization, and debugging.
- Add maintenance prioritization controls so player intent guides which assets receive scarce hours when schedules overrun.

## Success Metrics
- `npm install && npm test` succeeds on a clean environment and in continuous integration.
- Designers adjust payouts, time costs, and narrative copy without editing core logic files.
- Telemetry and feedback show players using more than one early hustle path and feeling in control of upkeep trade-offs.
