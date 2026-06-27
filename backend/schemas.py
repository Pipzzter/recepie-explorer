"""
API response models (Pydantic) and converters from domain objects.

Keeps the FastAPI I/O contract in one place, separate from the routing in api.py
and the linking logic in the agent package.
"""

from typing import Optional

from pydantic import BaseModel

from backend.agent import AgentTrace


# ---------------------------------------------------------------------------
# Recipe models
# ---------------------------------------------------------------------------

class IngredientInfo(BaseModel):
    quantity: str
    unit: str
    name: str


class RecipeSummary(BaseModel):
    index: int
    title: str
    tags: list[str]
    ingredient_count: int
    source: str
    image: str


class RecipeDetail(BaseModel):
    index: int
    title: str
    tags: list[str]
    source: str
    image: str
    instructions: list[str]
    ingredients: list[IngredientInfo]


# ---------------------------------------------------------------------------
# Agent trace models
# ---------------------------------------------------------------------------

class ToolCallOut(BaseModel):
    name: str
    args: dict
    result_summary: str


class ContextRecipeOut(BaseModel):
    title: str
    usage_note: str


class CandidateOut(BaseModel):
    usda_id: str
    name: str
    score: float
    selected: bool


class TraceOut(BaseModel):
    ingredient_original: str
    detected_language: str
    english_translation: str
    is_ambiguous: bool
    needs_context: bool
    context_recipes: list[ContextRecipeOut]
    search_query: str
    tool_calls: list[ToolCallOut]
    candidates: list[CandidateOut]
    selected_usda_id: Optional[str]
    selected_usda_name: Optional[str]
    confidence: int
    confidence_level: str
    reasoning: str
    product_summary: str
    stages_completed: list[str]
    processing_time_ms: int


class LinkedIngredientOut(BaseModel):
    original: IngredientInfo
    trace: TraceOut


class LinkedRecipeOut(BaseModel):
    recipe: RecipeDetail
    linked_ingredients: list[LinkedIngredientOut]


# ---------------------------------------------------------------------------
# Converters: domain objects → API models
# ---------------------------------------------------------------------------

def trace_to_out(trace: AgentTrace) -> TraceOut:
    return TraceOut(
        ingredient_original=trace.ingredient_original,
        detected_language=trace.detected_language,
        english_translation=trace.english_translation,
        is_ambiguous=trace.is_ambiguous,
        needs_context=trace.needs_context,
        context_recipes=[ContextRecipeOut(title=c.title, usage_note=c.usage_note) for c in trace.context_recipes],
        search_query=trace.search_query,
        tool_calls=[ToolCallOut(name=t.name, args=t.args, result_summary=t.result_summary) for t in trace.tool_calls],
        candidates=[CandidateOut(usda_id=c.usda_id, name=c.name, score=c.score, selected=c.selected) for c in trace.candidates],
        selected_usda_id=trace.selected_usda_id,
        selected_usda_name=trace.selected_usda_name,
        confidence=trace.confidence,
        confidence_level=trace.confidence_level,
        reasoning=trace.reasoning,
        product_summary=trace.product_summary,
        stages_completed=trace.stages_completed,
        processing_time_ms=trace.processing_time_ms,
    )


def recipe_to_detail(idx: int, r: dict) -> RecipeDetail:
    return RecipeDetail(
        index=idx,
        title=r.get("title", ""),
        tags=r.get("tags", []),
        source=r.get("source", ""),
        image=r.get("image", ""),
        instructions=r.get("instructions", []),
        ingredients=[
            IngredientInfo(
                quantity=ing.get("quantity", ""),
                unit=ing.get("unit", ""),
                name=ing.get("name", ""),
            )
            for ing in r.get("ingredients", [])
        ],
    )
