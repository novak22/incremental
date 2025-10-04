# Feature Overview

This directory now tracks the playable pillars only. Each entry notes the intent, the systems it relies on, and the state of follow-up work so agents can triage quickly.

| Pillar | Purpose | Key Systems | Follow-ups |
| --- | --- | --- | --- |
| Browser Shell | Tabbed chrome that swaps between home and app workspaces. | Modular styles (`styles/base`, `styles/components`), workspace presenters, notification feed. | Track any new workspace with a single presenter + stylesheet pair. |
| Dashboard Widgets | Three-column home with ToDo list, cash snapshot, and quick-launch tiles. | Widgets in `styles/widgets`, ToDo scheduler, arrangement mode. | Keep widgets lightweight; retire unused tiles before adding more. |
| Knowledge Apps | Learnly catalog plus Free Courses unlock flow. | Course definitions, study scheduling, education bonuses. | Ensure new courses declare bonuses and durations in schema builders. |
| Commerce & Media Apps | BlogPress, VideoTube, Shopily, DigiShelf, ServerHub share KPI grids and detail panes. | Passive asset economy, shared KPI components, asset detail presenters. | Align any new asset with existing KPI card structure. |
| Finance Loop | BankApp ledger + notifications keep payouts and upkeep visible. | BankApp workspace, shared notification bell, daily ledger. | Verify new income sources emit ledger entries before shipping. |
| Productivity Tools | TimoDoro consolidates tasks and daily summaries. | Hustle tracking, time allocation, schedule summaries. | Surface new hustle types through the Task Log categories. |
| Events | Random events handle multi-day boosts and setbacks. | Event engine, passive asset modifiers. | Reuse boost templates; avoid bespoke timers. |

Keep feature docs short—if a change needs deeper explanation, link to the relevant source file or open a design RFC elsewhere.
