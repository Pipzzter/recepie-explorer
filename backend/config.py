"""Central configuration: dataset paths and API keys (loaded from .env)."""

import os
from pathlib import Path

# Load .env at import time so OPENAI_API_KEY is available.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_PATH = PROJECT_ROOT / "data" / "parsed_recipes.json"
USDA_CSV_PATH = PROJECT_ROOT / "data" / "usdaClasses.csv"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
