# Online Hustle Simulator Economic Reference

This document enumerates every economic rule, constant, and dependency extracted directly from the source code. Each entry cites the defining implementation so that balancing work can trace every value.

## 1. Core State & Day Structure

- **Initial resources:** New games start with `$45` cash and `14` hours of available time (also the base daily time cap).【F:src/core/state.js†L107-L140】【F:src/core/constants.js†L1-L6】
- **Time capacity:** Current time cannot exceed `baseTime + bonusTime + dailyBonusTime`; gains are clamped to that cap.【F:src/game/time.js†L6-L24】
- **Spending time:** Any activity that spends hours reduces `state.timeLeft` directly; time values can go below zero, which is used to detect over-scheduling.【F:src/game/time.js†L12-L16】
- **Money mutations:** All cash additions clamp to ≥0 and emit `moneyChanged` events. Spending also clamps the balance to ≥0.【F:src/game/currency.js†L7-L47】
- **Daily maintenance buffer:** Study scheduling keeps at least `max(2, round(DEFAULT_DAY_HOURS * 0.25))` hours free for manual tasks; with the default 14-hour day this buffer is `4` hours.【F:src/game/requirements/orchestrator.js†L1-L149】

### Day Close & Maintenance Cycle

- **Maintenance allocation:** Each day, `allocateAssetMaintenance()` iterates every owned asset, applies upgrade multipliers to setup/maintenance hours, spends required time/money, applies assistant coverage, and funnels any pending income into cash before funding upkeep.【F:src/game/assets/lifecycle.js†L19-L164】
- **Day close:** `closeOutDay()` advances setup progress when prep was funded, activates finished assets, rolls daily income for maintained assets, and zeros income when upkeep was skipped.【F:src/game/assets/lifecycle.js†L166-L233】

### Assistant-Adjusted Reserve

- Manual maintenance reserve deducts available assistant hours (each adds `ASSISTANT_CONFIG.hoursPerAssistant = 3h`) before predicting remaining human time needed. Requirement descriptors surface the upkeep + daily buffer reserve, and study allocation warns when that reserve leaves no focus for enrolled tracks.【F:src/game/requirements/maintenanceReserve.js†L5-L29】【F:src/game/requirements/descriptors.js†L8-L87】【F:src/game/requirements/orchestrator.js†L1-L153】

## 2. Skill & Character Progression

- **Skill catalog:** Ten skill tracks defined in `SKILL_DEFINITIONS` underpin weighting for XP awards.【F:src/game/skills/data.js†L1-L52】
- **Skill levels:** XP thresholds per level: 0 (Novice), 100 (Apprentice), 300 (Specialist), 700 (Expert), 1200 (Master).【F:src/game/skills/data.js†L54-L87】
- **Character levels:** Overall XP thresholds: 0, 300, 750, 1400, 2200 for levels 1–5.【F:src/game/skills/data.js†L62-L100】
- **XP generation:** `TIME_XP_RATE = 5` XP/hour and `MONEY_XP_INTERVAL = 25` dollars per 1 XP. Base XP is `timeXp + floor(moneySpent / 25)` unless an explicit `baseXp` override is provided; nonzero effort always yields at least 1 XP.【F:src/game/skills/index.js†L20-L76】
- **Awarding XP:** Activities normalize their skill list weights, apply at least 1 XP per skill (`max(1, round(base * weight))`), level up skills and character, and refresh UI upon gains.【F:src/game/skills/index.js†L78-L125】【F:src/game/skills/data.js†L134-L165】

## 3. Assistants

- **Config:** Hiring costs `$180`, daily wage equals `hoursPerAssistant (3) * hourlyRate ($8) = $24`, and teams max at 4 assistants.【F:src/game/assistant.js†L12-L35】
- **Hiring:** Requires available cash and unused headcount. On hire, cash decreases by `$180`, +3 bonus hours are added (and immediately granted), costs are logged, and commerce skill XP is awarded based on money spent.【F:src/game/assistant.js†L37-L76】
- **Firing:** Reduces assistant count, removes 3 bonus hours from daily support, and deducts 3 hours from current time left (cannot go below zero in code).【F:src/game/assistant.js†L82-L99】
- **Payroll:** Every day deducts `assistantCount * 3h * $8` whether or not funds cover it; logs a warning if the balance dips below zero during payment.【F:src/game/assistant.js†L101-L131】

## 4. Knowledge Tracks & Study System

### Track Scheduling & Advancement

- **Enrollment:** Tuition (if any) is charged immediately, progress is flagged, and study time for the new track is scheduled the same day when possible.【F:src/game/requirements/orchestrator.js†L21-L83】
- **Daily allocation:** For each enrolled, incomplete track not yet studied today, the orchestrator spends `track.hoursPerDay` when focus remains after the maintenance reserve and buffer; if not, it logs how much time must be freed before study can continue.【F:src/game/requirements/orchestrator.js†L96-L153】
- **Progress:** Each studied track gains one completed day per real day studied; upon finishing all required days the track auto-completes, unenrolls, and awards the configured skill XP (once).【F:src/game/requirements/orchestrator.js†L165-L229】
- **Knowledge state defaults:** Tracks store total days, hours/day, tuition, completion flags, and enrollment metadata per entry.【F:src/game/requirements/knowledgeProgress.js†L1-L24】

### Education Bonuses

- **Instant hustle boosts:** Completing tracks unlocks flat or multiplier bonuses enumerated per hustle; multipliers add to 1 (i.e., `1 + amount`), flats add additive dollars before upgrade multipliers.【F:src/game/educationEffects.js†L1-L141】
- **Asset income boosts:** Completed tracks also grant asset multipliers or flats using the same formula (`total = base * (1 + sumMultipliers) + sumFlats`).【F:src/game/educationEffects.js†L142-L174】

### Knowledge Track Catalog

Each entry lists the mandatory study load and instant bonuses (flat dollars or multiplier percentages). All bonuses only apply after the track shows `completed = true`.【F:src/game/requirements/data/knowledgeTracks.js†L1-L368】

| Track ID | Hours/Day | Days | Tuition | Bonuses |
| --- | --- | --- | --- | --- |
| storycraftJumpstart | 4 | 3 | $0 | Blog income +5% (multiplier). |
| vlogStudioJumpstart | 4 | 3 | $0 | Vlog income +5%. |
| digitalShelfPrimer | 4 | 3 | $0 | E-book +5%, Stock Photos +5%. |
| commerceLaunchPrimer | 4 | 3 | $0 | Dropshipping +5%. |
| microSaasJumpstart | 4 | 3 | $0 | SaaS +5%. |
| outlineMastery | 2 | 5 | $140 | Freelance payout +25%; Audiobook payout +15%. |
| photoLibrary | 1.5 | 4 | $95 | Event Photo Gig payout +20%. |
| ecomPlaybook | 3 | 9 | $900 | Bundle Promo Push +$5 flat; Dropshipping +15%. |
| automationCourse | 6 | 15 | $3000 | SaaS Bug Squash +$6 flat; SaaS +15%. |
| brandVoiceLab | 1 | 4 | $120 | Audience Call +$4 flat. |
| guerillaBuzzWorkshop | 1.5 | 6 | $180 | Street Promo Sprint +25%; Survey Sprint +$1.5 flat. |
| curriculumDesignStudio | 2.5 | 6 | $280 | Pop-Up Workshop +30%; Bundle Push +15%. |
| postProductionPipelineLab | 4 | 10 | $900 | Vlog Edit Rush +25%; Vlog income +15%. |
| fulfillmentOpsMasterclass | 4 | 10 | $1200 | Dropship Pack Party +20%; Dropshipping +25%. |
| customerRetentionClinic | 3 | 7 | $1000 | SaaS Bug Squash +$5 flat; SaaS +20%. |
| narrationPerformanceWorkshop | 3 | 7 | $900 | Audiobook Narration +25%; E-book +10%. |
| galleryLicensingSummit | 4 | 8 | $1100 | Event Photo Gig +20%; Stock Photos +15%. |
| syndicationResidency | 4 | 9 | $1000 | Freelance +15%; Street Promo Sprint +$2 flat; Blog +12%. |

### Knowledge Track Rewards

Completing tracks grants base XP and skill splits as defined below. Weighted skill entries award `weight * baseXp` rounded in `awardSkillProgress`.【F:src/game/requirements/knowledgeTracks.js†L5-L102】

| Track | Base XP | Skill Split |
| --- | --- | --- |
| storycraftJumpstart | 120 | Writing 100%. |
| vlogStudioJumpstart | 120 | Visual 100%. |
| digitalShelfPrimer | 120 | Editing 100%. |
| commerceLaunchPrimer | 120 | Commerce 100%. |
| microSaasJumpstart | 120 | Software 100%. |
| outlineMastery | 120 | Writing 100%. |
| photoLibrary | 120 | Visual 50%, Editing 50%. |
| ecomPlaybook | 120 | Research 50%, Commerce 50%. |
| automationCourse | 120 | Software 60%, Infrastructure 40%. |
| brandVoiceLab | 100 | Audience 60%, Promotion 40%. |
| guerillaBuzzWorkshop | 110 | Promotion 60%, Audience 40%. |
| curriculumDesignStudio | 150 | Audience 60%, Writing 40%. |
| postProductionPipelineLab | 150 | Editing 70%, Visual 30%. |
| fulfillmentOpsMasterclass | 140 | Commerce 70%, Promotion 30%. |
| customerRetentionClinic | 140 | Audience 40%, Promotion 30%, Software 30%. |
| narrationPerformanceWorkshop | 130 | Audio 60%, Writing 40%. |
| galleryLicensingSummit | 140 | Visual 60%, Commerce 40%. |
| syndicationResidency | 150 | Promotion 50%, Audience 30%, Writing 20%. |

## 5. Hustles

### Hustle Contract Market

- **Action wrapper:** `createInstantHustle` still governs run-time costs, requirements, and XP awards, but the definitions now expose a `market` block that seeds the contract exchange with slots, max-active caps, default progress hints, and payout metadata while defaulting accepted offers to manual progress so to-do entries appear immediately.【F:src/game/content/schema/assetActions.js†L1-L206】【F:src/game/hustles/definitions/instantHustles.js†L19-L407】
- **Variant metadata:** Each hustle template publishes multiple variants with explicit `hoursPerDay`, `daysRequired`, `copies`, and `payoutSchedule` values so the market can roll simultaneous copies and longer-running contracts without mutating the base definition.【F:src/game/hustles/definitions/instantHustles.js†L28-L407】
- **Rolling logic:** `rollDailyOffers` preserves unexpired offers, respects variant capacity, records audit summaries, and attaches browser debug helpers (`window.__HUSTLE_MARKET_DEBUG__`) so designers can inspect active windows during playtests.【F:src/game/hustles/market.js†L29-L210】【F:src/game/hustles/market.js†L375-L713】
- **Audit telemetry:** Every roll appends an entry to `getMarketRollAuditLog()` and `window.__HUSTLE_MARKET_AUDIT__`, capturing day, preserved vs. new offers, and per-template reasons whenever slots stay empty.【F:src/game/hustles/market.js†L12-L83】【F:src/game/hustles/market.js†L662-L713】

### Contract Catalog

Contract variants replace the old single-run catalog. Each entry below lists the available offerings with duration windows (duration days + 1 equals the full availability window), expected daily effort, payout schedule, and how many copies can appear per roll.

- **Freelance Writing** – Same-day rush (2h, on-completion, 2 copies), three-part mini series (3 days × 2h, $45 on completion), and a retainer column block (4 days × 2h, $80 on completion, unlocks after one day).【F:src/game/hustles/definitions/instantHustles.js†L19-L89】
- **Audience Q&A Blast** – Flash AMA (1h, on-completion, 2 copies), two-part mini workshop (2 days × 1h, $24), and a coaching cohort (3 days × 1.5h, $40 after one-day delay).【F:src/game/hustles/definitions/instantHustles.js†L91-L164】
- **Bundle Promo Push** – Flash sale blast (1 day, 2.5h), cross-promo roadshow (3 days × 2h, $72), and an evergreen funnel revamp (5 days × 2.5h, $120, delayed start).【F:src/game/hustles/definitions/instantHustles.js†L166-L239】
- **Micro Survey Dash** – Coffee break surveys (0.25h, three copies), panel follow-ups (2 days × 0.5h, $3, two copies), and a report sprint (3 days × 0.75h, $5, unlocks after a day).【F:src/game/hustles/definitions/instantHustles.js†L241-L317】
- **Event Photo Gig** – Pop-up shoot (single day, 3.5h), weekend retainer (3 days × 3h, $120), and tour documentary (5 days × 3h, $180 after a one-day delay).【F:src/game/hustles/definitions/instantHustles.js†L319-L393】
- **Pop-Up Workshop** – Evening intensive (2.5h, 2 copies), weekend cohort (2 days × 2.5h, $60), and mentor track (4 days × 2h, $95, delayed start).【F:src/game/hustles/definitions/instantHustles.js†L395-L469】
- **Vlog Edit Rush** – Rush cut (1.5h, 2 copies), batch edit package (2 days × 1.5h, $40), and season launch sprint (4 days × 1.75h, $70 after one-day delay).【F:src/game/hustles/definitions/instantHustles.js†L471-L545】
- **Dropship Pack Party** – Flash pack party (2h, 2 copies), weekend surge (2 days × 2.5h, $50), and subscription assembly (4 days × 2.5h, $90 after one-day delay).【F:src/game/hustles/definitions/instantHustles.js†L547-L624】
- **SaaS Bug Squash** – Hotfix call (1h, 2 copies), stability hardening (2 days × 1.25h, $55), and reliability sprint (4 days × 1.5h, $90 with a day of lead time).【F:src/game/hustles/definitions/instantHustles.js†L626-L701】
- **Audiobook Narration** – Sample session (2.75h), featured volume marathon (2 days × 2.5h, $70), and series finale production (5 days × 2.5h, $120 after a day).【F:src/game/hustles/definitions/instantHustles.js†L703-L778】
- **Street Team Promo** – Lunch rush pop-up (0.75h, 3 copies), night market takeover (2 days × 1h, $32), and festival street team (4 days × 1.25h, $60 after a day).【F:src/game/hustles/definitions/instantHustles.js†L780-L855】

### Knowledge Hustles (Study Cards)

Each knowledge track also exposes a “Study” card whose action enrolls the course (time cost 0, money cost equals tuition) and defers to the orchestrator for ongoing study time. Card text reflects enrollment status and bonuses.【F:src/game/hustles/knowledgeHustles.js†L1-L116】

## 6. Asset Systems

### Asset Income Pipeline

1. **Quality range:** Each asset instance references its current quality level to derive `[min,max]` income bounds.【F:src/game/assets/payout.js†L12-L37】
2. **Random roll:** Daily income equals `round(min + rand() * (max - min))` before modifiers.【F:src/game/assets/payout.js†L16-L20】
3. **Definition modifiers:** Optional custom modifiers can override the amount and contribute labeled breakdown entries.【F:src/game/assets/payout.js†L32-L86】
4. **Events & niches:** Active niche multipliers, scripted events, and education bonuses apply sequentially, all tracked for UI breakdowns.【F:src/game/assets/payout.js†L88-L147】
5. **Upgrade multipliers:** Asset upgrades with `payout_mult` multiply the final amount via chained factors; deltas are stored per source.【F:src/game/assets/payout.js†L169-L198】
6. **Rounding & storage:** Amounts round to whole dollars; breakdown entries track adjustments and are cached on the instance.【F:src/game/assets/payout.js†L148-L213】

Missing upkeep zeroes the day’s payout, clears the breakdown, and logs a warning.【F:src/game/assets/lifecycle.js†L211-L233】

### Asset Catalogue

Each asset shares common fields: setup (`days`, `hoursPerDay`, `cost`), maintenance (`hours`, `cost`), base income (`base`, `variance`), requirements, quality tiers (income min/max per tier), and quality actions that advance progress once per day. Tables below summarize the numeric levers.

#### Personal Blog Network (`blog`)

- **Setup:** 3 days × 3h, $180 cost. Maintenance: 0.6h/day, $3/day.【F:src/game/assets/definitions/blog.js†L5-L33】
- **Income:** Base 30, variance 0.2 (quality table defines min/max payouts).【F:src/game/assets/definitions/blog.js†L20-L70】
- **Quality Levels:**
  - 0: $3–6, no requirements.
  - 1: $9–15, requires 3 posts.
  - 2: $16–24, requires 9 posts & 2 SEO sprints.
  - 3: $30–42, requires 18 posts, 5 SEO, 3 outreach.
  - 4: $46–62, requires 28 posts, 9 SEO, 6 outreach.
  - 5: $64–84, requires 40 posts, 14 SEO, 10 outreach.【F:src/game/assets/definitions/blog.js†L29-L70】
- **Quality Actions:** Write Post (3h, 1/day), SEO Sprint (2h + $16), Backlink Outreach (1.5h + $16).【F:src/game/assets/definitions/blog.js†L72-L111】

#### Digital E-Book Series (`ebook`)

- **Setup:** 4 days × 3h, $260. Maintenance: 0.5h, $3.【F:src/game/assets/definitions/ebook.js†L5-L33】
- **Requirement:** Complete `outlineMastery` knowledge track.【F:src/game/assets/definitions/ebook.js†L20-L24】
- **Quality Levels:**
  - 0: $3–6.
  - 1: $12–20 (6 chapters).
  - 2: $20–30 (12 chapters, 1 cover).
  - 3: $30–42 (18 chapters, 2 covers, 6 reviews).
  - 4: $44–58 (24 chapters, 3 covers, 10 reviews).
  - 5: $60–78 (32 chapters, 4 covers, 16 reviews).【F:src/game/assets/definitions/ebook.js†L25-L68】
- **Actions:** Write Chapter (2.5h), Commission Cover (1.5h + $60), Rally Reviews (1.25h + $10).【F:src/game/assets/definitions/ebook.js†L69-L109】

#### Weekly Vlog Channel (`vlog`)

- **Setup:** 4 days × 4h, $420. Maintenance: 1h, $9.【F:src/game/assets/definitions/vlog.js†L5-L32】
- **Requirement:** Camera upgrade owned (`equipment: ['camera']`).【F:src/game/assets/definitions/vlog.js†L20-L24】
- **Quality Levels:**
  - 0: $2–5.
  - 1: $12–20 (4 episodes).
  - 2: $20–30 (10 episodes, 4 edits).
  - 3: $32–40 (18 episodes, 7 edits, 5 promos).
  - 4: $45–58 (26 episodes, 11 edits, 9 promos).
  - 5: $62–82 (38 episodes, 16 edits, 14 promos).【F:src/game/assets/definitions/vlog.js†L25-L82】
- **Actions:** Film Episode (5h), Polish Edit (2.5h + $16), Promo Blast (2h + $24).【F:src/game/assets/definitions/vlog.js†L83-L124】

#### Stock Photo Galleries (`stockPhotos`)

- **Setup:** 5 days × 4h, $560. Maintenance: 0.8h, $10.【F:src/game/assets/definitions/stockPhotos.js†L5-L32】
- **Requirements:** Equipment `['camera','studio']` plus `photoLibrary` track completion.【F:src/game/assets/definitions/stockPhotos.js†L20-L27】
- **Quality Levels:**
  - 0: $8–14.
  - 1: $18–30 (4 shoots).
  - 2: $34–52 (10 shoots, 4 edits).
  - 3: $54–78 (16 shoots, 7 edits, 5 marketing pushes).
  - 4: $80–108 (24 shoots, 11 edits, 9 marketing).
  - 5: $112–150 (36 shoots, 16 edits, 14 marketing).【F:src/game/assets/definitions/stockPhotos.js†L28-L71】
- **Actions:** Plan Shoot (3.5h + $22), Batch Edit (2h + $14), Run Promo (2h + $16).【F:src/game/assets/definitions/stockPhotos.js†L72-L113】

#### Dropshipping Product Lab (`dropshipping`)

- **Setup:** 6 days × 4h, $720. Maintenance: 1.1h, $12.【F:src/game/assets/definitions/dropshipping.js†L5-L33】
- **Requirements:** Complete `ecomPlaybook` track; own ≥2 blogs and ≥1 e-book (experience).【F:src/game/assets/definitions/dropshipping.js†L19-L27】
- **Quality Levels:**
  - 0: $12–20.
  - 1: $24–38 (4 research runs).
  - 2: $44–62 (11 research, 5 listings).
  - 3: $68–92 (18 research, 8 listings, 7 ads).
  - 4: $95–128 (26 research, 12 listings, 10 ads).
  - 5: $130–176 (38 research, 18 listings, 16 ads).【F:src/game/assets/definitions/dropshipping.js†L25-L70】
- **Actions:** Research Product (3h), Optimize Listing (1.8h + $28), Experiment With Ads (2.2h + $34).【F:src/game/assets/definitions/dropshipping.js†L71-L112】

#### Micro SaaS Platform (`saas`)

- **Setup:** 8 days × 4h, $960. Maintenance: 2.2h, $24.【F:src/game/assets/definitions/saas.js†L5-L33】
- **Requirements:** Complete `automationCourse`, own `serverCluster` equipment, and have ≥1 Dropshipping & ≥1 E-book active instances.【F:src/game/assets/definitions/saas.js†L19-L31】
- **Quality Levels:**
  - 0: $20–32.
  - 1: $32–48 (4 features).
  - 2: $54–74 (12 features, 5 stability).
  - 3: $84–120 (24 features, 8 stability, 6 marketing).
  - 4: $120–168 (34 features, 12 stability, 10 marketing, 4 edge).
  - 5: $168–220 (48 features, 18 stability, 15 marketing, 8 edge).【F:src/game/assets/definitions/saas.js†L25-L76】
- **Actions:** Ship Feature (3.2h + $28), Improve Stability (2.5h + $36), Launch Campaign (2.5h + $44), Deploy Edge Nodes (3h + $64, requires `serverEdge`).【F:src/game/assets/definitions/saas.js†L77-L131】

### Asset Messages & Logs

While not economic levers, setup/income log messages include no additional formulas and serve purely for UI feedback; thus omitted from tuning references.

## 7. Upgrades & Support Items

All upgrades are defined using `createUpgrade`, supporting cost, requirements, slot provide/consume maps, and effect dictionaries (`setup_time_mult`, `payout_mult`, `maint_time_mult`, `quality_progress_mult`). Slots gate exclusivity groups (e.g., phone tiers). Purchase buttons use hooks for behavior when specified.

### Support: Turbo Coffee

- **Turbo Coffee (`coffee`):** Repeatable boost costing $40 that grants +1 hour for the current day; usage per day capped at `COFFEE_LIMIT = 3`. UI disables when limit hit or no time remains.【F:src/game/upgrades/definitions/support.js†L1-L17】【F:src/game/upgrades/coffeeBehavior.js†L1-L18】【F:src/core/constants.js†L1-L6】

### House Upgrades

| ID | Cost | Requirements | Effects |
| --- | --- | --- | --- |
| studio | $220 | Exclusive `house:lighting` slot | `maint_time_mult: 0.9` for photo/video asset maintenance actions (unlock Stock Photo).【F:src/game/upgrades/definitions/house.js†L1-L24】
| studioExpansion | $540 | Requires `studio`; exclusive `house:studio` | `setup_time_mult: 0.85`, `payout_mult: 1.15`, `quality_progress_mult: 2` for photo/video assets and photo hustles.【F:src/game/upgrades/definitions/house.js†L25-L47】

### Infrastructure Upgrades

Key automation and tech infrastructure modifiers.【F:src/game/upgrades/definitions/infra.js†L1-L200】

| ID | Cost | Requirements | Effects |
| --- | --- | --- | --- |
| assistant | $0 | Repeatable | Managed via `assistantHooks`; adds hire/fire controls (see Assistants). |
| serverRack | $650 | None | `setup_time_mult: 0.95` for software/tech assets & hustles (setup actions). |
| fulfillmentAutomation | $780 | Active dropshipping ≥2, completed `ecomPlaybook` | Dropshipping `payout_mult: 1.25`, `quality_progress_mult: 2`. |
| serverCluster | $1150 | Requires `serverRack` | SaaS `payout_mult: 1.2`, `quality_progress_mult: 1.5`. |
| globalSupplyMesh | $1150 | `fulfillmentAutomation`, active dropshipping ≥3, completed `photoLibrary` | Dropshipping `payout_mult: 1.3`, `quality_progress_mult: 1.5`, `setup_time_mult: 0.92`; applies to commerce/photo hustles. |
| serverEdge | $1450 | Requires `serverCluster` | SaaS `payout_mult: 1.35`, `quality_progress_mult: 2`, `maint_time_mult: 0.85`. |
| whiteLabelAlliance | $1500 | `globalSupplyMesh`, active dropshipping ≥4, completed `ecomPlaybook` & `photoLibrary` | Dropshipping & Stock Photos `payout_mult: 1.35`, `quality_progress_mult: 4/3`. |

### Technology Gear Upgrades

Each tech family has mutually exclusive tiers sharing `exclusivityGroup` slots. All entries referenced below are defined in their respective files.【F:src/game/upgrades/definitions/tech/phones.js†L1-L40】【F:src/game/upgrades/definitions/tech/pcs.js†L1-L63】【F:src/game/upgrades/definitions/tech/monitors.js†L1-L60】 etc.

#### Creator Phones

| ID | Cost | Requirements | Effects |
| --- | --- | --- | --- |
| creatorPhone | $140 | None | `setup_time_mult: 0.95` for live/field hustles and video assets. |
| creatorPhonePro | $360 | creatorPhone | `setup_time_mult: 0.85`, `payout_mult: 1.05` for same targets. |
| creatorPhoneUltra | $720 | creatorPhonePro | `setup_time_mult: 0.8`, `payout_mult: 1.08`. |

#### Studio PCs

| ID | Cost | Requirements | Effects |
| --- | --- | --- | --- |
| studioLaptop | $280 | None | `setup_time_mult: 0.92` for desktop_work assets/hustles. |
| editingWorkstation | $640 | studioLaptop | `setup_time_mult: 0.85`, `maint_time_mult: 0.9` for desktop_work/video assets. |
| quantumRig | $1280 | editingWorkstation | `payout_mult: 1.12`, `maint_time_mult: 0.85` for desktop_work/software/video assets. |

#### Monitor Suite

| ID | Cost | Requirements | Effects |
| --- | --- | --- | --- |
| monitorHub | $180 | None | Provides 2 monitor slots; `setup_time_mult: 0.95` desktop_work setup. |
| dualMonitorArray | $240 | monitorHub, consumes 1 slot | `quality_progress_mult: 1.2` for desktop_work/video assets. |
| colorGradingDisplay | $380 | dualMonitorArray, consumes 1 slot | `quality_progress_mult: 1.3` for video/photo assets. |

#### Camera Equipment

| ID | Cost | Requirements | Effects |
| --- | --- | --- | --- |
| camera | $200 | None | Unlocks vlog/stock photo assets; `setup_time_mult: 0.9` for photo/video setups.【F:src/game/upgrades/definitions/tech/cameras.js†L1-L24】 |
| cameraPro | $480 | camera | `setup_time_mult: 0.85`, `maint_time_mult: 0.85`, `payout_mult: 1.25`, `quality_progress_mult: 2` for photo/video assets and actions.【F:src/game/upgrades/definitions/tech/cameras.js†L26-L60】 |

#### Audio Suite

Single upgrade: `audioSuite` costs $420 and multiplies quality progress by 1.4 for audio/video assets.【F:src/game/upgrades/definitions/tech/audio.js†L1-L18】

#### Ergonomics & Environment

- `ergonomicRefit` costs $180 and multiplies desktop_work maintenance time by 0.95.【F:src/game/upgrades/definitions/tech/ergonomics.js†L1-L17】
- `fiberInternet` costs $260 and multiplies maintenance time by 0.9 for video/software assets and live/software hustles.【F:src/game/upgrades/definitions/tech/network.js†L1-L18】
- `backupPowerArray` costs $260 and multiplies maintenance time by 0.95 for desktop_work/video assets.【F:src/game/upgrades/definitions/tech/power.js†L1-L17】
- `scratchDriveArray` costs $320 and multiplies maintenance time by 0.9 for video/photo/software assets.【F:src/game/upgrades/definitions/tech/storage.js†L1-L17】

#### Workflow Automation

| ID | Cost | Requirements | Effects |
| --- | --- | --- | --- |
| editorialPipeline | $360 | Course upgrade, active blog, completed Outline Mastery | `setup_time_mult: 0.88`, `payout_mult: 1.2`, `quality_progress_mult: 1.5` for writing/content assets and writing hustles.【F:src/game/upgrades/definitions/tech/workflow.js†L1-L55】 |
| syndicationSuite | $720 | editorialPipeline, active blog & e-book, completed Brand Voice Lab | `maint_time_mult: 0.9`, `payout_mult: 1.25`, `quality_progress_mult: 4/3` for writing/content/video assets and writing/marketing hustles.【F:src/game/upgrades/definitions/tech/workflow.js†L56-L119】 |
| immersiveStoryWorlds | $1080 | syndicationSuite, active blog/e-book/vlog, completed Outline Mastery & Brand Voice Lab | `payout_mult: 1.12`, `setup_time_mult: 0.85`, `quality_progress_mult: 2` for writing/video/photo assets.【F:src/game/upgrades/definitions/tech/workflow.js†L120-L188】 |
| course | $260 | Active blog | `payout_mult: 1.5`, `quality_progress_mult: 2` for blog assets.【F:src/game/upgrades/definitions/tech/workflow.js†L192-L223】 |

#### Course Card Lock Behavior

The workflow `course` upgrade ties into `courseHooks`, which locks its card unless at least one blog is active prior to purchase.【F:src/game/upgrades/courseBehavior.js†L1-L11】

## 8. Knowledge & Hustle Interactions

- Hustle education bonuses stack additively (multipliers add to 1, flats add outright) before upgrade multipliers; card details include unlocked bonus descriptions drawn from the same data set.【F:src/game/educationEffects.js†L1-L174】【F:src/game/content/schema/assetActions.js†L153-L206】
- Completing knowledge tracks can also unlock asset requirements (e.g., E-commerce Playbook required before Dropshipping setup).【F:src/game/assets/definitions/dropshipping.js†L19-L27】

## 9. Open Questions

- Asset event hooks (`applyIncomeEvents`, `maybeTriggerAssetEvents`) may modify payouts via dynamic content not included in the static definitions; those event scripts should be reviewed separately to capture live modifiers if balancing requires them.【F:src/game/assets/payout.js†L4-L125】

