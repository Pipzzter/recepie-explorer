"use strict";

/* =====================================================================
   Трпеза — entry point: wire the header, restore language, route.
   ===================================================================== */

async function init() {
  try {
    const saved = localStorage.getItem("trpeza-lang");
    if (saved === "mk" || saved === "en") state.lang = saved;
  } catch (_) {}

  $("#brandHome").addEventListener("click", () => { state.query = ""; navigate("home"); });
  $$("#langToggle button").forEach((b) => b.addEventListener("click", () => setLang(b.getAttribute("data-lang"))));
  $$(".nav-btn").forEach((b) => b.addEventListener("click", () => {
    const n = b.getAttribute("data-nav");
    if (n === "home") { state.query = ""; navigate("home"); }
    else if (n === "ingredient") goIngredient();
    else if (n === "recipes") openRecipes(state.recipeQuery);
  }));

  applyStaticI18n();
  routeTo(location.pathname);   // honour deep links / refreshes

  try {
    const h = await api.health();
    if (h.recipes_loaded) state.recipesTotal = h.recipes_loaded;
    if (h.usda_entries) state.usdaTotal = h.usda_entries;
    $("#modelName").textContent = h.engine || "rule-based";
    if (state.view === "home") render();   // refresh stats once totals arrive
  } catch (_) {
    $("#modelName").textContent = "rule-based";
  }
}

document.addEventListener("DOMContentLoaded", init);
