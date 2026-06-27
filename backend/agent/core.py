"""
Agentic Entity Linking Agent — orchestrates the 5-stage pipeline:
  1. Analyze        — language detection + translation
  2. Decide Context — ambiguity check
  3. Fetch Context  — recipe co-occurrence (always run for a consistent trace)
  4. Search USDA    — keyword similarity over the 7,793-entry USDA dataset
  5. Evaluate       — LLM reasoning or heuristic fallback

LLM priority: OpenAI → rule-based fallback
"""

from __future__ import annotations

import json
import os
import time

from .context import RecipeContextTool
from .models import AgentTrace, ContextRecipe, ToolCall, USDACandidate
from .usda import USDASearchTool
from .vocabulary import GENERIC_EN, GENERIC_MK, MK_DICT

# OpenAI (LLM provider)
try:
    from openai import OpenAI as _OpenAI
    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False


class EntityLinkingAgent:

    def __init__(
        self,
        recipes_path: str,
        usda_csv_path: str,
        openai_api_key: str | None = None,
        model: str | None = None,
    ):
        self.provider: str | None = None
        self.client = None
        self.model = model

        oai_key = openai_api_key or os.environ.get("OPENAI_API_KEY", "")
        if oai_key and _OPENAI_AVAILABLE:
            try:
                self.client = _OpenAI(api_key=oai_key)
                self.provider = "openai"
                self.model = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
                print(f"  LLM: OpenAI ({self.model})", flush=True)
            except Exception as e:
                print(f"  [!] OpenAI init failed: {e}", flush=True)

        if not self.client:
            print("  LLM: rule-based fallback (no API key configured)", flush=True)

        self.recipe_tool = RecipeContextTool(recipes_path)
        self.usda_tool = USDASearchTool(usda_csv_path)

    # ------------------------------------------------------------------
    # Runtime configuration — let the user supply an OpenAI key from the UI
    # ------------------------------------------------------------------
    def configure_openai(self, api_key: str, model: str | None = None) -> bool:
        """Enable (or replace) the OpenAI client from a user-supplied key.

        Returns True only if the key initialises a working client (verified with
        a cheap, token-free auth check). The key lives only in memory on this
        agent instance — it is never logged or written to disk.
        """
        api_key = (api_key or "").strip()
        if not api_key or not _OPENAI_AVAILABLE:
            return False
        try:
            client = _OpenAI(api_key=api_key)
            client.models.list()  # cheap auth check — fails fast on a bad key
        except Exception as e:
            print(f"  [!] OpenAI key rejected: {type(e).__name__}", flush=True)
            return False

        self.client = client
        self.provider = "openai"
        self.model = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        print(f"  LLM: OpenAI ({self.model}) — configured at runtime", flush=True)
        return True

    # ------------------------------------------------------------------
    # LLM call — OpenAI chat completions
    # ------------------------------------------------------------------
    def _llm(self, system: str, user: str, json_mode: bool = False) -> str:
        if not self.client:
            return ""

        kwargs: dict = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0,
            "max_tokens": 800,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        try:
            resp = self.client.chat.completions.create(**kwargs)
            return resp.choices[0].message.content or ""
        except Exception as e:
            print(f"OpenAI error: {e}", flush=True)
            return ""

    # ------------------------------------------------------------------
    # Stage 1 — Analyze
    # ------------------------------------------------------------------
    def _stage_analyze(self, ingredient: str) -> tuple[str, str]:
        raw = self._llm(
            "You are given one food ingredient. Detect its language (BCP-47 code) and "
            "translate it to English. The 'english' value must be ONLY the food name — "
            "no labels or extra words. "
            "Respond ONLY with JSON: {\"language\": \"mk\", \"english\": \"...\"}.",
            f"Ingredient: {ingredient}",
            json_mode=True,
        )
        if raw:
            try:
                p = json.loads(raw)
                eng = str(p.get("english") or ingredient).strip()
                if eng.lower().startswith("ingredient:"):
                    eng = eng.split(":", 1)[1].strip()
                return p.get("language", "mk"), eng or ingredient
            except Exception:
                pass

        # Fallback: Cyrillic detection + dictionary lookup
        has_cyrillic = any("Ѐ" <= ch <= "ӿ" for ch in ingredient)
        if has_cyrillic:
            lower = ingredient.lower().strip()
            if lower in MK_DICT:
                return "mk", MK_DICT[lower]
            best_key, best_val = "", ""
            for key, val in MK_DICT.items():
                if lower.startswith(key) and len(key) > len(best_key):
                    best_key, best_val = key, val
            if best_val:
                return "mk", best_val
            for key, val in sorted(MK_DICT.items(), key=lambda x: -len(x[0])):
                if key in lower:
                    return "mk", val
            tokens = lower.split()
            translations = [MK_DICT[tok] for tok in tokens if tok in MK_DICT]
            if translations:
                return "mk", " ".join(translations)
            return "mk", ingredient
        return "en", ingredient

    # ------------------------------------------------------------------
    # Stage 2 — Decide Context
    # ------------------------------------------------------------------
    def _stage_decide_context(self, ingredient: str, english: str) -> bool:
        raw = self._llm(
            "Is this ingredient ambiguous enough to need recipe context for USDA mapping? "
            "Respond ONLY with JSON: {\"needs_context\": true/false, \"reason\": \"...\"}.",
            f"Original: {ingredient}\nEnglish: {english}",
            json_mode=True,
        )
        if raw:
            try:
                return bool(json.loads(raw).get("needs_context", False))
            except Exception:
                pass

        tokens = set(ingredient.lower().split()) | set(english.lower().split())
        return bool(tokens & (GENERIC_MK | GENERIC_EN))

    # ------------------------------------------------------------------
    # Stage 4 — Query formulation
    # ------------------------------------------------------------------
    def _formulate_query(self, english: str, context: list[ContextRecipe]) -> str:
        if not context:
            return english
        ctx = "\n".join(f"- {c.title}: {c.usage_note}" for c in context[:3])
        raw = self._llm(
            "Given an ingredient and how it is used in recipes, write a short USDA "
            "FoodData Central search query — just the food name (2–4 words), with no "
            "words like 'recipe' or 'dish'. "
            "Respond ONLY with JSON: {\"query\": \"...\"}.",
            f"Ingredient: {english}\nUsed in:\n{ctx}",
            json_mode=True,
        )
        if raw:
            try:
                return json.loads(raw).get("query", english)
            except Exception:
                pass
        return english

    # ------------------------------------------------------------------
    # Stage 5 — Evaluate & Select
    # ------------------------------------------------------------------
    def _stage_evaluate(
        self,
        ingredient_original: str,
        english: str,
        candidates: list[USDACandidate],
        context: list[ContextRecipe],
    ) -> tuple[USDACandidate | None, int, str, str]:
        if not candidates:
            return None, 0, "low", "No USDA candidates found."

        cand_text = "\n".join(
            f"{i+1}. [{c.usda_id}] {c.name} (score: {c.score})"
            for i, c in enumerate(candidates[:8])
        )
        ctx_text = (
            "\n".join(f"- {c.title}: {c.usage_note}" for c in context[:3])
            if context else "No context."
        )
        raw = self._llm(
            "Pick the USDA entry that best matches the ingredient. Choose the CLOSEST "
            "available candidate even if it is more or less specific than the ingredient; "
            "for a generic ingredient prefer a plain, representative entry. Use "
            "selected_index 0 (no match) ONLY when none of the candidates is even the same "
            "kind of food. "
            "Respond ONLY with JSON: {\"selected_index\": 1, \"confidence\": 85, "
            "\"reasoning\": \"...\"}. "
            "selected_index is 1-based (0 = no match). confidence is 0–100.",
            f"Ingredient: {ingredient_original} / {english}\n"
            f"Context:\n{ctx_text}\nCandidates:\n{cand_text}",
            json_mode=True,
        )
        if raw:
            try:
                p = json.loads(raw)
                idx = int(p.get("selected_index", 1)) - 1
                conf = min(100, max(0, int(p.get("confidence", 70))))
                reason = p.get("reasoning", "")
                if idx == -1:
                    # The model judged that none of the candidates is a good match.
                    return None, conf, "low", (
                        reason or "No suitable USDA entry among the candidates."
                    )
                if 0 <= idx < len(candidates):
                    lv = "high" if conf >= 80 else "med" if conf >= 55 else "low"
                    return candidates[idx], conf, lv, reason
            except Exception:
                pass

        # Fallback: best keyword score (used when the LLM gave no usable answer, or no LLM is set).
        best = max(candidates, key=lambda c: c.score)
        if best.score < 0.08:
            # Nothing overlaps meaningfully — report honestly instead of a 0% guess.
            note = (
                "No candidate is a close match, and the language model did not "
                "return a usable choice."
                if self.client else
                "No close keyword match and no LLM configured — add an API key "
                "for smarter matching."
            )
            return None, 0, "low", note
        conf = int(min(100, best.score * 110))
        lv = "high" if conf >= 80 else "med" if conf >= 55 else "low"
        reason = (
            f"Selected by keyword similarity ({best.score:.2f}); the language model "
            "did not return a usable choice."
            if self.client else
            f"Rule-based selection: highest keyword similarity ({best.score:.2f}). "
            "Add an API key for LLM-driven reasoning."
        )
        return best, conf, lv, reason

    # ------------------------------------------------------------------
    # Query classification — ingredient vs recipe (for the unified search)
    # ------------------------------------------------------------------
    def classify_query(self, query: str) -> str:
        """Return "ingredient" or "recipe" for a free-text search query."""
        q = query.strip()
        raw = self._llm(
            "A user typed a query into a cooking app's search box. Decide whether it is "
            "a single food INGREDIENT to look up (e.g. 'sour cream', 'павлака', "
            "'olive oil') or a RECIPE / DISH search "
            "(e.g. 'chocolate cake', 'торта', 'chicken soup', 'cake'). "
            "Respond ONLY with JSON: {\"kind\": \"ingredient\"} or {\"kind\": \"recipe\"}.",
            f"Query: {q}",
            json_mode=True,
        )
        if raw:
            try:
                kind = str(json.loads(raw).get("kind", "")).lower().strip()
                if kind in ("ingredient", "recipe"):
                    return kind
            except Exception:
                pass
        # Heuristic fallback when no LLM: longer phrases are usually dishes/recipes.
        return "recipe" if len(q.split()) >= 3 else "ingredient"

    # ------------------------------------------------------------------
    # Product summary — short LLM description of the chosen USDA entry
    # ------------------------------------------------------------------
    def _summarize_product(self, ingredient_original: str, english: str, usda_name: str) -> str:
        """One- or two-sentence description of the chosen USDA product.

        Uses the existing LLM; no extra API key.
        """
        if not self.client:
            return ""
        return self._llm(
            "In ONE or TWO short sentences, describe the USDA food product for someone "
            "who mapped a Macedonian cooking ingredient to it. Say what the product is "
            "and its general nutritional character (e.g. high in fat, protein or carbs; "
            "calorie-dense; low-fat). Plain text, no lists.",
            f"Macedonian ingredient: {ingredient_original} ({english})\n"
            f"Chosen USDA product: {usda_name}",
        ).strip()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def link(self, ingredient_name: str) -> AgentTrace:
        t0 = time.time()
        trace = AgentTrace(
            ingredient_original=ingredient_name,
            detected_language="",
            english_translation="",
        )

        lang, english = self._stage_analyze(ingredient_name)
        trace.detected_language = lang
        trace.english_translation = english
        trace.stages_completed.append("analyze")

        needs_ctx = self._stage_decide_context(ingredient_name, english)
        trace.is_ambiguous = needs_ctx
        trace.needs_context = needs_ctx
        trace.stages_completed.append("decide_context")

        # Always fetch recipe context so the roadmap consistently shows real co-occurrence data.
        context = self.recipe_tool.search(ingredient_name, top_k=5)
        trace.context_recipes = context
        trace.tool_calls.append(ToolCall(
            name="get_recipe_context",
            args={"ingredient": ingredient_name, "top_k": 5},
            result_summary=f"Found {len(context)} recipe(s) using this ingredient",
        ))
        trace.stages_completed.append("fetch_context")

        query = self._formulate_query(english, context)
        trace.search_query = query

        candidates = self.usda_tool.search(query, top_k=10)
        trace.candidates = candidates
        trace.tool_calls.append(ToolCall(
            name="search_usda_classes",
            args={"query": query, "top_k": 10},
            result_summary=(
                f"Found {len(candidates)} USDA candidates from "
                f"{self.usda_tool.size:,}-entry database"
            ),
        ))
        trace.stages_completed.append("search_usda")

        best, conf, lv, reason = self._stage_evaluate(
            ingredient_name, english, candidates, context
        )
        if best:
            best.selected = True
            trace.selected_usda_id = best.usda_id
            trace.selected_usda_name = best.name
            trace.product_summary = self._summarize_product(ingredient_name, english, best.name)
        trace.confidence = conf
        trace.confidence_level = lv
        trace.reasoning = reason
        trace.stages_completed.append("evaluate")

        trace.processing_time_ms = int((time.time() - t0) * 1000)
        return trace

    def link_recipe(self, recipe: dict) -> dict:
        results = []
        for ing in recipe.get("ingredients", []):
            name = ing.get("name", "").strip()
            if not name:
                continue
            results.append({"original": ing, "trace": self.link(name)})
        return {"linked_ingredients": results}
