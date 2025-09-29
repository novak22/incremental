# Character Skill Progression

## Goals
- Give every action a thematic skill identity so players sense long-term mastery alongside cash flow.
- Reward repeat play with visible skill levels and an overall creator level that celebrates broad experience.
- Lay groundwork for future perks (e.g., efficiency boosts, talent trees) without changing core scheduling loops.

## Player Impact
- Instant hustles, passive asset launches, and quality pushes now grant skill experience based on the hours and cash invested.
- Each skill levels from **Novice** to **Master**, unlocking celebratory log lines that highlight specialisation progress.
- Character XP aggregates all earned skill XP and promotes the player through five creative tiers, spotlighting momentum even when dabbling across disciplines.
- Completing education tracks grants a lump-sum skill boost tied to the curriculum, making study days feel immediately valuable.
- A "Skill constellation" widget on the dashboard and education screen makes current progress visible at a glance.

## Key Systems & Tuning
- **Skill Taxonomy** – Ten skills cover the current content surface: Writing & Storycraft, Audience Engagement & Teaching, Promotion & Funnel Strategy, Market Research & Analytics, Visual Production, Editing & Post-Production, Commerce Operations & Fulfillment, Software Development & Automation, Infrastructure & Reliability, and Audio Production & Performance.
- **XP Formula** – Actions grant `round(hours * 5)` skill XP with a +1 bonus per $25 spent. Rewards are scaled by skill weightings on each action and guarantee at least 1 XP when time or cash is committed.
- **Level Thresholds** – Skill tiers unlock at 0/100/300/700/1200 XP (Novice → Master). Character levels advance at 0/300/750/1400/2200 XP with whimsical log celebrations.
- **Education Rewards** – Outline Mastery focuses on Writing, Photo Catalog splits between Visual and Editing, E-Commerce Playbook splits between Research and Commerce, and Automation Architecture leans on Software with a nod to Infrastructure.
- **State & Persistence** – Skill progress and character level are stored on the save state, auto-initialised for existing saves, and surfaced to other systems for future UI hooks.

## UI Surfacing
- The dashboard hosts a dedicated "Skill constellation" card that lists every discipline, tier, and XP-to-next marker alongside the overall creator level.
- The education tab mirrors the widget so study planning happens beside the skills it advances.

## Follow-Up Ideas
- Gate upcoming perks or narrative beats behind specific skill tiers to give mid-game targets.
- Explore assistants or upgrades that temporarily boost skill XP gain for themed playstyles.
