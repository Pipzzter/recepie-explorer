"""
USDA FoodData Central search (Stage 4).

Loads the real 7,793-entry dataset from ``data/usdaClasses.csv`` and ranks
candidates by Jaccard token overlap with a long-token boost. The dataset is
required — there is no built-in fallback, so the app always works from real data.
"""

import csv
import re
from pathlib import Path

from .models import USDACandidate


def load_usda_csv(csv_path: str) -> list[dict]:
    """Load USDA food entries from a CSV with columns ``Name`` and ``Index``."""
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(
            f"USDA dataset not found at {csv_path!r}. "
            "The real USDA CSV (data/usdaClasses.csv) is required."
        )

    entries: list[dict] = []
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("Name") or "").strip()
            idx = (row.get("Index") or "").strip()
            if name and idx:
                entries.append({"id": idx, "name": name})
    print(f"  {len(entries):,} USDA entries loaded from CSV", flush=True)
    return entries


class USDASearchTool:
    """Keyword + Jaccard similarity search over the USDA dataset."""

    def __init__(self, csv_path: str):
        self.database = load_usda_csv(csv_path)
        if not self.database:
            raise RuntimeError(
                f"No USDA entries were loaded from {csv_path!r}. "
                "The real USDA dataset is required for entity linking."
            )

    @property
    def size(self) -> int:
        return len(self.database)

    def search(self, query: str, top_k: int = 10) -> list[USDACandidate]:
        query_tokens = set(re.findall(r"\w+", query.lower()))
        scored: list[tuple[float, dict]] = []
        for entry in self.database:
            entry_tokens = set(re.findall(r"\w+", entry["name"].lower()))
            if not entry_tokens:
                continue
            overlap = len(query_tokens & entry_tokens)
            union = len(query_tokens | entry_tokens)
            score = overlap / union if union else 0.0
            for token in query_tokens:
                if len(token) > 4 and token in entry["name"].lower():
                    score = min(1.0, score + 0.12)
            scored.append((round(score, 3), entry))

        scored.sort(key=lambda x: x[0], reverse=True)
        seen, results = set(), []
        for score, entry in scored:
            if entry["id"] in seen:
                continue
            seen.add(entry["id"])
            results.append(USDACandidate(usda_id=entry["id"], name=entry["name"], score=score))
            if len(results) >= top_k:
                break
        return results
