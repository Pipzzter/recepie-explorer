"""
Recipe context tool (Stage 3).

Substring-matches an ingredient across the 36k Macedonian recipe dataset and
returns a few real co-occurrence examples used to disambiguate the USDA search.
"""

import json
import random

from .models import ContextRecipe


class RecipeContextTool:
    def __init__(self, recipes_path: str):
        print("Loading recipe dataset …", flush=True)
        with open(recipes_path, encoding="utf-8") as f:
            self.recipes: list[dict] = json.load(f)
        print(f"  {len(self.recipes):,} recipes loaded", flush=True)

    def search(self, ingredient_name: str, top_k: int = 5) -> list[ContextRecipe]:
        needle = ingredient_name.lower().strip()
        matches: list[tuple[dict, str]] = []
        for recipe in self.recipes:
            for ing in recipe.get("ingredients", []):
                ing_name = ing.get("name", "").lower()
                if len(needle) >= 3 and needle in ing_name:
                    qty = f"{ing.get('quantity', '')} {ing.get('unit', '')}".strip()
                    usage = f"{qty} — {ing.get('name', '')}" if qty else ing.get("name", "")
                    matches.append((recipe, usage))
                    break
        random.shuffle(matches)
        return [
            ContextRecipe(title=r.get("title", "Непознат рецепт"), usage_note=u)
            for r, u in matches[:top_k]
        ]
