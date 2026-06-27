
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

```bash
pip install -r requirements.txt
cp .env.example .env   # add OPENAI_API_KEY
uvicorn backend.api:app --port 8000
```

UI: `http://localhost:8000` — Interactive API docs: `http://localhost:8000/docs`

## Architecture

This is a **Python/FastAPI backend + vanilla JS frontend** for an LLM-driven entity linking system that maps Macedonian food ingredients to USDA FoodData Central entries.

### Key files

Backend — `agent/` is a package, one concern per module:

| File | Role |
|---|---|
| `backend/agent/core.py` | `EntityLinkingAgent` — orchestrates the 5-stage pipeline + LLM calls |
| `backend/agent/models.py` | Dataclasses: `AgentTrace`, `USDACandidate`, `ContextRecipe`, `ToolCall` |
| `backend/agent/usda.py` | `USDASearchTool` + `load_usda_csv` — Jaccard search over the CSV (CSV required, no built-in fallback) |
| `backend/agent/context.py` | `RecipeContextTool` — recipe co-occurrence search |
| `backend/agent/vocabulary.py` | `MK_DICT` + `GENERIC_MK/EN` rule-based fallbacks |
| `backend/agent/__init__.py` | Re-exports the public surface (`EntityLinkingAgent`, `AgentTrace`, …) |
| `backend/api.py` | FastAPI app — endpoints, startup, static mount, SPA fallback for clean URLs |
| `backend/schemas.py` | Pydantic response models + `trace_to_out` / `recipe_to_detail` converters |
| `backend/config.py` | Dataset paths + API keys (loads `.env`) |
| `frontend/` | Static HTML/CSS/JS (see below) served via `StaticFiles` at `/static` |
| `data/parsed_recipes.json` | 36,237 Macedonian recipes used for Stage 3 context retrieval |
| `data/usdaClasses.csv` | 7,793 USDA FoodData Central entries (columns: `Name`, `Index`) — required |

Frontend — `index.html` + classic scripts (shared global scope, loaded in dependency order) and split styles:

| Path | Role |
|---|---|
| `frontend/scripts/{helpers,state,i18n,api}.js` | DOM/format helpers · app state · MK/EN translations · backend calls |
| `frontend/scripts/views/{home,ingredient,recipes,detail,docs}.js` | One file per page (HTML builders + page actions) |
| `frontend/scripts/router.js` | Clean-URL routing (History API), `render`/`navigate`, event binding, `smartSearch` |
| `frontend/scripts/app.js` | Entry point — wires the header, restores language, routes the initial URL, API-key modal |
| `frontend/styles/{base,home,ingredient,recipes,docs,responsive}.css` | Design tokens + per-page styles (responsive loaded last) |

### Routing & pages

Single-page app with **English clean URLs** (no `#hash`): `/` (home), `/ingredient` (ingredient page), `/recipes` (recipe browser), `/recipe/{index}` (recipe detail), `/documentation` (documentation page). The History API drives navigation; FastAPI's catch-all `spa_fallback` returns `index.html` for any non-`/api` path so deep links and refreshes work. The home search bar calls `/api/smart` and redirects to the ingredient or recipe page based on the classification. Default UI language is English (toggle to MK).

### The 5-stage pipeline (`EntityLinkingAgent.link`)

Each call to `agent.link(ingredient)` runs all 5 stages and returns an `AgentTrace` dataclass:

1. **Analyze** — language detect + translate to English (LLM or Cyrillic → `MK_DICT` dictionary)
2. **Decide Context** — is the ingredient ambiguous enough to need recipe co-occurrence? (LLM or `GENERIC_MK/EN` heuristic)
3. **Fetch Context** — `RecipeContextTool.search` substring-matches the original ingredient across all 36k recipes; always runs despite stage 2 output
4. **Search USDA** — `USDASearchTool.search` scores candidates by Jaccard token overlap + long-token boost; LLM may refine the query first
5. **Evaluate** — LLM picks the best candidate by index and returns a confidence + reasoning; falls back to highest keyword score

### LLM provider selection

`EntityLinkingAgent.__init__` uses OpenAI (`gpt-4o-mini`, override with `OPENAI_MODEL`) when a key is available, otherwise a rule-based fallback. The key comes from `.env` via `python-dotenv`, or can be supplied at runtime via `POST /api/key`. All 5 stages execute regardless of mode; only the reasoning quality changes.

### API endpoints

All data endpoints live under `/api` so they never collide with the SPA's English clean URLs.

- `GET /api/link/ingredient?name=павлака` — run pipeline on one ingredient, returns `TraceOut`
- `GET /api/link/recipe/{index}` — run pipeline on every ingredient in a recipe
- `GET /api/recipes?q=...&tag=...&limit=20&offset=0` — search recipes (`q` = fuzzy title/tag, `tag` = exact category)
- `GET /api/recipes/{index}` — single recipe detail
- `GET /api/smart?q=...` — classify free-text as `"ingredient"` or `"recipe"`
- `GET /api/stats` — dataset statistics
- `GET /api/health` — active LLM provider and loaded counts
- `POST /api/key` — configure an OpenAI key at runtime (held in memory only)