# Action Template Builders

The action registry now exposes helper builders that wrap `acceptActionInstance` so that new
systems can register reusable contract-style actions with consistent defaults. These templates
live in `src/game/actions/templates/contract.js` and are designed to keep availability, progress,
limits, and logging metadata aligned with the shared action instance store.

## Goals

- Provide a single place to normalize availability and expiry metadata for any action that queues
  instances.
- Guarantee that every template seeds a `defaultState.instances` array so registry bootstrap does
  not need to guard for missing state.
- Wrap `acceptActionInstance` with template-specific defaults so callers only supply the deltas
  that matter for the current run.
- Make it obvious how to set daily limits, enrollable states, or manual completion workflows.

## Builders

### `createContractTemplate(definition, options)`

Creates a contract-style template that ensures:

- `availability` falls back to `{ type: 'dailyLimit' }` when a `dailyLimit` is present, otherwise
  `{ type: 'always' }`.
- `expiry` defaults to `{ type: 'permanent' }` unless overridden.
- `progress` merges template defaults with any values supplied at definition time.
- `acceptInstance({...})` wraps `acceptActionInstance`, merging progress overrides so callers can
  tweak hours, deadlines, or custom labels without rebuilding the base metadata.
- Logging hooks can be attached through `options.accept.hooks` or `options.accept.onAccepted` to
  centralize analytics or status updates immediately after an instance is accepted.

Use this builder for instant hustles, asset upkeep actions, and exploratory contracts that share a
single-instance queue.

### `createStudyTemplate(definition, options)`

Extends the contract template with study-friendly defaults:

- `availability` defaults to `{ type: 'enrollable' }`.
- `progress` always reports `{ type: 'study', completion: 'manual' }` unless explicitly overridden.

Study tracks should call this helper after composing their card presenters so they inherit the
same acceptance flow as hustles. The template still exposes `acceptInstance`, allowing the track to
log manual study time while respecting shared progress metadata.

## Integration Points

- **Hustles:** `createInstantHustle` now pipes its definition through `createContractTemplate`,
  passing in daily limits, availability overrides, and instant-progress defaults. Hustle configs can
  also supply `acceptHooks` or `onAccept` callbacks that log acceptance state without bypassing the
  template wrapper.
- **Study Tracks:** `src/game/actions/definitions.js` routes knowledge track entries through
  `createStudyTemplate` so accepted study sessions use the same progress metadata as any other
  contract.
- **Asset Upkeep & Exploratory Actions:** Future upkeep timers or exploration contracts should
  create their definitions with `createContractTemplate`, then customize `acceptInstance` overrides
  (e.g., to add upkeep-specific log messages) instead of calling `acceptActionInstance` directly.
  This keeps daily limit bookkeeping aligned with the base implementation.

## Shared Action Card Presenter

- `src/ui/views/browser/components/actionCardPresenter.js` renders contract offers, commitments, and accept buttons using template descriptors.
- Model builders (e.g., `buildHustleModels`) now surface `descriptors`, `actionCategory`, and friendly category labels so the presenter can reuse copy across hustles, courses, and upkeep contracts.
- Descriptor bundles merge template-provided copy with default messaging that reinforces the accept → work → complete loop, ensuring new action types inherit the same tone automatically.


## Usage Pattern

```js
import { createContractTemplate } from '../actions/templates/contract.js';

const definition = createContractTemplate({
  id: 'explore-new-market',
  name: 'Explore a New Market',
  defaultState: {},
  dailyLimit: 1,
  progress: { completion: 'manual' }
}, {
  progress: { type: 'project', hoursPerDay: 2 },
  accept: {
    onAccepted: ({ instance, metadata }) => {
      logEvent('exploration-accepted', { id: instance.id, deadline: metadata.deadlineDay });
    }
  }
});

definition.action = {
  label: 'Scout Leads',
  onClick: () => {
    const state = getState();
    const instance = definition.acceptInstance({
      state,
      overrides: {
        progress: { label: 'Market Research' }
      }
    });
    // perform custom logging, payout hooks, etc.
  }
};
```

With this pattern the registry gains reusable contracts that share consistent defaults, while each
system can still bolt on bespoke logging, payouts, or manual completion steps.
