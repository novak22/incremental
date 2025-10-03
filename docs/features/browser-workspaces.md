# Browser Workspace Reference

## Overview
This note captures the shared UI expectations for the browser-based workspaces and the module-specific requirements for ServerHub, VideoTube, Shopily, and Learnly. It details the views, state, handlers, and primary layout regions, highlights common affordances, and proposes a configuration schema capable of expressing all four experiences.

## Module Breakdown

### ServerHub Cloud Console
- **Views**: `apps` (default), `upgrades`, and `pricing`, switched with presenter state and header buttons.【F:src/ui/views/browser/components/serverhub.js†L33-L43】【F:src/ui/views/browser/components/serverhub.js†L129-L193】【F:src/ui/views/browser/components/serverhub.js†L840-L872】
- **State Fields**: `view` and `selectedAppId`, maintained by the workspace presenter and `ensureSelectedApp` helper.【F:src/ui/views/browser/components/serverhub.js†L33-L104】
- **Primary Handlers**: `setView`, `selectApp`, `handleLaunch` (with launch confirmation), `handleQuickAction`, and `handleNicheSelect` control navigation, launching, quality actions, and niche assignment.【F:src/ui/views/browser/components/serverhub.js†L83-L127】
- **Layout Regions**:
  - Header with title, action buttons (launch, pricing, upgrades), and optional setup meta badge.【F:src/ui/views/browser/components/serverhub.js†L129-L193】
  - KPI belt summarizing hero metrics.【F:src/ui/views/browser/components/serverhub.js†L195-L227】
  - Nav tabs for the three views.【F:src/ui/views/browser/components/serverhub.js†L840-L872】
  - View bodies: app table plus detail sidebar, upgrade grid, and pricing cards respectively.【F:src/ui/views/browser/components/serverhub.js†L247-L402】【F:src/ui/views/browser/components/serverhub.js†L608-L760】【F:src/ui/views/browser/components/serverhub.js†L701-L760】【F:src/ui/views/browser/components/serverhub.js†L772-L836】

### VideoTube Studio
- **Views**: `dashboard`, `detail`, `create`, and `analytics`, selectable via masthead nav tabs.【F:src/ui/views/browser/components/videotube.js†L13-L120】【F:src/ui/views/browser/components/videotube.js†L709-L720】
- **State Fields**: `view` and `selectedVideoId`, managed through the presenter’s state machine and `ensureSelectedVideo` selection guard.【F:src/ui/views/browser/components/videotube.js†L27-L51】【F:src/ui/views/browser/components/videotube.js†L747-L754】
- **Primary Handlers**: `setView`, `handleQuickAction`, `handleNicheSelect`, and `handleRename` support view routing, action triggers, niche assignment, and inline renaming.【F:src/ui/views/browser/components/videotube.js†L42-L113】【F:src/ui/views/browser/components/videotube.js†L123-L215】
- **Layout Regions**:
  - Header masthead with title, nav tabs, and “Create New Video” CTA.【F:src/ui/views/browser/components/videotube.js†L69-L120】
  - Dashboard metrics bar and table of uploads.【F:src/ui/views/browser/components/videotube.js†L123-L235】
  - Detail view grid with stats, progress, payout breakdown, actions, niche panel, and rename form.【F:src/ui/views/browser/components/videotube.js†L360-L546】
  - Create view launch card and analytics view twin panels for top earners and niche performance.【F:src/ui/views/browser/components/videotube.js†L552-L706】

### Shopily Commerce Deck
- **Views**: `dashboard`, `upgrades`, and `pricing`, coordinated by a tabbed workspace presenter and helper reducers.【F:src/ui/views/browser/components/shopily/index.js†L8-L124】【F:src/ui/views/browser/components/shopily/index.js†L200-L311】
- **State Fields**: `view`, `selectedStoreId`, and `selectedUpgradeId`, with selectors and reducers enforcing valid selections.【F:src/ui/views/browser/components/shopily/state.js†L1-L71】【F:src/ui/views/browser/components/shopily/state.js†L72-L116】
- **Primary Handlers**: quick actions and niche selection for stores, navigation helpers (`setView`, `reduceSetView`), and upgrade selection callbacks passed into the views.【F:src/ui/views/browser/components/shopily/index.js†L37-L124】【F:src/ui/views/browser/components/shopily/index.js†L200-L311】
- **Layout Regions**:
  - Top bar combining headline, nav tabs with badges, and launch button.【F:src/ui/views/browser/components/shopily/index.js†L249-L311】
  - Dashboard view hero (KPI metrics plus CTA), store table, and detail sidebar for the selected store.【F:src/ui/views/browser/components/shopily/views/dashboardView.js†L13-L172】
  - Upgrades view grid of upgrade cards with status tones, requirement lists, and CTA button logic.【F:src/ui/views/browser/components/shopily/index.js†L86-L198】【F:src/ui/views/browser/components/shopily/index.js†L200-L311】
  - Pricing view presenting plan cards via lifecycle summaries.【F:src/ui/views/browser/components/shopily/index.js†L200-L311】

### Learnly Academy
- **Views**: `catalog`, `freeCourses`, `myCourses`, `detail`, and `pricing`, toggled through tab buttons and per-view routers.【F:src/ui/views/browser/components/learnly.js†L8-L203】【F:src/ui/views/browser/components/learnly.js†L231-L283】【F:src/ui/views/browser/components/learnly.js†L841-L895】
- **State Fields**: `view`, `tab`, `category`, and `selectedCourseId`, maintained in module scope with `setState` and `ensureSelectedCourse` ensuring valid selections.【F:src/ui/views/browser/components/learnly.js†L39-L226】
- **Primary Handlers**: category selection, tab routing, course enrollment/drop, and course detail navigation (`handleSelectCategory`, `handleOpenTab`, `handleOpenCourse`, `handleEnroll`, `handleDrop`).【F:src/ui/views/browser/components/learnly.js†L222-L276】
- **Layout Regions**:
  - Hero band with academy title and KPI metrics.【F:src/ui/views/browser/components/learnly.js†L302-L324】
  - Tab navigation with badges for free courses and active enrollments.【F:src/ui/views/browser/components/learnly.js†L326-L359】
  - View bodies: catalog filter and card grid, detail view with highlights and CTA, enrollments list, free-course list, and FAQ-style pricing view.【F:src/ui/views/browser/components/learnly.js†L373-L523】【F:src/ui/views/browser/components/learnly.js†L522-L729】【F:src/ui/views/browser/components/learnly.js†L731-L879】

## Common Affordances & Deviations
- **Nav Tabs**: All workspaces surface view switching via tab buttons or nav controls, often with badges to communicate counts.【F:src/ui/views/browser/components/serverhub.js†L840-L872】【F:src/ui/views/browser/components/videotube.js†L69-L120】【F:src/ui/views/browser/components/shopily/index.js†L249-L311】【F:src/ui/views/browser/components/learnly.js†L326-L359】 Learnly diverges by driving routing entirely through module-level state rather than a shared presenter.
- **KPI Grids/Bars**: Each module highlights summary metrics near the top of the workspace (ServerHub hero metrics, VideoTube stats bar, Shopily hero metrics, Learnly hero band).【F:src/ui/views/browser/components/serverhub.js†L195-L227】【F:src/ui/views/browser/components/videotube.js†L123-L146】【F:src/ui/views/browser/components/shopily/views/dashboardView.js†L13-L172】【F:src/ui/views/browser/components/learnly.js†L302-L324】 VideoTube’s dashboard keeps metrics inline with the view content rather than a separate hero.
- **Instance Tables**: ServerHub, VideoTube, and Shopily rely on sortable-like tables listing assets with action cells.【F:src/ui/views/browser/components/serverhub.js†L247-L402】【F:src/ui/views/browser/components/videotube.js†L187-L235】【F:src/ui/views/browser/components/shopily/views/dashboardView.js†L36-L133】 Learnly instead uses card grids and enrollment lists for catalog data.
- **Detail Panels**: ServerHub and Shopily pair tables with sidebar detail panels for the selected asset, while VideoTube uses a dedicated detail view. Learnly’s detail view replaces the grid entirely and includes back navigation cues.【F:src/ui/views/browser/components/serverhub.js†L608-L760】【F:src/ui/views/browser/components/shopily/views/dashboardView.js†L152-L172】【F:src/ui/views/browser/components/videotube.js†L360-L546】【F:src/ui/views/browser/components/learnly.js†L522-L683】
- **Launch Dialogs/CTAs**: ServerHub shows a launch confirmation modal before deploying apps, Shopily and VideoTube provide immediate CTA buttons, and Learnly’s enrollment CTA can trigger confirmation or direct enrollment/drop workflows.【F:src/ui/views/browser/components/serverhub.js†L106-L160】【F:src/ui/views/browser/components/shopily/views/dashboardView.js†L13-L172】【F:src/ui/views/browser/components/videotube.js†L69-L120】【F:src/ui/views/browser/components/learnly.js†L265-L279】【F:src/ui/views/browser/components/learnly.js†L663-L680】
- **Module-Specific Deviations**:
  - ServerHub emphasizes a persistent detail sidebar and action console ordering for SaaS quality actions.【F:src/ui/views/browser/components/serverhub.js†L26-L127】【F:src/ui/views/browser/components/serverhub.js†L608-L760】
  - VideoTube uniquely supports a creation wizard view and inline rename controls within the detail header.【F:src/ui/views/browser/components/videotube.js†L515-L569】
  - Shopily relies on shared reducers to sync URL paths and selection between views, along with upgrade requirement formatting utilities.【F:src/ui/views/browser/components/shopily/state.js†L1-L116】【F:src/ui/views/browser/components/shopily/index.js†L63-L198】
  - Learnly runs a custom state container (no presenter) with route syncing via `workspacePathController` and extensive card-based catalog layouts.【F:src/ui/views/browser/components/learnly.js†L222-L953】

## Proposed Configuration Schema
The following schema captures the structural needs of all four workspaces. Each workspace module can be described with a single configuration object that downstream renderers interpret.

```ts
interface WorkspaceConfig {
  id: string;                     // e.g., "serverhub", "videotube"
  title: string;                  // Masthead heading
  tagline: string;                // Subheading or hero note
  state: {
    defaultView: string;          // Initial view id
    selections?: Record<string, { default?: string | null; source: 'table' | 'list' | 'tab'; }>; // e.g., selectedAppId
    extra?: Record<string, any>;  // Module-specific view state (e.g., learnly.tab or category)
  };
  navTabs: Array<{
    id: string;
    label: string;
    badgeSource?: 'summary.hero' | 'summary.counts' | 'custom';
    targetView: string;
  }>;
  hero?: {
    metrics: Array<{ id: string; label: string; format: 'currency' | 'percent' | 'integer' | 'duration'; source: string }>;
    actions?: Array<{ id: string; label: string; intent: 'launch' | 'route' | 'custom'; view?: string; confirm?: boolean }>;
  };
  handlers: {
    launch?: { action: 'launchAsset'; assetType: string; confirmDetails?: 'lifecycle' | 'simple' };
    quickActions?: Array<{ assetType: string; actions: string[] }>;
    nicheSelect?: { assetType: string };
    rename?: { assetType: string; field: 'name' | 'title' };
    enroll?: { enrollAction: string; dropAction?: string };
  };
  views: Record<string, ViewConfig>;
}

interface ViewConfig {
  kind: 'table' | 'detail' | 'grid' | 'form' | 'faq';
  regions: Array<
    | { slot: 'metrics'; component: 'kpiBar' | 'statsGrid'; source: string }
    | { slot: 'primary'; component: 'table'; source: string; columns: ColumnConfig[]; selection?: string; actions?: ActionCellConfig[] }
    | { slot: 'primary'; component: 'cardGrid'; source: string; filters?: FilterConfig[] }
    | { slot: 'sidebar'; component: 'detailPanel'; source: string; sections: DetailSectionConfig[] }
    | { slot: 'primary'; component: 'panelGrid'; panels: PanelConfig[] }
    | { slot: 'primary'; component: 'formCard'; fields: FormFieldConfig[] }
    | { slot: 'primary'; component: 'faqList'; entries: FAQEntryConfig[] }
  >;
  emptyStates?: Record<string, { message: string; action?: string }>;
  transitions?: Array<{ trigger: 'rowClick' | 'button' | 'tab'; targetView: string; selection?: string }>;
}
```

- **ServerHub**: defines an `apps` view with a `table` region bound to SaaS instances and a `detailPanel` sidebar, plus `upgrades` (panel grid) and `pricing` (card grid). `handlers.launch` uses lifecycle confirmation, and `handlers.quickActions` enumerate the action console IDs.
- **VideoTube**: maps `dashboard` to a metrics region and upload table, `detail` to a stats grid with panel grid and rename form, `create` to a form card, and `analytics` to a panel grid fed by aggregate analytics. `handlers.rename` and `handlers.quickActions` reference vlog assets.
- **Shopily**: configures `dashboard` with hero metrics, store table, and store detail sidebar; `upgrades` with panel cards summarizing requirements; `pricing` with lifecycle card grid. Selection metadata covers both stores and upgrades.
- **Learnly**: employs extra state (`tab`, `category`), a card grid catalog with filter controls, a detail view with highlight sections and CTA, an enrollment list (detailPanel variant without table), and a pricing FAQ list. `handlers.enroll` describes enrollment/drop flows instead of launch.

Renderer implementations can read the shared schema to assemble consistent workspace shells while honoring module-specific nuances.
