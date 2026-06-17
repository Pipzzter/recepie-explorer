"use strict";

/* ---------- tiny helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const flagFor = (lang) => (lang === "mk" ? "🇲🇰" : lang === "en" ? "🇬🇧" : "🌐");
const langName = (lang) => ({ mk: "Macedonian", en: "English" }[lang] || lang || "—");
const confColor = (lvl) => ({ high: "#16a34a", med: "#f59e0b", low: "#dc3545" }[lvl] || "#6b7280");
const confWord = (lvl) => ({ high: "High", med: "Medium", low: "Low" }[lvl] || lvl || "");

const STEP = 430; // ms between roadmap stations filling in

/* ---------- toolcall renderer ---------- */
function toolCallHTML(trace, needle) {
  const tc = (trace.tool_calls || []).find((t) => t.name.includes(needle));
  if (!tc) return "";
  return `<div class="toolcall"><span class="tn">${esc(tc.name)}</span>(${esc(
    JSON.stringify(tc.args)
  )})<br><span class="tr">→ ${esc(tc.result_summary)}</span></div>`;
}

/* ---------- per-stage card content ---------- */
function stageContent(i, trace) {
  if (i === 0) {
    const translated = trace.detected_language !== "en";
    return `
      <div class="kv">Detected language: <b>${flagFor(trace.detected_language)} ${esc(langName(trace.detected_language))}</b></div>
      <div class="kv">${
        translated
          ? `Original <code>${esc(trace.ingredient_original)}</code> <span class="arrow">→</span> English <code>${esc(trace.english_translation)}</code>`
          : `Already English: <code>${esc(trace.ingredient_original)}</code>`
      }</div>`;
  }
  if (i === 1) {
    return trace.needs_context
      ? `This term looks <b>ambiguous</b> — it could map to several different USDA entries, so recipe context is especially useful.`
      : `This term is fairly <b>specific</b>. The agent still checks how it is actually used in recipes (below).`;
  }
  if (i === 2) {
    const recipes = (trace.context_recipes || [])
      .map((c) => `<div class="ctx-recipe"><b>${esc(c.title)}</b><br><small>${esc(c.usage_note)}</small></div>`)
      .join("");
    const body = recipes ||
      `<span class="muted">No recipes in the dataset use this exact term — the agent searches USDA directly.</span>`;
    return toolCallHTML(trace, "recipe_context") + body;
  }
  if (i === 3) {
    const cands = (trace.candidates || []).slice(0, 8).map((c) => {
      const pct = Math.round((c.score || 0) * 100);
      return `<div class="cand ${c.selected ? "win" : ""}">
        <span class="pct">${pct}%</span>
        <span class="bar"><i data-w="${pct}%"></i></span>
        <span class="nm">${esc(c.name)}</span>
        <span class="id">${esc(c.usda_id)}${c.selected ? ' <span class="check">✓</span>' : ""}</span>
      </div>`;
    }).join("") || `<span class="muted">No candidates returned.</span>`;
    return `<div class="kv">Search query: <code>${esc(trace.search_query)}</code></div>
      ${toolCallHTML(trace, "usda")}
      <div style="margin-top:6px">${cands}</div>`;
  }
  // i === 4 — Evaluate
  if (!trace.selected_usda_id)
    return `<span class="muted">No confident USDA match.</span>
      ${trace.reasoning ? `<div class="reasoning"><b>Agent's reasoning</b>${esc(trace.reasoning)}</div>` : ""}`;
  const c = confColor(trace.confidence_level);
  return `
    <div class="kv"><span class="usda-badge">USDA ${esc(trace.selected_usda_id)}</span>
      &nbsp;<b>${esc(trace.selected_usda_name)}</b></div>
    <div class="conf-wrap">
      <div class="conf-track"><i data-w="${trace.confidence}%" style="background:${c}"></i></div>
      <span class="conf-label" style="color:${c}">${trace.confidence}% · ${esc(confWord(trace.confidence_level))}</span>
    </div>
    ${trace.reasoning ? `<div class="reasoning"><b>Agent's reasoning</b>${esc(trace.reasoning)}</div>` : ""}`;
}

const STAGES = [
  { title: "Analyze",        tag: "language + translation" },
  { title: "Decide context", tag: "ambiguity check" },
  { title: "Fetch context",  tag: "recipe co-occurrence" },
  { title: "Search USDA",    tag: "keyword + Jaccard match" },
  { title: "Evaluate",       tag: "select best + confidence" },
];

function resetTracker() {
  $$(".node", $("#tracker")).forEach((n) => n.classList.remove("done", "active", "skip"));
  $$(".seg", $("#tracker")).forEach((s) => s.classList.remove("fill", "skip"));
}
function fillBars(stationEl) {
  $$("[data-w]", stationEl).forEach((b) => (b.style.width = b.getAttribute("data-w")));
}

/* ---------- play the roadmap (all 5 stages always run) ---------- */
async function playRoadmap(trace) {
  const stationsEl = $("#stations");
  const dest = $("#destination");
  dest.classList.remove("show");
  resetTracker();

  stationsEl.innerHTML = STAGES.map((s, i) =>
    `<div class="station ${i === 2 ? "ctx" : ""}" data-i="${i}">
      <div class="st-badge">${i + 1}</div>
      <div class="st-card">
        <div class="st-head"><span class="st-title">${esc(s.title)}</span><span class="st-tag">${esc(s.tag)}</span></div>
        <div class="st-content">${stageContent(i, trace)}</div>
      </div>
    </div>`).join("");

  const nodes = $$(".node", $("#tracker"));
  const segs = $$(".seg", $("#tracker"));
  const stations = $$(".station", stationsEl);

  for (let i = 0; i < STAGES.length; i++) {
    if (i > 0) segs[i - 1].classList.add("fill");
    nodes[i].classList.add("active");
    await sleep(STEP);
    nodes[i].classList.remove("active");
    nodes[i].classList.add("done");
    stations[i].classList.add("show");
    fillBars(stations[i]);
    await sleep(120);
  }

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
       <div class="dest-to"><div class="to-name">No confident match</div>
         <div class="to-meta">The agent couldn't map this to a USDA entry · ${secs}s</div></div>`;
  await sleep(60);
  dest.classList.add("show");
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
    showRecipes(q, 0);
  } else {
    $("#recipes").classList.add("hidden");
    analyze(q);
  }
}

/* ---------- ingredient → roadmap ---------- */
async function analyze(name) {
  name = (name || "").trim();
  if (!name || busy) return;
  busy = true;
  const btn = $("#goBtn");
  if (btn) btn.disabled = true;
  const roadmap = $("#roadmap");
  roadmap.classList.remove("hidden");
  $("#destination").classList.remove("show");
  resetTracker();
  $("#stations").innerHTML =
    `<div class="loader"><span class="spinner"></span> Agent is reasoning through the 5 stages…</div>`;
  roadmap.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const res = await fetch("/link/ingredient?name=" + encodeURIComponent(name));
    if (!res.ok) throw new Error("API returned " + res.status);
    const trace = await res.json();
    await playRoadmap(trace);
  } catch (e) {
    $("#stations").innerHTML = `<div class="err">Couldn't analyze "${esc(name)}" — ${esc(e.message)}</div>`;
  } finally {
    busy = false;
    if (btn) btn.disabled = false;
  }
}

/* ---------- recipe → paginated results (5 per page) ---------- */
let recipeState = { q: "", offset: 0, limit: 5 };

async function showRecipes(q, offset) {
  recipeState = { q, offset, limit: 5 };
  const sec = $("#recipes");
  sec.classList.remove("hidden");
  $("#recipeDetail").classList.add("hidden");
  $("#recipesTitle").textContent = `Recipes matching “${q}”`;
  $("#recipesMeta").textContent = "";
  $("#recipeResults").innerHTML = `<div class="loader"><span class="spinner"></span> Searching recipes…</div>`;
  $("#pager").innerHTML = "";
  sec.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const list = await (await fetch(`/recipes?q=${encodeURIComponent(q)}&limit=5&offset=${offset}`)).json();
    if (!list.length) {
      $("#recipeResults").innerHTML = offset === 0
        ? `<p class="muted">No recipes found for “${esc(q)}”.</p>`
        : `<p class="muted">No more recipes.</p>`;
      renderPager(0);
      return;
    }
    $("#recipeResults").innerHTML = list.map((r) =>
      `<div class="recipe-card" data-i="${r.index}">
        <div class="rc-title">${esc(r.title)}</div>
        <div class="rc-meta">${r.ingredient_count} ingredients · ${esc((r.tags || []).slice(0, 3).join(", "))}</div>
      </div>`).join("");
    $$("#recipeResults .recipe-card").forEach((card) =>
      card.addEventListener("click", () => openRecipe(card.getAttribute("data-i"))));
    $("#recipesMeta").textContent = `showing ${offset + 1}–${offset + list.length}`;
    renderPager(list.length);
  } catch (e) {
    $("#recipeResults").innerHTML = `<div class="err">Search failed — ${esc(e.message)}</div>`;
  }
}

function renderPager(count) {
  const { q, offset, limit } = recipeState;
  const hasPrev = offset > 0;
  const hasNext = count === limit; // a full page implies there may be more
  $("#pager").innerHTML =
    `<button class="pg-btn" id="pgPrev" ${hasPrev ? "" : "disabled"}>← Prev</button>
     <span class="pg-info">page ${Math.floor(offset / limit) + 1}</span>
     <button class="pg-btn" id="pgNext" ${hasNext ? "" : "disabled"}>Next →</button>`;
  if (hasPrev) $("#pgPrev").addEventListener("click", () => showRecipes(q, Math.max(0, offset - limit)));
  if (hasNext) $("#pgNext").addEventListener("click", () => showRecipes(q, offset + limit));
}

async function openRecipe(index) {
  const det = $("#recipeDetail");
  det.classList.remove("hidden");
  det.innerHTML = `<div class="loader"><span class="spinner"></span> Loading recipe…</div>`;
  try {
    const r = await (await fetch("/recipes/" + index)).json();
    const ings = (r.ingredients || []).filter((x) => x.name);
    det.innerHTML = `<h3>${esc(r.title)}</h3>
      <p class="muted">Click an ingredient to run it through the roadmap below.</p>
      <div class="ing-chips">${ings.map((x) =>
        `<span class="ing-chip" data-v="${esc(x.name)}">${esc(x.name)}</span>`).join("")}</div>`;
    $$(".ing-chip", det).forEach((chip) =>
      chip.addEventListener("click", () => analyze(chip.getAttribute("data-v"))));
  } catch (e) {
    det.innerHTML = `<div class="err">Couldn't load recipe — ${esc(e.message)}</div>`;
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
