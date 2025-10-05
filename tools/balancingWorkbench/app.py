"""Interactive balancing workbench for the incremental economy."""

from __future__ import annotations

import io
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st

from scripts import economy_simulations as sim
from scripts.economy_simulations import SimulationConfig, compute_education_roi

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "docs" / "normalized_economy.json"
OUTPUT_DIR = ROOT / "docs" / "economy_sim_report_assets"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


@st.cache_data(show_spinner=False)
def load_data() -> Dict:
    with DATA_PATH.open() as handle:
        return json.load(handle)


def build_config(base: SimulationConfig | None = None, **changes) -> SimulationConfig:
    values = (base.__dict__ if base else SimulationConfig().__dict__).copy()
    values.update(changes)
    return SimulationConfig(**values)


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
    build_blog: bool,
) -> Tuple[np.ndarray, np.ndarray]:
    outcomes = []
    for value in values:
        config = build_config(base_config, **{param: value})
        df, _ = sim.run_simulation(data, days=days, assistants=assistants, build_blog=build_blog, config=config)
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
        build_blog = st.checkbox("Build Starter Blog", value=True)
        starting_cash = st.slider("Starting Cash", min_value=0, max_value=250, value=sim.STARTING_CASH, step=5)
        base_hours = st.slider("Base Day Hours", min_value=8, max_value=20, value=sim.BASE_DAY_HOURS, step=1)
        assistant_hire_cost = st.slider("Assistant Hire Cost", min_value=0, max_value=400, value=sim.ASSISTANT_HIRE_COST, step=10)
        assistant_hourly_rate = st.slider("Assistant Hourly Rate", min_value=0, max_value=25, value=sim.ASSISTANT_HOURLY_RATE, step=1)
        assistant_hours_per_day = st.slider("Assistant Hours/Day", min_value=0, max_value=8, value=sim.ASSISTANT_HOURS_PER_DAY, step=1)

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
    )

    df, metrics = sim.run_simulation(
        data,
        days=days,
        assistants=assistants,
        build_blog=build_blog,
        config=config,
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
    x, y = compute_sensitivity(data, config, param_choice, values, days, assistants, build_blog)
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
        st.success("Saved current plots to docs/economy_sim_report_assets")

    st.markdown("---")
    st.markdown(
        """
        **Next Steps**

        - When you settle on a tuning target, record the final multipliers above.
        - Update `docs/normalized_economy.json` with the new values, rerun `npm run rebuild-economy-docs`,
          and refresh `docs/economy_sim_report.md` assets.
        - Capture the generated PNGs from this workbench in design reviews.
        """
    )


if __name__ == "__main__":
    main()
