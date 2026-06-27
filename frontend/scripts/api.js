"use strict";

/* =====================================================================
   Трпеза — backend API calls (the only place that talks to FastAPI)
   ===================================================================== */

const api = {
  async health() {
    const r = await fetch("/api/health");
    if (!r.ok) throw new Error("health " + r.status);
    return r.json();
  },

  // "ingredient" | "recipe"
  async classify(q) {
    const r = await fetch("/smart?q=" + encodeURIComponent(q));
    if (!r.ok) throw new Error("smart " + r.status);
    return (await r.json()).kind || "ingredient";
  },

  // full 5-stage trace for one ingredient
  async linkIngredient(name) {
    const r = await fetch("/link/ingredient?name=" + encodeURIComponent(name));
    if (!r.ok) throw new Error("link " + r.status);
    return r.json();
  },

  // recipe search (up to 100, paged client-side)
  async recipes(q) {
    const r = await fetch(`/recipes?q=${encodeURIComponent(q)}&limit=100&offset=0`);
    if (!r.ok) throw new Error("recipes " + r.status);
    const list = await r.json();
    return Array.isArray(list) ? list : [];
  },

  async recipe(index) {
    const r = await fetch("/recipes/" + index);
    if (!r.ok) throw new Error("recipe " + r.status);
    return r.json();
  },

  async linkRecipe(index) {
    const r = await fetch("/link/recipe/" + index);
    if (!r.ok) throw new Error("link-recipe " + r.status);
    return r.json();
  },
};
