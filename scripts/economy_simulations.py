import ast
import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

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
    asset_ids: Tuple[str, ...] = field(default_factory=tuple)
    upgrade_ids: Tuple[str, ...] = field(default_factory=tuple)


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


@dataclass
class EntityEffect:
    income_mult: float = 1.0
    income_flat: float = 0.0
    setup_time_mult: float = 1.0
    maintenance_time_mult: float = 1.0
    sources: set[str] = field(default_factory=set)


@dataclass
class UpgradeEffects:
    asset_effects: Dict[str, EntityEffect] = field(default_factory=dict)
    hustle_effects: Dict[str, EntityEffect] = field(default_factory=dict)
    time_bonus_minutes: float = 0.0
    time_bonus_sources: set[str] = field(default_factory=set)


_BIN_OPS = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b,
}

_UNARY_OPS = {ast.UAdd: lambda a: a, ast.USub: lambda a: -a}


def _safe_eval(expr: str) -> float:
    node = ast.parse(expr, mode='eval').body

    def _eval(current: ast.AST) -> float:
        if isinstance(current, ast.BinOp) and type(current.op) in _BIN_OPS:
            return _BIN_OPS[type(current.op)](_eval(current.left), _eval(current.right))
        if isinstance(current, ast.UnaryOp) and type(current.op) in _UNARY_OPS:
            return _UNARY_OPS[type(current.op)](_eval(current.operand))
        if isinstance(current, ast.Num):  # pragma: no cover - python <3.8
            return current.n
        if isinstance(current, ast.Constant) and isinstance(current.value, (int, float)):
            return float(current.value)
        raise ValueError(f"Unsupported expression: {expr}")

    return float(_eval(node))


def _evaluate_formula(formula: str, value: float) -> float:
    expr = formula
    for token in ("income", "minutes", "progress", "cash"):
        expr = re.sub(rf"\\b{token}\\b", str(value), expr)
    return _safe_eval(expr)


def _average_income(definition: Dict) -> float:
    curve = definition.get('quality_curve') or []
    if curve:
        level_zero = curve[0]
        return (level_zero['income_min'] + level_zero['income_max']) / 2
    return float(definition.get('base_income', 0.0))


def _matches_tags(entity_tags: Sequence[str], item_tags: Sequence[str]) -> bool:
    return any(tag in item_tags for tag in entity_tags)


def _resolve_asset_targets(
    key: str, asset_ids: Sequence[str], assets: Dict[str, Dict]
) -> List[str]:
    if key.startswith('asset:'):
        target_id = key.split(':', 1)[1]
        return [target_id] if target_id in asset_ids else []
    if key.startswith('assets[') and key.endswith(']'):
        inner = key[len('assets['):-1]
        if '=' not in inner:
            return []
        field, raw = inner.split('=', 1)
        values = raw.split('|')
        if field == 'tag':
            return [
                asset_id
                for asset_id in asset_ids
                if _matches_tags(values, assets[asset_id].get('tags', []))
            ]
        if field == 'id':
            return [asset_id for asset_id in asset_ids if asset_id in values]
    return []


def _resolve_hustle_targets(
    key: str, hustle_ids: Sequence[str], hustles: Dict[str, Dict]
) -> List[str]:
    if key.startswith('hustle:'):
        target_id = key.split(':', 1)[1]
        return [target_id] if target_id in hustle_ids else []
    if key.startswith('hustles[') and key.endswith(']'):
        inner = key[len('hustles['):-1]
        if '=' not in inner:
            return []
        field, raw = inner.split('=', 1)
        values = raw.split('|')
        if field == 'tag':
            return [
                hustle_id
                for hustle_id in hustle_ids
                if _matches_tags(values, hustles[hustle_id].get('tags', []))
            ]
        if field == 'id':
            return [hustle_id for hustle_id in hustle_ids if hustle_id in values]
    return []


def compute_upgrade_effects(
    data: Dict,
    asset_ids: Sequence[str],
    upgrade_ids: Sequence[str],
    hustle_ids: Sequence[str],
) -> UpgradeEffects:
    effects = UpgradeEffects()
    assets = data['assets']
    hustles = data['hustles']

    for asset_id in asset_ids:
        effects.asset_effects.setdefault(asset_id, EntityEffect())
    for hustle_id in hustle_ids:
        effects.hustle_effects.setdefault(hustle_id, EntityEffect())

    selected = set(upgrade_ids)
    if not selected:
        return effects

    for modifier in data['modifiers']:
        source = modifier['source']
        if source not in selected:
            continue
        target = modifier['target']
        if '.' not in target:
            continue
        entity_key, attribute = target.split('.', 1)
        attribute = attribute.strip()
        mod_type = modifier['type']
        formula = modifier['formula']

        if entity_key.startswith('asset'):
            targets = _resolve_asset_targets(entity_key, asset_ids, assets)
            if not targets or attribute not in {'income', 'setup_time', 'maintenance_time'}:
                continue
            for asset_id in targets:
                effect = effects.asset_effects.setdefault(asset_id, EntityEffect())
                if mod_type == 'multiplier':
                    factor = _evaluate_formula(formula, 1.0)
                    if attribute == 'income':
                        effect.income_mult *= factor
                    elif attribute == 'setup_time':
                        effect.setup_time_mult *= factor
                    elif attribute == 'maintenance_time':
                        effect.maintenance_time_mult *= factor
                elif mod_type in {'flat', 'add'}:
                    delta = _evaluate_formula(formula, 0.0)
                    if attribute == 'income':
                        effect.income_flat += delta
                    elif attribute == 'setup_time':
                        effect.setup_time_mult *= 1.0  # placeholder to ensure source tracking
                    elif attribute == 'maintenance_time':
                        effect.maintenance_time_mult *= 1.0
                effect.sources.add(source)
            continue

        if entity_key.startswith('hustle'):
            targets = _resolve_hustle_targets(entity_key, hustle_ids, hustles)
            if not targets or attribute not in {'income', 'setup_time'}:
                continue
            for hustle_id in targets:
                effect = effects.hustle_effects.setdefault(hustle_id, EntityEffect())
                if mod_type == 'multiplier':
                    factor = _evaluate_formula(formula, 1.0)
                    if attribute == 'income':
                        effect.income_mult *= factor
                    elif attribute == 'setup_time':
                        effect.setup_time_mult *= factor
                elif mod_type in {'flat', 'add'}:
                    delta = _evaluate_formula(formula, 0.0)
                    if attribute == 'income':
                        effect.income_flat += delta
                effect.sources.add(source)
            continue

        if entity_key.startswith('state:time') and attribute == 'bonus' and mod_type in {'flat', 'add'}:
            delta = _evaluate_formula(formula, 0.0)
            effects.time_bonus_minutes += delta
            effects.time_bonus_sources.add(source)

    return effects


def summarize_asset_plan(
    data: Dict,
    asset_ids: Sequence[str],
    upgrade_ids: Sequence[str],
    config: Optional[SimulationConfig] = None,
    hustle_ids: Optional[Sequence[str]] = None,
) -> Tuple[pd.DataFrame, UpgradeEffects]:
    if config is None:
        config = SimulationConfig()

    assets = data['assets']
    upgrade_effects = compute_upgrade_effects(
        data, asset_ids, upgrade_ids, hustle_ids=hustle_ids or []
    )
    rows = []

    for asset_id in asset_ids:
        if asset_id not in assets:
            continue
        definition = assets[asset_id]
        effect = upgrade_effects.asset_effects.get(asset_id, EntityEffect())
        setup_cost = definition['setup_cost']
        maintenance_cost = definition['maintenance_cost']
        base_income = _average_income(definition)

        if asset_id == 'blog':
            setup_cost *= config.blog_setup_cost_multiplier
            maintenance_cost *= config.blog_maintenance_cost_multiplier
            base_income *= config.blog_income_multiplier

        adjusted_income = base_income * effect.income_mult + effect.income_flat
        setup_minutes = definition['schedule']['setup_minutes_per_day'] * effect.setup_time_mult
        maintenance_minutes = definition['maintenance_time'] * effect.maintenance_time_mult

        rows.append(
            {
                'asset_id': asset_id,
                'Asset': definition['name'],
                'Setup Cost ($)': setup_cost,
                'Setup Days': definition['schedule']['setup_days'],
                'Setup Hours/Day': setup_minutes / 60,
                'Maintenance Hours/Day': maintenance_minutes / 60,
                'Maintenance Cost ($)': maintenance_cost,
                'Daily Income ($)': adjusted_income,
                'Upgrade Sources': sorted(effect.sources),
            }
        )

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df[['Asset', 'Setup Cost ($)', 'Setup Days', 'Setup Hours/Day', 'Maintenance Hours/Day', 'Maintenance Cost ($)', 'Daily Income ($)', 'Upgrade Sources', 'asset_id']]
    return df, upgrade_effects


def run_simulation(
    data,
    days: int = 30,
    assistants: int = 0,
    build_blog: bool = True,
    config: Optional[SimulationConfig] = None,
    asset_ids: Optional[Sequence[str]] = None,
    upgrade_ids: Optional[Sequence[str]] = None,
):
    if config is None:
        config = SimulationConfig()

    assets = data['assets']
    hustles = data['hustles']

    if asset_ids is None:
        selected_assets: List[str] = list(config.asset_ids)
        if not selected_assets and build_blog:
            selected_assets = ['blog']
    else:
        selected_assets = list(asset_ids)

    selected_upgrades: List[str] = list(upgrade_ids) if upgrade_ids is not None else list(config.upgrade_ids)

    hustle_ids = ['freelance', 'surveySprint']
    upgrade_effects = compute_upgrade_effects(data, selected_assets, selected_upgrades, hustle_ids=hustle_ids)

    cash = config.starting_cash - assistants * config.assistant_hire_cost
    day_hours = (
        config.base_day_hours
        + assistants * config.assistant_hours_per_day
        + upgrade_effects.time_bonus_minutes / 60
    )
    assistant_daily_cost = (
        assistants * config.assistant_hours_per_day * config.assistant_hourly_rate
    )

    asset_states: List[Dict] = []
    for asset_id in selected_assets:
        if asset_id not in assets:
            continue
        definition = assets[asset_id]
        effect = upgrade_effects.asset_effects.get(asset_id, EntityEffect())
        setup_cost = definition['setup_cost']
        maintenance_cost = definition['maintenance_cost']
        base_income = _average_income(definition)

        if asset_id == 'blog':
            setup_cost *= config.blog_setup_cost_multiplier
            maintenance_cost *= config.blog_maintenance_cost_multiplier
            base_income *= config.blog_income_multiplier

        adjusted_income = base_income * effect.income_mult + effect.income_flat
        setup_minutes_per_day = definition['schedule']['setup_minutes_per_day'] * effect.setup_time_mult
        maintenance_minutes = definition['maintenance_time'] * effect.maintenance_time_mult

        asset_states.append(
            {
                'id': asset_id,
                'name': definition['name'],
                'setup_cost': setup_cost,
                'setup_days_required': definition['schedule']['setup_days'],
                'setup_minutes_per_day': setup_minutes_per_day,
                'maintenance_minutes': maintenance_minutes,
                'maintenance_cost': maintenance_cost,
                'daily_income': adjusted_income,
                'started': False,
                'progress_days': 0,
                'active': False,
            }
        )

    freelance_def = hustles['freelance']
    freelance_effect = upgrade_effects.hustle_effects.get('freelance', EntityEffect())
    freelance_hours = (freelance_def['setup_time'] / 60) * freelance_effect.setup_time_mult
    freelance_income = (
        freelance_def['base_income'] * config.freelance_income_multiplier * freelance_effect.income_mult
        + freelance_effect.income_flat
    )

    survey_def = hustles['surveySprint']
    survey_effect = upgrade_effects.hustle_effects.get('surveySprint', EntityEffect())
    survey_hours = (survey_def['setup_time'] / 60) * survey_effect.setup_time_mult
    survey_income = (
        survey_def['base_income'] * config.survey_income_multiplier * survey_effect.income_mult
        + survey_effect.income_flat
    )
    survey_limit = survey_def['daily_limit']

    records: List[Dict] = []
    metrics = SimulationMetrics(total_days=days)

    for day in range(1, days + 1):
        cash_start = cash
        hours_left = day_hours
        hustle_income_today = 0.0
        asset_income_today = 0.0
        maintenance_spend_today = 0.0
        wages_today = assistant_daily_cost
        setup_hours_today = 0.0
        maintenance_hours_today = 0.0
        hours_spent_hustles = {'freelance': 0.0, 'surveySprint': 0.0}
        hustle_runs_today = {'freelance': 0, 'surveySprint': 0}

        for asset in asset_states:
            if not asset['started'] and cash >= asset['setup_cost']:
                cash -= asset['setup_cost']
                asset['started'] = True
                asset['progress_days'] = 0
                if asset['setup_days_required'] == 0:
                    asset['active'] = True

        for asset in asset_states:
            if asset['started'] and not asset['active']:
                if asset['setup_days_required'] == 0 or asset['setup_minutes_per_day'] == 0:
                    asset['active'] = True
                    continue
                required_hours = asset['setup_minutes_per_day'] / 60
                if hours_left >= required_hours:
                    hours_left -= required_hours
                    setup_hours_today += required_hours
                    asset['progress_days'] += 1
                    if asset['progress_days'] >= asset['setup_days_required']:
                        asset['active'] = True

        active_asset_ids: List[str] = []
        for asset in asset_states:
            if not asset['active']:
                continue
            maintenance_hours = asset['maintenance_minutes'] / 60
            if maintenance_hours > hours_left and maintenance_hours > 0:
                continue
            if maintenance_hours > 0:
                hours_left -= maintenance_hours
                maintenance_hours_today += maintenance_hours
            cash -= asset['maintenance_cost']
            maintenance_spend_today += asset['maintenance_cost']
            cash += asset['daily_income']
            asset_income_today += asset['daily_income']
            metrics.asset_income[asset['id']] = metrics.asset_income.get(asset['id'], 0.0) + asset['daily_income']
            active_asset_ids.append(asset['id'])

        if freelance_hours > 0:
            freelance_runs = int(hours_left // freelance_hours)
        else:
            freelance_runs = 0
        for _ in range(freelance_runs):
            hours_left -= freelance_hours
            hours_spent_hustles['freelance'] += freelance_hours
            cash += freelance_income
            hustle_income_today += freelance_income
            metrics.hustle_income['freelance'] = metrics.hustle_income.get('freelance', 0.0) + freelance_income
            metrics.hustle_runs['freelance'] = metrics.hustle_runs.get('freelance', 0) + 1
            hustle_runs_today['freelance'] += 1

        if survey_hours > 0:
            survey_runs_possible = int(hours_left // survey_hours)
        else:
            survey_runs_possible = 0
        survey_runs = min(survey_runs_possible, survey_limit)
        for _ in range(survey_runs):
            hours_left -= survey_hours
            hours_spent_hustles['surveySprint'] += survey_hours
            cash += survey_income
            hustle_income_today += survey_income
            metrics.hustle_income['surveySprint'] = metrics.hustle_income.get('surveySprint', 0.0) + survey_income
            metrics.hustle_runs['surveySprint'] = metrics.hustle_runs.get('surveySprint', 0) + 1
            hustle_runs_today['surveySprint'] += 1

        cash -= wages_today

        record = {
            'day': day,
            'cash_start': cash_start,
            'cash_end': cash,
            'hustle_income': hustle_income_today,
            'asset_income': asset_income_today,
            'maintenance_spend': maintenance_spend_today,
            'assistant_wages': wages_today,
            'hours_freelance': hours_spent_hustles['freelance'],
            'hours_survey': hours_spent_hustles['surveySprint'],
            'hours_asset_setup': setup_hours_today,
            'hours_asset_maintenance': maintenance_hours_today,
            'freelance_runs': hustle_runs_today['freelance'],
            'survey_runs': hustle_runs_today['surveySprint'],
            'active_assets': ', '.join(active_asset_ids),
            'active_asset_count': len(active_asset_ids),
            'time_bonus_minutes': upgrade_effects.time_bonus_minutes,
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
