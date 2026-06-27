"use strict";
/* exported api */

/* =====================================================================
   Трпеза — backend API calls (the only place that talks to FastAPI)
   ===================================================================== */

const api = {
  async health() {
    const r = await fetch("/api/health");
    if (!r.ok) throw new Error("health " + r.status);
    return r.json();
  },

  // configure an OpenAI key at runtime; resolves to { provider, engine }
  async setKey(key, model) {
    const r = await fetch("/api/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, model: model || null }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || ("key " + r.status));
    return data;
  },

  // "ingredient" | "recipe"
  async classify(q) {
    const r = await fetch("/api/smart?q=" + encodeURIComponent(q));
    if (!r.ok) throw new Error("smart " + r.status);
    return (await r.json()).kind || "ingredient";
  },

  // full 5-stage trace for one ingredient
  async linkIngredient(name) {
    const r = await fetch("/api/link/ingredient?name=" + encodeURIComponent(name));
    if (!r.ok) throw new Error("link " + r.status);
    return r.json();
  },

  // recipe search (up to 100, paged client-side); q = free text, tag = exact category
  async recipes(q, tag) {
    const qs = `q=${encodeURIComponent(q || "")}&tag=${encodeURIComponent(tag || "")}`;
    const r = await fetch(`/api/recipes?${qs}&limit=100&offset=0`);
    if (!r.ok) throw new Error("recipes " + r.status);
    const list = await r.json();
    return Array.isArray(list) ? list : [];
  },

  async recipe(index) {
    const r = await fetch("/api/recipes/" + index);
    if (!r.ok) throw new Error("recipe " + r.status);
    return r.json();
  },

  async linkRecipe(index) {
    const r = await fetch("/api/link/recipe/" + index);
    if (!r.ok) throw new Error("link-recipe " + r.status);
    return r.json();
  },
};
