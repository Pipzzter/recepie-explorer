"use strict";

/* =====================================================================
   Трпеза — client-side router (clean URLs via the History API)

   Each page has a real path — no #hash:
     /              home
     /ingredient    ingredient page
     /recipes       recipe browser
     /recipe/{i}    recipe detail
     /documentation documentation page
   The FastAPI SPA fallback returns index.html for these paths, so deep
   links and refreshes work; this router renders the right page.
   ===================================================================== */

const PATHS = { home: "/", ingredient: "/ingredient", recipes: "/recipes", docs: "/documentation" };

function pathFor(view, arg) {
  if (view === "detail") {
    const idx = (arg != null) ? arg : (state.recipeDetail ? state.recipeDetail.index : "");
    return "/recipe/" + idx;
  }
  return PATHS[view] || "/";
}

// Push a new history entry only when the URL actually changes (avoids dupes
// during initial deep-link routing and popstate-driven renders).
function pushURL(view, arg) {
  const p = pathFor(view, arg);
  if (location.pathname !== p) history.pushState({ view }, "", p);
}

function navigate(view) {
  state.view = view;
  pushURL(view);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- render the active view + wire its events ---------- */
function render() {
  $$(".nav-btn").forEach((b) => {
    const n = b.getAttribute("data-nav");
    const active = (n === "home" && state.view === "home")
      || (n === "ingredient" && state.view === "ingredient")
      || (n === "recipes" && (state.view === "recipes" || state.view === "detail"))
      || (n === "docs" && state.view === "docs");
    b.classList.toggle("active", active);
  });

  const views = {
    home: renderHome,
    ingredient: renderIngredientPage,
    recipes: renderRecipes,
    detail: renderDetail,
    docs: renderDocs,
  };
  APP().innerHTML = `<div class="view">${(views[state.view] || renderHome)()}</div>`;
  bindView();
}

/* ---------- map a URL path → rendered page (initial load + back/forward) ---------- */
function routeTo(path) {
  path = path || location.pathname;
  if (path.startsWith("/recipe/")) {
    const idx = path.slice("/recipe/".length).split("/")[0];
    if (state.recipeDetail && String(state.recipeDetail.index) === idx) { state.view = "detail"; render(); }
    else openRecipe(idx);
    return;
  }
  if (path.startsWith("/recipes")) {
    if (state.recipeList.length) { state.view = "recipes"; render(); }
    else openRecipes(state.recipeQuery || "");
    return;
  }
  if (path.startsWith("/ingredient")) { state.view = "ingredient"; render(); return; }
  if (path.startsWith("/documentation")) { state.view = "docs"; render(); return; }
  state.view = "home";
  render();
}

window.addEventListener("popstate", () => routeTo(location.pathname));

/* ---------- single smart entry point: classify, then route ---------- */
async function smartSearch(q) {
  q = (q || "").trim();
  if (!q || busy) return;
  state.query = q;
  let kind = "ingredient";
  try { kind = await api.classify(q); } catch (_) { /* default to ingredient */ }
  if (kind === "recipe") openRecipes(q);
  else analyze(q);
}

/* ---------- per-render event binding ---------- */
function bindView() {
  const root = APP();

  $$("[data-go]", root).forEach((el) => el.addEventListener("click", () => {
    const dst = el.getAttribute("data-go");
    if (dst === "recipes") openRecipes(state.recipeQuery);
    else navigate(dst);
  }));
  $$("[data-try]", root).forEach((el) => el.addEventListener("click", () =>
    smartSearch(el.getAttribute("data-try"))));

  if (state.view === "home") {
    const submit = () => smartSearch($("#heroInput").value);
    $("#heroSubmit").addEventListener("click", submit);
    $("#heroInput").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    $("#cardTool").addEventListener("click", () => goIngredient());
    $("#cardBrowse").addEventListener("click", () => openRecipes(""));
    $$("[data-recipe]", root).forEach((c) => c.addEventListener("click", () => openRecipe(c.getAttribute("data-recipe"))));
  }

  if (state.view === "ingredient") {
    const submit = () => analyze($("#ingInput").value);
    $("#ingSubmit").addEventListener("click", submit);
    $("#ingInput").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    const tt = $("#traceToggle");
    if (tt) tt.addEventListener("click", toggleTrace);
  }

  if (state.view === "recipes") {
    const go = () => searchRecipes($("#recipeInput").value);
    $("#recipeSearchBtn").addEventListener("click", go);
    $("#recipeInput").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    $$("[data-tag]", root).forEach((b) => b.addEventListener("click", () => filterRecipesByTag(b.getAttribute("data-tag"))));
    $$("[data-recipe]", root).forEach((c) => c.addEventListener("click", () => openRecipe(c.getAttribute("data-recipe"))));
    const prev = $("#pgPrev"), next = $("#pgNext");
    if (prev) prev.addEventListener("click", () => { if (state.recipePage > 0) { state.recipePage--; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
    if (next) next.addEventListener("click", () => { state.recipePage++; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  if (state.view === "detail") {
    $$("[data-ing]", root).forEach((el) => el.addEventListener("click", () => analyze(el.getAttribute("data-ing"))));
    const all = $("#linkAllBtn");
    if (all) all.addEventListener("click", () => analyzeAll(state.recipeDetail.index));
    const it = $("#instrToggle");
    if (it) it.addEventListener("click", () => { state.instrOpen = !state.instrOpen; render(); });
  }
}

// Re-bind only the controls inside #ingBody after a partial re-render.
function bindIngBody() {
  const body = $("#ingBody");
  if (!body) return;
  $$("[data-try]", body).forEach((el) => el.addEventListener("click", () => smartSearch(el.getAttribute("data-try"))));
  $$("[data-go]", body).forEach((el) => el.addEventListener("click", () => {
    const dst = el.getAttribute("data-go");
    if (dst === "recipes") openRecipes(state.recipeQuery); else navigate(dst);
  }));
  const tt = $("#traceToggle", body);
  if (tt) tt.addEventListener("click", toggleTrace);
}

function toggleTrace() {
  state.traceOpen = !state.traceOpen;
  const body = $("#ingBody");
  if (body) { body.innerHTML = ingBodyHTML(); bindIngBody(); }
}
