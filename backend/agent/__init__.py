"""
Agentic entity-linking package.

Public surface kept stable so callers can simply do:
    from backend.agent import EntityLinkingAgent, AgentTrace
"""

from .core import EntityLinkingAgent
from .models import AgentTrace, ContextRecipe, ToolCall, USDACandidate

__all__ = [
    "EntityLinkingAgent",
    "AgentTrace",
    "ContextRecipe",
    "ToolCall",
    "USDACandidate",
]
