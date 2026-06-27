"use strict";

/* =====================================================================
   Трпеза — RECIPE DETAIL page: ingredients, instructions, link-all
   ===================================================================== */

function renderDetail() {
  const r = state.recipeDetail;
  if (!r) return renderRecipes();
  const ings = (r.ingredients || []).filter((x) => x.name);
  const qtyOf = (x) => `${x.quantity || ""} ${x.unit || ""}`.trim();
  const meta = (r.tags || []).slice(0, 2).join(" · ");

  return `
  <main class="detail-wrap">
    <button class="back-link" data-go="recipes">${esc(t("det.back"))}</button>
    <div class="detail-cols">
      <div class="detail-photo" style="background:${hueGradient(r.index)}">
        ${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.title)}" onerror="this.remove()">` : ""}
        <div class="photo-tag">${esc(t("det.photo"))}</div>
        <div class="scrim"></div>
      </div>
      <div>
        ${meta ? `<div class="detail-meta">${esc(meta)}</div>` : ""}
        <h1>${esc(r.title)}</h1>
        <div class="detail-tags">${(r.tags || []).slice(0, 8).map((tg) => `<span class="detail-tag">${esc(tg)}</span>`).join("")}</div>
        ${r.source ? `<a class="detail-src" href="${esc(r.source)}" target="_blank" rel="noopener">${esc(t("det.source"))}</a>` : ""}

        <div class="ingr-card">
          <div class="ingr-head"><span class="t">${esc(t("det.ingredients"))}</span><span class="c">${t("det.items", { n: ings.length })}</span></div>
          ${ings.length
            ? ings.map((x) => `<div class="ingr-row">
                <span class="ingr-qty">${esc(qtyOf(x))}</span>
                <span class="ingr-name" data-ing="${esc(x.name)}">${esc(x.name)}</span>
                <button class="ingr-link" data-ing="${esc(x.name)}">${esc(t("det.link"))}</button>
              </div>`).join("")
            : `<div class="ingr-row"><span class="muted">${esc(t("det.noIngredients"))}</span></div>`}
        </div>

        ${ings.length ? `<button class="btn-block" id="linkAllBtn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF8EC" stroke-width="1.8"><path d="M12 3v6"></path><circle cx="12" cy="14" r="6"></circle></svg>
          ${esc(t("det.linkAll"))}
        </button>` : ""}
      </div>
    </div>

    ${(r.instructions || []).length ? `<div class="collapse-card">
      <button class="collapse-toggle" id="instrToggle">
        <span class="t">${esc(t("det.prep"))}</span>
        <span class="r">${esc(state.instrOpen ? t("det.hide") : t("det.show"))} <span class="chevron ${state.instrOpen ? "open" : ""}">▾</span></span>
      </button>
      ${state.instrOpen ? `<div class="collapse-body">${r.instructions.map((s, i) =>
        `<div class="instr-step"><span class="n">0${i + 1}</span><span class="txt">${esc(s)}</span></div>`).join("")}</div>` : ""}
    </div>` : ""}

    <div id="mapping" class="mapping">${state.mappingHTML}</div>
  </main>`;
}

/* ---------- open a single recipe ---------- */
async function openRecipe(index) {
  state.view = "detail";
  state.instrOpen = false;
  state.mappingHTML = "";
  state.recipeDetail = null;
  pushURL("detail", index);
  APP().innerHTML = `<div class="view"><main class="detail-wrap">
    <button class="back-link" data-go="recipes">${esc(t("det.back"))}</button>
    <div class="inline-loader"><span class="spinner"></span> ${esc(t("det.loading"))}</div></main></div>`;
  const bl = $("[data-go]");
  if (bl) bl.addEventListener("click", () => openRecipes(state.recipeQuery));
  window.scrollTo({ top: 0, behavior: "smooth" });
  try {
    state.recipeDetail = await api.recipe(index);
  } catch (e) {
    APP().innerHTML = `<div class="view"><main class="detail-wrap"><div class="inline-err">${esc(t("err.generic"))} — ${esc(e.message)}</div></main></div>`;
    return;
  }
  render();
}

/* ---------- run the agent on every ingredient of the recipe ---------- */
async function analyzeAll(index) {
  const out = $("#mapping");
  const btn = $("#linkAllBtn");
  if (!out) return;
  if (btn) btn.disabled = true;
  out.innerHTML = `<div class="inline-loader"><span class="spinner"></span> ${esc(t("map.running"))}</div>`;
  out.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const data = await api.linkRecipe(index);
    const items = data.linked_ingredients || [];
    const dot = (lvl) => `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${confMeta(lvl).c};margin-right:6px"></span>`;

    const rows = items.map((it) => {
      const o = it.original, tr = it.trace;
      const qty = `${o.quantity || ""} ${o.unit || ""}`.trim();
      return `<tr>
        <td class="name">${esc(o.name)}</td>
        <td class="mono">${esc(qty)}</td>
        <td>${tr.selected_usda_name ? esc(tr.selected_usda_name) : "—"}</td>
        <td class="mono">${tr.selected_usda_id ? "USDA:" + esc(tr.selected_usda_id) : "—"}</td>
        <td>${dot(tr.confidence_level)}${tr.confidence}%</td>
      </tr>`;
    }).join("");

    const details = items.map((it) => {
      const tr = it.trace;
      const head = tr.selected_usda_name ? esc(tr.selected_usda_name) : t("map.nomatch");
      const savedOpen = state.traceOpen;
      state.traceOpen = true;
      const inner = traceBody(tr);
      state.traceOpen = savedOpen;
      return `<details class="map-detail"><summary>🔎 ${esc(it.original.name)} → ${head} <span class="muted">· ${tr.confidence}%</span></summary><div class="inner">${inner}</div></details>`;
    }).join("");

    const html = `
      <div class="success">✅ ${t("map.analyzed", { n: items.length })}</div>
      <h4>${esc(t("map.summary"))}</h4>
      <table class="map-table">
        <thead><tr><th>${esc(t("map.col.ingredient"))}</th><th>${esc(t("map.col.qty"))}</th><th>${esc(t("map.col.usda"))}</th><th>${esc(t("map.col.id"))}</th><th>${esc(t("map.col.conf"))}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h4>${esc(t("map.details"))}</h4>
      ${details}`;
    state.mappingHTML = html;
    out.innerHTML = html;
  } catch (e) {
    out.innerHTML = `<div class="inline-err">${esc(t("err.generic"))} — ${esc(e.message)}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}
