# Economy Quick Reference

Designers can grab the daily tuning levers here and follow the inline pointers for deeper dives. Full datasets live in `docs/normalized_economy.json` and the runtime implementations under `src/game/**`.

## Baseline Resources
- **Starting cash:** `$45` on a fresh save.
- **Daily time budget:** `14` hours until upgrades or assistants expand it.

_Source:_ `StateManager.buildBaseState()` seeds the initial money and time values, and `DEFAULT_DAY_HOURS` defines the base cap.

## Assistants at a Glance
- **Hiring cost:** `$180` per assistant.
- **Daily wage:** `$24` (derived from `$8`/hour × `3` hours).
- **Coverage:** `3` bonus hours per assistant each day; teams cap at four.

_Source:_ Assistant upgrade defaults flow from `docs/normalized_economy.json`, and `ASSISTANT_CONFIG` exposes the resolved rates used by `hireAssistant()` and payroll.

## Tier-Five Asset Snapshot
All times below are expressed in hours; upkeep costs are per in-game day.

| Asset | Setup | Maintenance | Tier 5 Payout |
| --- | --- | --- | --- |
| Personal Blog Network | 9h build, `$180` | 0.6h/day, `$3` | `$64–84` |
| Digital E-Book Series | 12h build, `$260` | 0.5h/day, `$3` | `$60–78` |
| Weekly Vlog Channel | 16h build, `$420` | 1h/day, `$9` | `$62–82` |
| Stock Photo Galleries | 20h build, `$560` | 0.8h/day, `$10` | `$112–150` |
| Dropshipping Product Lab | 24h build, `$720` | 1.1h/day, `$12` | `$130–176` |
| Micro SaaS Platform | 32h build, `$960` | 2.2h/day, `$24` | `$168–220` |

_Source:_ Values are pulled directly from `docs/normalized_economy.json` (minutes converted to hours) so designers can cross-check or extend them programmatically. For full tier ladders and modifiers, jump to `src/game/assets/definitions/*.js`.
