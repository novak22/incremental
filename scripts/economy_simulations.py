import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

DATA_PATH = Path('docs/normalized_economy.json')
OUTPUT_DIR = Path('docs/economy_sim_report_assets')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

STARTING_CASH = 45
BASE_DAY_HOURS = 14
ASSISTANT_HIRE_COST = 180
ASSISTANT_HOURLY_RATE = 8
ASSISTANT_HOURS_PER_DAY = 3


@dataclass
class SimulationConfig:
    """Runtime knobs that balance the core simulation."""

    starting_cash: float = STARTING_CASH
    base_day_hours: float = BASE_DAY_HOURS
    assistant_hire_cost: float = ASSISTANT_HIRE_COST
    assistant_hourly_rate: float = ASSISTANT_HOURLY_RATE
    assistant_hours_per_day: float = ASSISTANT_HOURS_PER_DAY
    blog_income_multiplier: float = 1.0
    freelance_income_multiplier: float = 1.0
    survey_income_multiplier: float = 1.0
    blog_setup_cost_multiplier: float = 1.0
    blog_maintenance_cost_multiplier: float = 1.0


def load_data():
    with DATA_PATH.open() as f:
        return json.load(f)


@dataclass
class SimulationMetrics:
    hustle_income: Dict[str, float] = field(default_factory=dict)
    hustle_runs: Dict[str, int] = field(default_factory=dict)
    asset_income: Dict[str, float] = field(default_factory=dict)
    total_days: int = 0

    def as_daily(self):
        days = self.total_days or 1
        return {
            'hustle_income_per_day': {k: v / days for k, v in self.hustle_income.items()},
            'hustle_runs_per_day': {k: v / days for k, v in self.hustle_runs.items()},
            'asset_income_per_day': {k: v / days for k, v in self.asset_income.items()},
        }


def run_simulation(
    data,
    days: int = 30,
    assistants: int = 0,
    build_blog: bool = True,
    config: Optional[SimulationConfig] = None,
):
    if config is None:
        config = SimulationConfig()

    assets = data['assets']
    hustles = data['hustles']

    cash = config.starting_cash - assistants * config.assistant_hire_cost
    day_hours = config.base_day_hours + assistants * config.assistant_hours_per_day
    assistant_daily_cost = (
        assistants * config.assistant_hours_per_day * config.assistant_hourly_rate
    )

    blog_def = assets['blog']
    blog_setup_hours = blog_def['schedule']['setup_minutes_per_day'] / 60
    blog_setup_days = blog_def['schedule']['setup_days']
    blog_maintenance_hours = blog_def['maintenance_time'] / 60
    blog_maintenance_cost = blog_def['maintenance_cost'] * config.blog_maintenance_cost_multiplier
    blog_income_avg = (
        (blog_def['quality_curve'][0]['income_min'] + blog_def['quality_curve'][0]['income_max'])
        / 2
        * config.blog_income_multiplier
    )

    freelance_def = hustles['freelance']
    freelance_hours = freelance_def['setup_time'] / 60
    freelance_income = freelance_def['base_income'] * config.freelance_income_multiplier

    survey_def = hustles['surveySprint']
    survey_hours = survey_def['setup_time'] / 60
    survey_income = survey_def['base_income'] * config.survey_income_multiplier
    survey_limit = survey_def['daily_limit']

    blog_started = False
    blog_active = False
    blog_progress = 0

    records: List[Dict] = []
    metrics = SimulationMetrics(total_days=days)

    for day in range(1, days + 1):
        cash_start = cash
        hours_left = day_hours
        hustle_income_today = 0
        asset_income_today = 0
        maintenance_spend_today = 0
        wages_today = assistant_daily_cost

        hours_spent = {'freelance': 0.0, 'survey': 0.0, 'blog_setup': 0.0, 'blog_maintenance': 0.0}
        hustle_runs_today = {'freelance': 0, 'survey': 0}

        # Attempt to start blog setup if desired
        blog_setup_cost = blog_def['setup_cost'] * config.blog_setup_cost_multiplier
        if build_blog and not blog_started and cash >= blog_setup_cost:
            cash -= blog_setup_cost
            blog_started = True
            blog_progress = 0

        # Handle blog setup progression
        if blog_started and not blog_active:
            if hours_left >= blog_setup_hours:
                hours_left -= blog_setup_hours
                hours_spent['blog_setup'] += blog_setup_hours
                blog_progress += 1
                if blog_progress >= blog_setup_days:
                    blog_active = True
            else:
                # cannot progress this day (should not happen with our schedules)
                pass

        blog_maintained = False
        if blog_active:
            if hours_left >= blog_maintenance_hours:
                hours_left -= blog_maintenance_hours
                hours_spent['blog_maintenance'] += blog_maintenance_hours
                cash -= blog_maintenance_cost
                maintenance_spend_today += blog_maintenance_cost
                blog_maintained = True

        # Run freelance writing sessions
        freelance_runs = int(hours_left // freelance_hours)
        for _ in range(freelance_runs):
            hours_left -= freelance_hours
            hours_spent['freelance'] += freelance_hours
            cash += freelance_income
            hustle_income_today += freelance_income
            metrics.hustle_income['freelance'] = metrics.hustle_income.get('freelance', 0.0) + freelance_income
            metrics.hustle_runs['freelance'] = metrics.hustle_runs.get('freelance', 0) + 1
            hustle_runs_today['freelance'] += 1

        # Use remaining time for surveys within limit
        survey_runs_possible = int(hours_left // survey_hours)
        survey_runs = min(survey_runs_possible, survey_limit)
        for _ in range(survey_runs):
            hours_left -= survey_hours
            hours_spent['survey'] += survey_hours
            cash += survey_income
            hustle_income_today += survey_income
            metrics.hustle_income['surveySprint'] = metrics.hustle_income.get('surveySprint', 0.0) + survey_income
            metrics.hustle_runs['surveySprint'] = metrics.hustle_runs.get('surveySprint', 0) + 1
            hustle_runs_today['survey'] += 1

        if blog_active and blog_maintained:
            cash += blog_income_avg
            asset_income_today += blog_income_avg
            metrics.asset_income['blog'] = metrics.asset_income.get('blog', 0.0) + blog_income_avg

        cash -= wages_today

        record = {
            'day': day,
            'cash_start': cash_start,
            'cash_end': cash,
            'hustle_income': hustle_income_today,
            'asset_income': asset_income_today,
            'maintenance_spend': maintenance_spend_today,
            'assistant_wages': wages_today,
            'hours_freelance': hours_spent['freelance'],
            'hours_survey': hours_spent['survey'],
            'hours_blog_setup': hours_spent['blog_setup'],
            'hours_blog_maintenance': hours_spent['blog_maintenance'],
            'freelance_runs': hustle_runs_today['freelance'],
            'survey_runs': hustle_runs_today['survey'],
            'blog_active': blog_active,
        }
        records.append(record)

    df = pd.DataFrame(records)
    return df, metrics


def fit_exponential(day_series: pd.Series, cash_series: pd.Series) -> Tuple[np.ndarray, float, float]:
    mask = cash_series > 0
    x = day_series[mask].values
    y = cash_series[mask].values
    log_y = np.log(y)
    slope, intercept = np.polyfit(x, log_y, 1)
    fitted = np.exp(intercept + slope * day_series)
    return fitted, slope, intercept


def compute_education_roi(data, baseline_metrics: SimulationMetrics, baseline_daily: Dict[str, Dict[str, float]], horizon_days=30):
    results = []
    modifiers = data['modifiers']
    for track_id, track in data['tracks'].items():
        total_hours = track['schedule']['days'] * track['schedule']['minutes_per_day'] / 60
        tuition = track['setup_cost']
        track_mods = [m for m in modifiers if m['source'] == track_id]
        incremental_daily = 0.0
        detail_breakdown: List[str] = []

        for mod in track_mods:
            target = mod['target']
            mod_type = mod['type']
            formula = mod['formula']
            if mod_type == 'multiplier':
                # assume format income * (1 + x)
                if '1 +' in formula:
                    factor = float(formula.split('1 +')[1].strip().strip('()'))
                else:
                    continue
                if target.startswith('asset:'):
                    asset_id = target.split(':')[1].split('.')[0]
                    base = baseline_daily['asset_income_per_day'].get(asset_id, 0.0)
                    delta = base * factor
                    detail_breakdown.append(f"{asset_id} income +{factor*100:.1f}% => ${delta:.2f}/day")
                elif target.startswith('hustle:'):
                    hustle_id = target.split(':')[1].split('.')[0]
                    base = baseline_daily['hustle_income_per_day'].get(hustle_id, 0.0)
                    delta = base * factor
                    detail_breakdown.append(f"{hustle_id} income +{factor*100:.1f}% => ${delta:.2f}/day")
                else:
                    delta = 0
                incremental_daily += delta
            elif mod_type == 'flat':
                value = float(formula.split('+')[1].strip())
                if target.startswith('asset:'):
                    delta = value
                    asset_id = target.split(':')[1].split('.')[0]
                    detail_breakdown.append(f"{asset_id} +${value:.2f}/day")
                elif target.startswith('hustle:'):
                    hustle_id = target.split(':')[1].split('.')[0]
                    runs = baseline_daily['hustle_runs_per_day'].get(hustle_id, 0.0)
                    delta = value * runs
                    detail_breakdown.append(f"{hustle_id} +${value:.2f} per run × {runs:.2f} => ${delta:.2f}/day")
                else:
                    delta = 0
                incremental_daily += delta

        if incremental_daily == 0:
            payback_days = math.inf
        else:
            payback_days = tuition / incremental_daily

        active_days = max(0, horizon_days - track['schedule']['days'])
        net_gain_horizon = incremental_daily * active_days - tuition
        roi_per_hour = incremental_daily / total_hours if total_hours else 0.0

        results.append({
            'track': track_id,
            'tuition': tuition,
            'study_hours': total_hours,
            'incremental_daily': incremental_daily,
            'roi_per_hour': roi_per_hour,
            'payback_days': payback_days,
            'net_gain_horizon': net_gain_horizon,
            'details': '; '.join(detail_breakdown) if detail_breakdown else 'No direct baseline impact',
        })

    df = pd.DataFrame(results)
    df.sort_values('roi_per_hour', ascending=False, inplace=True)
    return df


def plot_daily_cashflow(df):
    plt.figure(figsize=(10, 6))
    plt.plot(df['day'], df['cash_end'], marker='o')
    plt.title('Baseline Daily Cashflow (30 Days)')
    plt.xlabel('Day')
    plt.ylabel('Ending Cash ($)')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    path = OUTPUT_DIR / 'daily_cashflow.svg'
    plt.savefig(path, dpi=150)
    plt.close()
    return path


def plot_exponential_curve(df):
    fitted, slope, intercept = fit_exponential(df['day'], df['cash_end'])
    plt.figure(figsize=(10, 6))
    plt.plot(df['day'], df['cash_end'], label='Observed', marker='o')
    plt.plot(df['day'], fitted, label='Best-fit Exponential', linestyle='--')
    plt.title('Cash vs Time with Exponential Fit')
    plt.xlabel('Day')
    plt.ylabel('Ending Cash ($)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    path = OUTPUT_DIR / 'cash_vs_time_exponential.svg'
    plt.savefig(path, dpi=150)
    plt.close()
    return path, slope


def plot_assistant_scenarios(data, days=30):
    plt.figure(figsize=(10, 6))
    assistant_results = []
    for assistants in range(0, 4):
        df, _ = run_simulation(data, days=days, assistants=assistants)
        plt.plot(df['day'], df['cash_end'], label=f'{assistants} assistants')
        avg_delta = (df['cash_end'].iloc[-1] - df['cash_start'].iloc[0]) / days
        assistant_results.append({'assistants': assistants, 'avg_daily_change': avg_delta})
    plt.title('Assistant Cost Sustainability')
    plt.xlabel('Day')
    plt.ylabel('Ending Cash ($)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    path = OUTPUT_DIR / 'assistant_sustainability.svg'
    plt.savefig(path, dpi=150)
    plt.close()
    return path, pd.DataFrame(assistant_results)


def plot_education_roi(df):
    plt.figure(figsize=(12, 7))
    plt.barh(df['track'], df['roi_per_hour'])
    plt.title('Education ROI per Study Hour')
    plt.xlabel('Daily Cash Gain per Study Hour ($/day-hour)')
    plt.ylabel('Knowledge Track')
    plt.tight_layout()
    path = OUTPUT_DIR / 'education_roi.svg'
    plt.savefig(path, dpi=150)
    plt.close()
    return path


def main():
    data = load_data()
    baseline_df, baseline_metrics = run_simulation(data, days=30)
    baseline_df.to_csv(OUTPUT_DIR / 'baseline_daily_cashflow.csv', index=False)
    plot_daily_cashflow(baseline_df)
    exp_path, slope = plot_exponential_curve(baseline_df)

    assistant_path, assistant_summary = plot_assistant_scenarios(data, days=30)
    assistant_summary.to_csv(OUTPUT_DIR / 'assistant_summary.csv', index=False)

    baseline_daily = baseline_metrics.as_daily()
    education_df = compute_education_roi(data, baseline_metrics, baseline_daily)
    education_df.to_csv(OUTPUT_DIR / 'education_roi.csv', index=False)
    plot_education_roi(education_df.head(10))

    print('Baseline exponential slope:', slope)
    print('Assistant summary:')
    print(assistant_summary)
    print('Top education ROI:')
    print(education_df.head(5))


if __name__ == '__main__':
    main()
