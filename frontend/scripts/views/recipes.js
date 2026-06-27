"use strict";

/* =====================================================================
   Трпеза — RECIPES page: browser grid, tag filters, pagination
   ===================================================================== */

const TAG_FILTERS = ["", "десерт", "ручек", "сирење", "торта", "салата"];

function renderRecipes() {
  const total = state.recipeList.length;
  const start = state.recipePage * PAGE_SIZE;
  const page = state.recipeList.slice(start, start + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tags = TAG_FILTERS.map((tg) => {
    const active = (tg === "" ? state.recipeQuery === "" : state.recipeQuery === tg);
    const label = tg === "" ? t("rec.all") : tg;
    const style = active
      ? "color:#FFF8EC;background:#C0562F;border-color:#C0562F"
      : "color:#6B6155;background:#FFFDF8;border-color:#E7D7BC";
    return `<button class="chip" data-tag="${esc(tg)}" style="${style};font-family:var(--sans)">${esc(label)}</button>`;
  }).join("");

  const cards = page.map((r) => `
    <div class="recipe-card" data-recipe="${r.index}">
      <div class="rc-photo" style="background:${hueGradient(r.index)}">
        <div class="photo-tag">${esc(t("det.photo"))}</div>
        <div class="scrim"></div>
        <div class="rc-ing">${r.ingredient_count} ${esc(t("rec.ingredients"))}</div>
      </div>
      <div class="rc-body">
        <h3>${esc(r.title)}</h3>
        <div class="rc-tags">${(r.tags || []).slice(0, 3).map((tg) => `<span class="rc-tag">${esc(tg)}</span>`).join("")}</div>
      </div>
    </div>`).join("");

  const body = total === 0
    ? `<p class="muted">${state.recipeQuery ? t("rec.empty", { q: esc(state.recipeQuery) }) : ""}</p>`
    : `<div class="recipe-grid">${cards}</div>
       <div class="pager">
         <button class="pg-btn" id="pgPrev" ${state.recipePage === 0 ? "disabled" : ""}>${esc(t("rec.prev"))}</button>
         <span class="pg-info">${t("rec.page", { n: state.recipePage + 1, total: totalPages })}</span>
         <button class="pg-btn" id="pgNext" ${start + PAGE_SIZE >= total ? "disabled" : ""}>${esc(t("rec.next"))}</button>
       </div>`;

  return `
  <main class="recipes-wrap">
    <div class="recipes-head">
      <div>
        <div class="eyebrow">${esc(t("rec.kicker"))}</div>
        <h2>${esc(t("rec.title"))}</h2>
      </div>
      <div class="recipes-count">${t("rec.showing", { n: Math.min(PAGE_SIZE, Math.max(0, total - start)), total: fmt(total) })}</div>
    </div>

    <div class="recipe-search">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#B6AB9B" stroke-width="1.8"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg>
      <input id="recipeInput" type="text" autocomplete="off" value="${esc(state.recipeQuery)}" placeholder="${esc(t("rec.ph"))}">
      <button id="recipeSearchBtn">${esc(t("rec.search"))}</button>
    </div>
    <div class="try-row" style="margin-bottom:28px">${tags}</div>

    ${body}
  </main>`;
}

/* ---------- fetch + show the recipe browser ---------- */
async function openRecipes(q) {
  q = (q || "").trim();
  state.recipeQuery = q;
  state.recipePage = 0;
  state.view = "recipes";
  pushURL("recipes");
  APP().innerHTML = `<div class="view"><main class="recipes-wrap">
    <div class="recipes-head"><div><div class="eyebrow">${esc(t("rec.kicker"))}</div><h2>${esc(t("rec.title"))}</h2></div></div>
    <div class="inline-loader"><span class="spinner"></span> ${esc(t("rec.loading"))}</div></main></div>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
  try {
    state.recipeList = await api.recipes(q);
  } catch (_) {
    state.recipeList = [];
  }
  render();
}
