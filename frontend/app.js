"use strict";

/* ---------- helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const flagFor = (lang) => (lang === "mk" ? "🇲🇰" : lang === "en" ? "🇬🇧" : "🌐");
const confColor = (lvl) => ({ high: "#16a34a", med: "#f59e0b", low: "#dc3545" }[lvl] || "#6b7280");
const confWord = (lvl) => ({ high: "High", med: "Medium", low: "Low" }[lvl] || lvl || "");
function fillBars(root) { $$("[data-w]", root).forEach((b) => (b.style.width = b.getAttribute("data-w"))); }

/* ---------- result card: only the valuable info ---------- */
function resultHTML(trace) {
  if (!trace.selected_usda_id) {
    return `<div class="result-card">${
      trace.reasoning
        ? `<div class="reasoning"><b>Why no match</b>${esc(trace.reasoning)}</div>`
        : `<div class="muted">No confident USDA match for this ingredient.</div>`}</div>`;
  }
  const translated = trace.detected_language !== "en";
  const transLine = translated
    ? `<div class="kv">Translated <code>${esc(trace.ingredient_original)}</code> → <code>${esc(trace.english_translation)}</code></div>`
    : "";
  const all = trace.candidates || [];
  const cands = all.slice(0, 8).map((c) => {
    const pct = Math.round((c.score || 0) * 100);
    return `<div class="cand ${c.selected ? "win" : ""}">
      <span class="pct">${pct}%</span>
      <span class="bar"><i data-w="${pct}%"></i></span>
      <span class="nm">${esc(c.name)}</span>
      <span class="id">${esc(c.usda_id)}${c.selected ? ' <span class="check">✓</span>' : ""}</span>
    </div>`;
  }).join("");
  return `<div class="result-card">
    ${transLine}
    ${trace.product_summary ? `<div class="summary-box"><b>About this food</b>${esc(trace.product_summary)}</div>` : ""}
    ${trace.reasoning ? `<div class="reasoning"><b>Why this match</b>${esc(trace.reasoning)}</div>` : ""}
    ${cands ? `<details class="cands-exp"><summary>Other USDA matches considered (${all.length})</summary><div class="cands">${cands}</div></details>` : ""}
  </div>`;
}

/* ---------- single ingredient result ---------- */
function renderResult(trace) {
  const dest = $("#destination");
  const out = $("#result");
  out.innerHTML = resultHTML(trace);
  fillBars(out);

  const hasMatch = !!trace.selected_usda_id;
  dest.className = "destination" + (hasMatch ? "" : " nomatch");
  const secs = (trace.processing_time_ms / 1000).toFixed(1);
  dest.innerHTML = hasMatch
    ? `<div class="dest-from"><span class="flag">${flagFor(trace.detected_language)}</span> ${esc(trace.ingredient_original)}</div>
       <div class="dest-arrow">→</div>
       <div class="dest-to">
         <div class="to-name">${esc(trace.selected_usda_name)}</div>
         <div class="to-meta">USDA ${esc(trace.selected_usda_id)} ·
           <span class="conf" style="color:${confColor(trace.confidence_level)}">${trace.confidence}% ${esc(confWord(trace.confidence_level))}</span>
           · ${secs}s</div>
       </div>`
    : `<div class="dest-from"><span class="flag">${flagFor(trace.detected_language)}</span> ${esc(trace.ingredient_original)}</div>
       <div class="dest-arrow">→</div>
       <div class="dest-to"><div class="to-name">No confident match</div><div class="to-meta">${secs}s</div></div>`;
  requestAnimationFrame(() => dest.classList.add("show"));
}

/* ---------- unified smart search ---------- */
let busy = false;

async function smartSearch(q) {
  q = (q || "").trim();
  if (!q || busy) return;
  let kind = "ingredient";
  try {
    const r = await fetch("/smart?q=" + encodeURIComponent(q));
    if (r.ok) kind = (await r.json()).kind || "ingredient";
  } catch (_) { /* fall back to ingredient */ }

  if (kind === "recipe") {
    $("#roadmap").classList.add("hidden");
    showRecipes(q);
  } else {
    $("#recipes").classList.add("hidden");
    analyze(q);
  }
}

/* ---------- ingredient → result ---------- */
async function analyze(name) {
  name = (name || "").trim();
  if (!name || busy) return;
  busy = true;
  const btn = $("#goBtn");
  if (btn) btn.disabled = true;
  const roadmap = $("#roadmap");
  roadmap.classList.remove("hidden");
  $("#destination").classList.remove("show");
  $("#result").innerHTML = `<div class="loader"><span class="spinner"></span> Linking “${esc(name)}” to USDA…</div>`;
  roadmap.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const res = await fetch("/link/ingredient?name=" + encodeURIComponent(name));
    if (!res.ok) throw new Error("API returned " + res.status);
    renderResult(await res.json());
  } catch (e) {
    $("#result").innerHTML = `<div class="err">Couldn't analyze "${esc(name)}" — ${esc(e.message)}</div>`;
  } finally {
    busy = false;
    if (btn) btn.disabled = false;
  }
}

/* ---------- recipe → paginated results (5 per page) ---------- */
let recipeState = { q: "", offset: 0, limit: 5, items: [] };

// Fetch matches once per query, then page through the cached list locally (no refetch).
async function showRecipes(q) {
  const sec = $("#recipes");
  sec.classList.remove("hidden");
  $("#recipeDetail").classList.add("hidden");
  $("#recipesTitle").textContent = `Recipes matching “${q}”`;
  $("#recipesMeta").textContent = "";
  $("#recipeResults").innerHTML = `<div class="loader"><span class="spinner"></span> Searching recipes…</div>`;
  $("#pager").innerHTML = "";
  sec.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const list = await (await fetch(`/recipes?q=${encodeURIComponent(q)}&limit=100&offset=0`)).json();
    recipeState = { q, offset: 0, limit: 5, items: list };
    if (!list.length) {
      $("#recipeResults").innerHTML = `<p class="muted">No recipes found for “${esc(q)}”.</p>`;
      return;
    }
    renderRecipePage(0);
  } catch (e) {
    $("#recipeResults").innerHTML = `<div class="err">Search failed — ${esc(e.message)}</div>`;
  }
}

// Render one page from the already-fetched results — no network call.
function renderRecipePage(offset) {
  const { items, limit } = recipeState;
  recipeState.offset = offset;
  const page = items.slice(offset, offset + limit);
  $("#recipeResults").innerHTML = page.map((r) =>
    `<div class="recipe-card" data-i="${r.index}">
      <div class="rc-title">${esc(r.title)}</div>
      <div class="rc-meta">${r.ingredient_count} ingredients · ${esc((r.tags || []).slice(0, 3).join(", "))}</div>
    </div>`).join("");
  $$("#recipeResults .recipe-card").forEach((card) =>
    card.addEventListener("click", () => openRecipe(card.getAttribute("data-i"))));
  $("#recipesMeta").textContent = `showing ${offset + 1}–${offset + page.length} of ${items.length}`;
  renderPager();
}

function renderPager() {
  const { offset, limit, items } = recipeState;
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const hasPrev = offset > 0;
  const hasNext = offset + limit < items.length;
  $("#pager").innerHTML =
    `<button class="pg-btn" id="pgPrev" ${hasPrev ? "" : "disabled"}>← Prev</button>
     <span class="pg-info">page ${Math.floor(offset / limit) + 1} of ${totalPages}</span>
     <button class="pg-btn" id="pgNext" ${hasNext ? "" : "disabled"}>Next →</button>`;
  if (hasPrev) $("#pgPrev").addEventListener("click", () => renderRecipePage(Math.max(0, offset - limit)));
  if (hasNext) $("#pgNext").addEventListener("click", () => renderRecipePage(offset + limit));
}

async function openRecipe(index) {
  const det = $("#recipeDetail");
  det.classList.remove("hidden");
  det.innerHTML = `<div class="loader"><span class="spinner"></span> Loading recipe…</div>`;
  det.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const r = await (await fetch("/recipes/" + index)).json();
    const ings = (r.ingredients || []).filter((x) => x.name);
    const qtyOf = (x) => `${x.quantity || ""} ${x.unit || ""}`.trim();
    const tags = (r.tags || []).slice(0, 8);

    const instrHTML = (r.instructions || []).length
      ? `<details class="rd-instr"><summary>📖 Instructions (${r.instructions.length} steps)</summary>
           <ol>${r.instructions.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></details>`
      : "";
    const ingrTable = ings.length
      ? `<table class="ingr-table"><thead><tr><th>Quantity</th><th>Ingredient</th></tr></thead>
           <tbody>${ings.map((x) => `<tr><td>${esc(qtyOf(x))}</td><td>${esc(x.name)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="muted">No ingredients listed.</p>`;

    det.innerHTML = `
      <div class="rd-head">
        <h3>${esc(r.title)}</h3>
        ${r.source ? `<a class="rd-src" href="${esc(r.source)}" target="_blank" rel="noopener">Source ↗</a>` : ""}
      </div>
      ${tags.length ? `<div class="rd-tags">${tags.map((t) => `<span class="rd-tag">${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="rd-cols">
        <div class="rd-col">
          <h4>📋 Recipe</h4>
          ${instrHTML}
          <div class="ingr-label">Ingredients</div>
          ${ingrTable}
        </div>
        <div class="rd-col">
          <h4>🤖 Agent Analysis</h4>
          ${ings.length
            ? `<button class="btn-primary" id="analyzeAllBtn">▶ Analyze all ${ings.length} ingredients</button>
               <p class="muted" style="margin:10px 0 6px">…or click a single ingredient to link just that one:</p>
               <div class="ing-chips">${ings.map((x) => `<span class="ing-chip" data-v="${esc(x.name)}">${esc(x.name)}</span>`).join("")}</div>`
            : `<p class="muted">No ingredients to analyze.</p>`}
        </div>
      </div>
      <div id="mapping"></div>`;

    $$(".ing-chip", det).forEach((chip) =>
      chip.addEventListener("click", () => analyze(chip.getAttribute("data-v"))));
    const allBtn = $("#analyzeAllBtn");
    if (allBtn) allBtn.addEventListener("click", () => analyzeAll(index));
  } catch (e) {
    det.innerHTML = `<div class="err">Couldn't load recipe — ${esc(e.message)}</div>`;
  }
}

async function analyzeAll(index) {
  const out = $("#mapping");
  const btn = $("#analyzeAllBtn");
  if (!out) return;
  if (btn) btn.disabled = true;
  out.innerHTML = `<div class="loader"><span class="spinner"></span> Running the agent on every ingredient… this can take a moment.</div>`;
  try {
    const data = await (await fetch("/link/recipe/" + index)).json();
    const items = data.linked_ingredients || [];
    const emoji = (lvl) => ({ high: "🟢", med: "🟡", low: "🔴" }[lvl] || "⚪");

    const rows = items.map((it) => {
      const o = it.original, t = it.trace;
      const qty = `${o.quantity || ""} ${o.unit || ""}`.trim();
      return `<tr>
        <td>${esc(o.name)}</td>
        <td class="muted">${esc(qty)}</td>
        <td>${t.selected_usda_name ? esc(t.selected_usda_name) : "—"}</td>
        <td class="mono">${t.selected_usda_id ? "USDA:" + esc(t.selected_usda_id) : "—"}</td>
        <td>${emoji(t.confidence_level)} ${t.confidence}%</td>
      </tr>`;
    }).join("");

    const traces = items.map((it) => {
      const t = it.trace;
      return `<details class="trace-exp">
        <summary>🔎 ${esc(it.original.name)} → ${t.selected_usda_name ? esc(t.selected_usda_name) : "no match"} <span class="muted">· ${t.confidence}%</span></summary>
        <div class="trace-body">${resultHTML(t)}</div>
      </details>`;
    }).join("");

    out.innerHTML = `
      <div class="success-line">✅ Analyzed ${items.length} ingredient(s)</div>
      <h5>Mapping summary</h5>
      <table class="summary-table">
        <thead><tr><th>Ingredient</th><th>Quantity</th><th>USDA entity</th><th>ID</th><th>Confidence</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h5>Details</h5>
      ${traces}`;
    $$(".result-card", out).forEach(fillBars);
  } catch (e) {
    out.innerHTML = `<div class="err">Analyze-all failed — ${esc(e.message)}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ---------- init ---------- */
async function init() {
  $$("#exampleChips .chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      $("#q").value = chip.getAttribute("data-v");
      smartSearch(chip.getAttribute("data-v"));
    }));
  $("#goBtn").addEventListener("click", () => smartSearch($("#q").value));
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") smartSearch($("#q").value); });

  try {
    const h = await (await fetch("/api/health")).json();
    $("#pillRecipes").textContent = `${(h.recipes_loaded || 0).toLocaleString()} recipes`;
    $("#pillUsda").textContent = `${(h.usda_entries || 0).toLocaleString()} USDA entries`;
    $("#pillEngine").textContent = `🤖 ${h.engine || "rule-based"}`;
  } catch (_) { /* leave placeholders */ }
}
document.addEventListener("DOMContentLoaded", init);
