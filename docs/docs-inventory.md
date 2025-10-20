# Documentation Inventory

Tags: **keep** (stays as-is), **compress** (candidate for future trimming), **archive** (stored outside the slim handbook, safe to remove if space tight).

## Economy References
| Path | Tag | Notes |
| --- | --- | --- |
| `docs/economy-quickref.md` | keep | Condensed daily tuning numbers for designers. |
| `docs/normalized_economy.json` | keep | Canonical dataset powering runtime economy math. |
| `docs/archive/economy/economy.md` | archive | Legacy deep dive; replace with quickref + source links. |
| `docs/archive/economy/EconomySpec.md` | archive | Redundant with normalized JSON; kept only for historical prose. |
| `docs/archive/economy/EconomySpec.appendix.md` | archive | Generated tables moved out of the main handbook. |
| `docs/archive/economy/economy_sim_report.md` | archive | Simulation narrative retained for reference if we regenerate charts later. |
| `docs/archive/economy_sim_report_assets/assistant_summary.csv` | archive | Historical export from the balancing workbench. |
| `docs/archive/economy_sim_report_assets/baseline_daily_cashflow.csv` | archive | Historical export from the balancing workbench. |
| `docs/archive/economy_sim_report_assets/education_roi.csv` | archive | Historical export from the balancing workbench. |
| `docs/archive/economy_sim_report_assets/assistant_sustainability.svg` | archive | Legacy visualization kept offline. |
| `docs/archive/economy_sim_report_assets/cash_vs_time_exponential.svg` | archive | Legacy visualization kept offline. |
| `docs/archive/economy_sim_report_assets/daily_cashflow.svg` | archive | Legacy visualization kept offline. |
| `docs/archive/economy_sim_report_assets/education_roi.svg` | archive | Legacy visualization kept offline. |

## Features & Playtests
| Path | Tag | Notes |
| --- | --- | --- |
| `docs/features/overview.md` | keep | Live index pointing straight to implementation modules. |
| `docs/features/playtest-scripts.md` | keep | Consolidated QA scripts for recurring regression passes. |

## Contributor Guides
| Path | Tag | Notes |
| --- | --- | --- |
| `docs/changelog.md` | keep | Historical release notes; keep for context. |
| `docs/content-authoring.md` | keep | Author workflow remains relevant to the narrative tooling. |
| `docs/maintenance-plan.md` | compress | Still useful but repetitive; trim after the handbook stabilizes. |
| `docs/ui/browser-styles.md` | keep | Single-page reference for UI theming. |

## Archived Feature Briefs
| Path | Tag | Notes |
| --- | --- | --- |
| `docs/archive/features/action-instances.md` | archive | Superseded by runtime registry comments. |
| `docs/archive/features/action-progress-overhaul.md` | archive | Historical rationale only. |
| `docs/archive/features/action-provider-registry.md` | archive | Registry now self-documented in code. |
| `docs/archive/features/action-templates.md` | archive | Replaced by action factories in `src/game/actions/`. |
| `docs/archive/features/balancing-workbench.md` | archive | Tool walkthrough retained for posterity. |
| `docs/archive/features/blogpress-metrics.md` | archive | KPI logic now covered by workspace source. |
| `docs/archive/features/browser-widget-layout-manager.md` | archive | Layout behavior tracked directly in `src/ui/layout/`. |
| `docs/archive/features/browser-widget-reorder-mode.md` | archive | Drag-and-drop rules live in `src/ui/dashboard/`. |
| `docs/archive/features/developer-state-explorer.md` | archive | Debug overlays described inline in dev-only modules. |
| `docs/archive/features/downwork-hiring.md` | archive | Assistant flow documented in the quickref + code. |
| `docs/archive/features/hustle-market-alignment-plan.md` | archive | Strategy doc; replaced by module links. |
| `docs/archive/features/hustle-market-playtest.md` | archive | Checklist merged into `docs/features/playtest-scripts.md`. |
| `docs/archive/features/hustle-market.md` | archive | Design exposition superseded by quickref + code pointers. |
| `docs/archive/features/loading-screen.md` | archive | Keep for art direction history only. |
| `docs/archive/features/manual-study-tracking.md` | archive | Manual workflow now described by orchestrator comments. |
| `docs/archive/features/niche-popularity-snapshots.md` | archive | Audience modeling recorded in code comments. |
| `docs/archive/features/quality-action-celebrations.md` | archive | Celebration copy handled in UI components. |
| `docs/archive/features/quick-actions-timodoro.md` | archive | Quick action helpers referenced in code. |
| `docs/archive/features/session-management.md` | archive | Session flows summarized in the overview. |
| `docs/archive/features/session-switcher-guardrails.md` | archive | Manual QA steps migrated to playtest scripts. |
| `docs/archive/features/todo-timeline.md` | archive | Timeline rules captured in `src/ui/dashboard/`. |
| `docs/archive/features/visits-simulation.md` | archive | Historical design context only. |
