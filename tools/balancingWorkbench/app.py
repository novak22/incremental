"""Interactive balancing workbench for the incremental economy."""

from __future__ import annotations

import io
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[2]

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import economy_simulations as sim
from scripts.economy_simulations import SimulationConfig, compute_education_roi, summarize_asset_plan
DATA_PATH = ROOT / "docs" / "normalized_economy.json"
OUTPUT_DIR = ROOT / "docs" / "archive" / "economy_sim_report_assets"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


@st.cache_data(show_spinner=False)
def load_data() -> Dict:
    with DATA_PATH.open() as handle:
        return json.load(handle)


def build_config(base: SimulationConfig | None = None, **changes) -> SimulationConfig:
    values = (base.__dict__ if base else SimulationConfig().__dict__).copy()
    values.update(changes)
    return SimulationConfig(**values)


def relevant_upgrades(data: Dict) -> list[str]:
    upgrades = data.get("upgrades", {})
    if not upgrades:
        return []
    impactful_sources = {
        modifier["source"]
        for modifier in data.get("modifiers", [])
        if modifier["source"] in upgrades
        and modifier["target"].startswith(("asset", "assets[", "hustle", "hustles[", "state:time"))
    }
    return sorted(impactful_sources, key=lambda key: upgrades[key]["name"])


def render_cashflow_plot(df: pd.DataFrame, title: str) -> Tuple[plt.Figure, io.BytesIO]:
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.plot(df["day"], df["cash_end"], marker="o", color="#6b5dd3")
    ax.set_title(title)
    ax.set_xlabel("Day")
    ax.set_ylabel("Ending Cash ($)")
    ax.grid(alpha=0.25)
    fig.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=150)
    buffer.seek(0)
    return fig, buffer


def render_roi_plot(df: pd.DataFrame) -> Tuple[plt.Figure, io.BytesIO]:
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.barh(df["track"], df["roi_per_hour"], color="#3cbcc3")
    ax.set_title("Education ROI per Study Hour")
    ax.set_xlabel("Daily Cash Gain per Study Hour ($)")
    ax.invert_yaxis()
    ax.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=150)
    buffer.seek(0)
    return fig, buffer


def render_sensitivity_plot(x: Iterable[float], y: Iterable[float], label: str) -> Tuple[plt.Figure, io.BytesIO]:
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.plot(x, y, marker="o", color="#ff8a65")
    ax.set_title(f"Sensitivity – {label}")
    ax.set_xlabel(label)
    ax.set_ylabel("Final Day Cash ($)")
    ax.grid(alpha=0.25)
    fig.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=150)
    buffer.seek(0)
    return fig, buffer


def save_snapshot(name: str, buffers: Dict[str, io.BytesIO]) -> None:
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    for label, buffer in buffers.items():
        out_path = OUTPUT_DIR / f"{name}_{label}_{timestamp}.png"
        with out_path.open("wb") as handle:
            handle.write(buffer.getvalue())


def compute_sensitivity(
    data: Dict,
    base_config: SimulationConfig,
    param: str,
    values: Iterable[float],
    days: int,
    assistants: int,
    asset_ids: Iterable[str],
    upgrade_ids: Iterable[str],
) -> Tuple[np.ndarray, np.ndarray]:
    outcomes = []
    for value in values:
        config = build_config(base_config, **{param: value})
        df, _ = sim.run_simulation(
            data,
            days=days,
            assistants=assistants,
            config=config,
            asset_ids=list(asset_ids),
            upgrade_ids=list(upgrade_ids),
        )
        outcomes.append(df["cash_end"].iloc[-1])
    return np.array(list(values)), np.array(outcomes)


def main() -> None:
    st.set_page_config(page_title="Economy Balancing Workbench", layout="wide")
    st.title("Economy Balancing Workbench")
    st.caption(
        "Tweak passive income levers, hustle multipliers, and assistant costs to explore pacing scenarios."
    )

    data = load_data()

    with st.sidebar:
        st.header("Simulation Inputs")
        days = st.slider("Days", min_value=10, max_value=120, value=30, step=5)
        assistants = st.slider("Assistants", min_value=0, max_value=4, value=0, step=1)
        starting_cash = st.slider("Starting Cash", min_value=0, max_value=250, value=sim.STARTING_CASH, step=5)
        base_hours = st.slider("Base Day Hours", min_value=8, max_value=20, value=sim.BASE_DAY_HOURS, step=1)
        assistant_hire_cost = st.slider("Assistant Hire Cost", min_value=0, max_value=400, value=sim.ASSISTANT_HIRE_COST, step=10)
        assistant_hourly_rate = st.slider("Assistant Hourly Rate", min_value=0, max_value=25, value=sim.ASSISTANT_HOURLY_RATE, step=1)
        assistant_hours_per_day = st.slider("Assistant Hours/Day", min_value=0, max_value=8, value=sim.ASSISTANT_HOURS_PER_DAY, step=1)

        st.header("Asset Mix")
        asset_catalog = data["assets"]
        asset_options = sorted(asset_catalog.keys(), key=lambda key: asset_catalog[key]["name"])
        default_assets = ["blog"] if "blog" in asset_options else asset_options[:1]
        selected_assets = st.multiselect(
            "Assets to Develop",
            options=asset_options,
            default=default_assets,
            format_func=lambda key: asset_catalog[key]["name"],
            help="Choose the ventures you want to launch; we'll build them in this order.",
        )

        st.header("Upgrades")
        upgrade_catalog = data.get("upgrades", {})
        upgrade_options = relevant_upgrades(data)
        selected_upgrades = st.multiselect(
            "Upgrades Purchased",
            options=upgrade_options,
            default=[],
            format_func=lambda key: upgrade_catalog.get(key, {}).get("name", key),
            help="Layer on automation, studio, or workflow boosts to see the ripple effects.",
        )
        if not upgrade_options:
            st.caption("No upgrade modifiers detected in the dataset yet.")
        st.caption("We follow your selection order when spending setup time, so front-load favorites!")

        st.header("Economy Multipliers")
        blog_income_multiplier = st.slider("Blog Income Multiplier", min_value=0.25, max_value=3.0, value=1.0, step=0.05)
        blog_setup_cost_multiplier = st.slider("Blog Setup Cost Multiplier", min_value=0.25, max_value=3.0, value=1.0, step=0.05)
        blog_maintenance_cost_multiplier = st.slider(
            "Blog Maintenance Cost Multiplier", min_value=0.25, max_value=3.0, value=1.0, step=0.05
        )
        freelance_income_multiplier = st.slider("Freelance Income Multiplier", min_value=0.25, max_value=3.0, value=1.0, step=0.05)
        survey_income_multiplier = st.slider("Survey Sprint Income Multiplier", min_value=0.25, max_value=3.0, value=1.0, step=0.05)

        st.header("Sensitivity Scan")
        param_choice = st.selectbox(
            "Parameter",
            options={
                "blog_income_multiplier": "Blog Income Multiplier",
                "freelance_income_multiplier": "Freelance Income Multiplier",
                "survey_income_multiplier": "Survey Income Multiplier",
            },
            format_func=lambda key: {
                "blog_income_multiplier": "Blog Income Multiplier",
                "freelance_income_multiplier": "Freelance Income Multiplier",
                "survey_income_multiplier": "Survey Income Multiplier",
            }[key],
        )
        span = st.slider("Sensitivity Span", min_value=0.5, max_value=2.0, value=1.2, step=0.1)
        samples = st.slider("Samples", min_value=3, max_value=15, value=7, step=2)

    config = SimulationConfig(
        starting_cash=starting_cash,
        base_day_hours=base_hours,
        assistant_hire_cost=assistant_hire_cost,
        assistant_hourly_rate=assistant_hourly_rate,
        assistant_hours_per_day=assistant_hours_per_day,
        blog_income_multiplier=blog_income_multiplier,
        blog_setup_cost_multiplier=blog_setup_cost_multiplier,
        blog_maintenance_cost_multiplier=blog_maintenance_cost_multiplier,
        freelance_income_multiplier=freelance_income_multiplier,
        survey_income_multiplier=survey_income_multiplier,
        asset_ids=tuple(selected_assets),
        upgrade_ids=tuple(selected_upgrades),
    )

    asset_plan_df, upgrade_effects = summarize_asset_plan(
        data,
        selected_assets,
        selected_upgrades,
        config=config,
        hustle_ids=["freelance", "surveySprint"],
    )

    pretty_upgrades = data.get("upgrades", {})

    st.subheader("Asset Plan Overview")
    if asset_plan_df.empty:
        st.info("Select at least one asset in the sidebar to explore passive income combos.")
    else:
        display_df = asset_plan_df.copy()
        display_df["Upgrades Applied"] = display_df["Upgrade Sources"].apply(
            lambda sources: ", ".join(pretty_upgrades.get(uid, {}).get("name", uid) for uid in sources) if sources else "—"
        )
        display_df = display_df.drop(columns=["Upgrade Sources", "asset_id"])
        st.dataframe(
            display_df,
            use_container_width=True,
            column_config={
                "Setup Cost ($)": st.column_config.NumberColumn(format="$%.0f"),
                "Maintenance Cost ($)": st.column_config.NumberColumn(format="$%.0f"),
                "Setup Hours/Day": st.column_config.NumberColumn(format="%.2f h"),
                "Maintenance Hours/Day": st.column_config.NumberColumn(format="%.2f h"),
                "Daily Income ($)": st.column_config.NumberColumn(format="$%.2f"),
                "Setup Days": st.column_config.NumberColumn(format="%.0f"),
            },
        )

    if selected_upgrades:
        upgrade_names = [pretty_upgrades.get(uid, {}).get("name", uid) for uid in selected_upgrades]
        st.caption("Upgrades activated: " + ", ".join(upgrade_names))
    else:
        st.caption("Upgrades activated: none yet — toggle some in the sidebar to spark new flows!")

    if upgrade_effects.time_bonus_minutes:
        bonus_sources = ", ".join(
            pretty_upgrades.get(uid, {}).get("name", uid) for uid in sorted(upgrade_effects.time_bonus_sources)
        )
        st.caption(f"✨ Daily time bonus: +{upgrade_effects.time_bonus_minutes:.0f} minutes ({bonus_sources}).")

    hustle_notes = []
    hustle_catalog = data.get("hustles", {})
    for hustle_id, effect in upgrade_effects.hustle_effects.items():
        if not effect.sources:
            continue
        adjustments: list[str] = []
        if abs(effect.income_mult - 1.0) > 1e-6:
            adjustments.append(f"income ×{effect.income_mult:.2f}")
        if abs(effect.income_flat) > 1e-6:
            adjustments.append(f"income +${effect.income_flat:.2f}")
        if abs(effect.setup_time_mult - 1.0) > 1e-6:
            adjustments.append(f"time ×{effect.setup_time_mult:.2f}")
        if not adjustments:
            continue
        source_names = ", ".join(
            pretty_upgrades.get(uid, {}).get("name", uid) for uid in sorted(effect.sources)
        )
        hustle_notes.append(
            f"**{hustle_catalog.get(hustle_id, {}).get('name', hustle_id)}** ({source_names}): "
            + "; ".join(adjustments)
        )
    if hustle_notes:
        st.caption("Hustle boosts: " + " • ".join(hustle_notes))

    st.markdown("---")

    df, metrics = sim.run_simulation(
        data,
        days=days,
        assistants=assistants,
        config=config,
        asset_ids=selected_assets,
        upgrade_ids=selected_upgrades,
    )
    daily_fig, daily_buffer = render_cashflow_plot(df, "Daily Ending Cash")
    st.subheader("Daily Cashflow")
    st.pyplot(daily_fig)

    baseline_daily = metrics.as_daily()
    roi_df = compute_education_roi(data, metrics, baseline_daily, horizon_days=days)
    st.subheader("Education ROI")
    st.dataframe(roi_df, use_container_width=True)
    roi_fig, roi_buffer = render_roi_plot(roi_df.head(10))
    st.pyplot(roi_fig)

    base_value = getattr(config, param_choice)
    values = np.linspace(base_value / span, base_value * span, samples)
    x, y = compute_sensitivity(
        data,
        config,
        param_choice,
        values,
        days,
        assistants,
        selected_assets,
        selected_upgrades,
    )
    sensitivity_fig, sensitivity_buffer = render_sensitivity_plot(x, y, {
        "blog_income_multiplier": "Blog Income Multiplier",
        "freelance_income_multiplier": "Freelance Income Multiplier",
        "survey_income_multiplier": "Survey Income Multiplier",
    }[param_choice])

    st.subheader("Sensitivity Explorer")
    st.pyplot(sensitivity_fig)

    st.subheader("Snapshot")
    if st.button("Save PNG Snapshots"):
        save_snapshot(
            "balancing_workbench",
            {
                "cashflow": daily_buffer,
                "education_roi": roi_buffer,
                "sensitivity": sensitivity_buffer,
            },
        )
        st.success("Saved current plots to docs/archive/economy_sim_report_assets")

    st.markdown("---")
    st.markdown(
        """
        **Next Steps**

        - When you settle on a tuning target, record the final multipliers above.
        - Update `docs/normalized_economy.json` with the new values and revise `docs/economy-quickref.md` where those knobs surface.
        - Capture the generated PNGs from this workbench in design reviews (they live in `docs/archive/economy_sim_report_assets/`).
        """
    )


if __name__ == "__main__":
    main()
