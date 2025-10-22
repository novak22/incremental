"""Legacy helper for extracting tuning parameters from archived economy docs."""

import csv
import re
from pathlib import Path


def find_repo_root(path: Path) -> Path:
    """Walk up from ``path`` until a ``.git`` directory is found."""

    for candidate in path.resolve().parents:
        if (candidate / ".git").is_dir():
            return candidate
    return path.resolve().parent


ROOT = find_repo_root(Path(__file__))
FILES = [
    # Historical handbook that originally powered the export before the quickref era.
    ROOT / "docs" / "archive" / "economy" / "economy.md",
    ROOT / "docs" / "normalized_economy.json",
]


citation_pattern = re.compile(r"【[^】]*】")
number_pattern = re.compile(r"\d+(?:\.\d+)?")
fraction_pattern = re.compile(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)")


def detect_units(prefix: str, suffix: str) -> str:
    prefix_window = prefix[-12:]
    suffix_window = suffix[:32]
    prefix_lower = prefix[-40:].lower()
    suffix_lower = suffix_window.lower()

    if "$" in prefix_window:
        return "usd"
    if suffix_lower.strip().startswith("%") or prefix_window.strip().endswith("%"):
        return "percent"

    cleaned_suffix = suffix_lower.lstrip(" `\"'(")
    word_match = re.match(r"([a-z_]+)", cleaned_suffix)
    word = word_match.group(1) if word_match else ""

    if word in {"minutes", "minute", "min"}:
        return "minutes"
    if word in {"hours", "hour", "hr", "hrs"}:
        return "hours"
    if word in {"days", "day"}:
        return "days"
    if word in {"xp"} or "xp" in prefix_lower:
        return "xp"
    if word in {"level", "levels"}:
        return "level"
    if word in {"posts", "chapters", "videos", "shoots", "research", "listings", "ads", "reviews", "seo", "covers", "episodes", "promos", "features", "stability", "edge", "marketing"}:
        return "count"
    if "requires" in prefix_lower and word:
        return "count"
    return ""


def detect_category(window: str, units: str) -> str:
    text = window.lower()
    normalized = re.sub(r"[^a-z0-9\s]", " ", text.replace("_", " "))
    tokens = set(normalized.split())
    if units == "xp" or "xp" in tokens:
        return "xp"
    if units in {"minutes", "hours", "days"} or any(word in tokens for word in ["hour", "hours", "time", "minute", "minutes", "day", "days"]):
        return "time"
    if any(word in tokens for word in ["limit", "cap", "max", "maximum", "clamp", "capped"]):
        return "limit"
    if units == "usd" or any(word in tokens for word in ["cost", "tuition", "wage", "wages", "hire", "purchase", "price", "pay", "pays", "spend", "spent", "salary", "salaries"]):
        return "cost"
    if units == "percent" or any(word in tokens for word in ["mult", "multiplier", "bonus", "boost", "variance", "payout", "income", "earn", "earns", "earning", "earnings", "wage", "wages", "salary", "salaries"]):
        return "income"
    if any(word in tokens for word in ["require", "requires", "required", "needs", "minimum", "posts", "chapters", "videos", "shoots", "features", "stability", "marketing", "ads", "reviews", "seo", "edge", "count", "counts", "listing", "listings"]):
        return "requirement"
    if any(word in tokens for word in ["level", "levels", "threshold", "tier", "tiers"]):
        return "progression"
    return "other"


def detect_impact(window: str) -> str:
    text = window.lower()
    if any(word in text for word in ["limit", "cap", "max", "clamp", "capped"]):
        return "cap"
    if any(word in text for word in ["mult", "variance", "bonus", "boost", "double", "increase", "decrease", "add", "plus", "minus"]):
        return "linear"
    return "linear"


def clean_context(line: str) -> str:
    return " ".join(line.strip().split())


def extract_from_file(path: Path):
    entries = []
    with path.open("r", encoding="utf-8") as fh:
        for idx, line in enumerate(fh, start=1):
            filtered = citation_pattern.sub("", line)
            stripped = filtered.lstrip()
            if stripped.startswith("#"):
                filtered = re.sub(r"^\s*#+\s*\d*\.*\s*", "", filtered)
            base_context = clean_context(filtered)
            line_to_scan = filtered
            used_spans = []
            for match in fraction_pattern.finditer(line_to_scan):
                num = float(match.group(1))
                den = float(match.group(2))
                if den == 0:
                    continue
                value = num / den
                start, end = match.span()
                prefix = line_to_scan[:start]
                suffix = line_to_scan[end:]
                units = detect_units(prefix, suffix)
                window = (prefix[-40:] + match.group(0) + suffix[:40])
                category = detect_category(window, units)
                impact = detect_impact(window)
                entries.append(
                    {
                        "parameter": base_context,
                        "value": f"{value:.10g}",
                        "units": units,
                        "category": category,
                        "impact": impact,
                        "source": f"{path.relative_to(ROOT)}:L{idx}",
                    }
                )
                used_spans.append((match.start(1), match.end(1)))
                used_spans.append((match.start(2), match.end(2)))

            for match in number_pattern.finditer(line_to_scan):
                span = match.span()
                if any(s <= span[0] < e or s < span[1] <= e for s, e in used_spans):
                    continue
                value = match.group(0)
                start, end = span
                prefix = line_to_scan[:start]
                suffix = line_to_scan[end:]
                units = detect_units(prefix, suffix)
                window = (prefix[-40:] + value + suffix[:40])
                category = detect_category(window, units)
                impact = detect_impact(window)
                entries.append(
                    {
                        "parameter": base_context,
                        "value": value,
                        "units": units,
                        "category": category,
                        "impact": impact,
                        "source": f"{path.relative_to(ROOT)}:L{idx}",
                    }
                )
    return entries


def main():
    all_entries = []
    for path in FILES:
        all_entries.extend(extract_from_file(path))

    # remove duplicate rows
    seen = set()
    deduped = []
    for entry in all_entries:
        key = (
            entry["source"],
            entry["value"],
            entry["units"],
            entry["category"],
            entry["impact"],
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)

    output_path = ROOT / "tuning_parameters.csv"
    with output_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(
            csvfile,
            fieldnames=["parameter", "value", "units", "category", "impact", "source"],
        )
        writer.writeheader()
        writer.writerows(deduped)


if __name__ == "__main__":
    main()
