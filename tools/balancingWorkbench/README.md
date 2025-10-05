# Economy Balancing Workbench

The balancing workbench is a Streamlit-powered dashboard that loads the canonical `docs/normalized_economy.json` dataset and
lets designers explore how tweaks to core levers ripple through the early-game economy.

## Features

- Reuses the shared `scripts/economy_simulations.py` helpers to simulate 30–120 day runs with optional assistants.
- Sidebar sliders adjust starting capital, available hours, assistant labor costs, and income/cost multipliers for the first
  passive blog, freelance writing, and survey sprints.
- Matplotlib visualizations highlight daily cashflow, education return-on-investment, and a sensitivity curve for the selected
  multiplier.
- A one-click snapshot button exports PNG copies of every chart into `docs/economy_sim_report_assets` for documentation.

## Getting Started

1. Create a virtual environment (recommended) and install the local dependencies:

   ```bash
   cd incremental
   python -m venv .venv
   source .venv/bin/activate
   pip install -r tools/balancingWorkbench/requirements.txt
   ```

2. Launch the Streamlit app from the repository root so relative paths resolve:

   ```bash
   streamlit run tools/balancingWorkbench/app.py
   ```

3. Move the sliders to prototype new balance targets. Charts and tables update instantly after every adjustment.

## Committing New Targets

- When a tuning session lands on a set of multipliers you want to ship, update the corresponding entries in
  `docs/normalized_economy.json` and rerun `npm run rebuild-economy-docs` to refresh the spec.
- Drop the generated PNGs from `docs/economy_sim_report_assets` into your design review notes (see `docs/economy_sim_report.md`
  for context).
- Record the decision in a `docs/features/` design note and add an entry to `docs/changelog.md` summarizing the gameplay impact.

Happy balancing! Keep the tone upbeat and players will feel the uplift in every milestone.
