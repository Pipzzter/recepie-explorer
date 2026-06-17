"""
FastAPI backend for the Entity Linking Explorer.
Exposes endpoints for:
  - Listing / searching recipes from the Macedonian dataset
  - Running the agentic entity linker on a single ingredient
  - Running the full recipe linking pipeline
"""

import json
import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Load .env (repo root) so OPENAI_API_KEY / ANTHROPIC_API_KEY are available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Make the `backend` package importable (e.g. `uvicorn backend.api:app`)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
from backend.agent import AgentTrace, ContextRecipe, EntityLinkingAgent, USDACandidate

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATA_PATH = PROJECT_ROOT / "data" / "parsed_recipes.json"
USDA_CSV_PATH = PROJECT_ROOT / "data" / "usdaClasses.csv"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Entity Linking Explorer API",
    description="Agentic entity linking for Macedonian recipes → USDA FoodData Central",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the static HTML frontend: assets at /static, the page itself at /
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# ---------------------------------------------------------------------------
# Startup: load agent & recipes once
# ---------------------------------------------------------------------------

agent: Optional[EntityLinkingAgent] = None
recipes: list[dict] = []


@app.on_event("startup")
async def startup():
    global agent, recipes
    print("Loading dataset …")
    with open(DATA_PATH, encoding="utf-8") as f:
        recipes = json.load(f)
    print(f"  {len(recipes):,} recipes loaded")

    print("Initialising agent …")
    agent = EntityLinkingAgent(
        recipes_path=str(DATA_PATH),
        usda_csv_path=str(USDA_CSV_PATH),
        anthropic_api_key=ANTHROPIC_API_KEY,
        openai_api_key=OPENAI_API_KEY,
    )
    print("  Agent ready")


# ---------------------------------------------------------------------------
# Pydantic response models
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


class RecipeDetail(BaseModel):
    index: int
    title: str
    tags: list[str]
    source: str
    image: str
    instructions: list[str]
    ingredients: list[IngredientInfo]


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
    stages_completed: list[str]
    processing_time_ms: int


class LinkedIngredientOut(BaseModel):
    original: IngredientInfo
    trace: TraceOut


class LinkedRecipeOut(BaseModel):
    recipe: RecipeDetail
    linked_ingredients: list[LinkedIngredientOut]


# ---------------------------------------------------------------------------
# Helper converters
# ---------------------------------------------------------------------------

def _trace_to_out(trace: AgentTrace) -> TraceOut:
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
        stages_completed=trace.stages_completed,
        processing_time_ms=trace.processing_time_ms,
    )


def _recipe_to_detail(idx: int, r: dict) -> RecipeDetail:
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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def index():
    """Serve the roadmap frontend."""
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "recipes_loaded": len(recipes),
        "usda_entries": agent.usda_tool.size if agent else 0,
        "provider": agent.provider if agent else None,
        "engine": (agent.model if (agent and agent.client) else "rule-based (no API key)"),
    }


@app.get("/smart")
async def smart(q: str = Query(..., description="Free-text query — ingredient or recipe")):
    """Classify the query so the UI can route it: 'ingredient' (run the roadmap) or 'recipe' (browse recipes)."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialised")
    return {"query": q, "kind": agent.classify_query(q)}


@app.get("/recipes", response_model=list[RecipeSummary])
async def list_recipes(
    q: str = Query("", description="Search in title or tags"),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
):
    """List / search recipes from the dataset."""
    filtered = recipes
    if q:
        ql = q.lower()
        filtered = [
            r for r in recipes
            if ql in r.get("title", "").lower()
            or any(ql in tag.lower() for tag in r.get("tags", []))
        ]

    page = filtered[offset: offset + limit]
    return [
        RecipeSummary(
            index=recipes.index(r),
            title=r.get("title", ""),
            tags=r.get("tags", []),
            ingredient_count=len(r.get("ingredients", [])),
            source=r.get("source", ""),
        )
        for r in page
    ]


@app.get("/recipes/{index}", response_model=RecipeDetail)
async def get_recipe(index: int):
    """Get a single recipe by its index in the dataset."""
    if index < 0 or index >= len(recipes):
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _recipe_to_detail(index, recipes[index])


@app.get("/link/ingredient", response_model=TraceOut)
async def link_ingredient(name: str = Query(..., description="Ingredient name (Macedonian or English)")):
    """
    Run the agentic entity linker on a single ingredient.
    Returns the full 5-stage reasoning trace.
    """
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialised")
    trace = agent.link(name)
    return _trace_to_out(trace)


@app.get("/link/recipe/{index}", response_model=LinkedRecipeOut)
async def link_recipe(index: int):
    """
    Run the agentic entity linker on all ingredients of a recipe.
    Returns the recipe plus a reasoning trace for each ingredient.
    """
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialised")
    if index < 0 or index >= len(recipes):
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe = recipes[index]
    result = agent.link_recipe(recipe)

    linked = []
    for item in result["linked_ingredients"]:
        original_ing = item["original"]
        trace = item["trace"]
        linked.append(LinkedIngredientOut(
            original=IngredientInfo(
                quantity=original_ing.get("quantity", ""),
                unit=original_ing.get("unit", ""),
                name=original_ing.get("name", ""),
            ),
            trace=_trace_to_out(trace),
        ))

    return LinkedRecipeOut(
        recipe=_recipe_to_detail(index, recipe),
        linked_ingredients=linked,
    )


@app.get("/stats")
async def stats():
    """Dataset statistics."""
    total = len(recipes)
    with_ing = sum(1 for r in recipes if r.get("ingredients"))
    all_tags = [tag for r in recipes for tag in r.get("tags", [])]
    from collections import Counter
    top_tags = Counter(all_tags).most_common(15)
    return {
        "total_recipes": total,
        "recipes_with_ingredients": with_ing,
        "top_tags": [{"tag": t, "count": c} for t, c in top_tags],
    }
