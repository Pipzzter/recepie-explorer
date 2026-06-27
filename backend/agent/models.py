"""Domain data structures produced by the entity-linking pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ToolCall:
    name: str
    args: dict
    result_summary: str


@dataclass
class ContextRecipe:
    title: str
    usage_note: str


@dataclass
class USDACandidate:
    usda_id: str
    name: str
    score: float
    selected: bool = False


@dataclass
class AgentTrace:
    ingredient_original: str
    detected_language: str
    english_translation: str
    is_ambiguous: bool = False
    needs_context: bool = False
    context_recipes: list[ContextRecipe] = field(default_factory=list)
    search_query: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    candidates: list[USDACandidate] = field(default_factory=list)
    selected_usda_id: str | None = None
    selected_usda_name: str | None = None
    confidence: int = 0
    confidence_level: str = "low"
    reasoning: str = ""
    product_summary: str = ""
    stages_completed: list[str] = field(default_factory=list)
    processing_time_ms: int = 0
