"use strict";
/* exported renderIngredientPage, ingBodyHTML, loadingBody, resultsBody,
   traceBody, errorBody, goIngredient, analyze */

/* =====================================================================
   Трпеза — INGREDIENT page: own search bar + loading / results / trace
   ===================================================================== */

function renderIngredientPage() {
  return `
  <main class="results-wrap">
    <div class="page-head">
      <div class="eyebrow">${esc(t("ing.kicker"))}</div>
      <h2 class="page-title">${esc(t("ing.title"))}</h2>
    </div>

    <div class="recipe-search ingredient-search">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#B6AB9B" stroke-width="1.8"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg>
      <input id="ingInput" type="text" autocomplete="off" value="${esc(state.query)}" placeholder="${esc(t("ing.ph"))}">
      <button id="ingSubmit">${esc(t("ing.submit"))}</button>
    </div>

    <div id="ingBody">${ingBodyHTML()}</div>
  </main>`;
}

function ingBodyHTML() {
  const s = state.ing.stage;
  if (s === "loading") return loadingBody(state.ing.loadingStage, false);
  if (s === "results") return resultsBody(state.trace);
  if (s === "error")   return errorBody();
  return `<div class="empty-hint">${esc(t("ing.empty"))}</div>`;
}

/* ---------- loading body (5-stage animation) ---------- */
function stageRow(n, current) {
  const done = n < current, active = n === current;
  const status = done ? t("stage.done") : active ? t("stage.running") : t("stage.pending");
  return `<div class="stage-row ${done ? "done" : active ? "active" : ""}">
    <div class="stage-num">0${n}</div>
    <div class="stage-main">
      <div class="stage-name">${esc(t("stage." + n + ".name"))}</div>
      <div class="stage-desc">${esc(t("stage." + n + ".desc"))}</div>
    </div>
    <div class="stage-status">${esc(status)}</div>
  </div>`;
}
function loadingBody(current, done) {
  const pct = Math.min(100, Math.round((current / 5) * 100));
  const label = done ? t("loading.done") : t("loading.l" + current);
  return `
  <div class="loading-head">
    <div class="eyebrow">${esc(t("loading.kicker"))}</div>
    <h3 class="loading-q">${esc(state.query)}</h3>
    <div class="loading-status">${done ? "" : '<span class="spinner"></span>'} ${esc(label)}</div>
  </div>
  <div class="stage-list">${[1, 2, 3, 4, 5].map((n) => stageRow(n, current)).join("")}</div>
  <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>`;
}

/* ---------- results body ---------- */
function resultsBody(tr) {
  if (!tr || !tr.selected_usda_id) return errorBody();
  const cm = confMeta(tr.confidence_level);
  const translated = tr.detected_language && tr.detected_language !== "en";
  const circ = 314, off = Math.round(circ * (1 - (tr.confidence || 0) / 100));
  const secs = (tr.processing_time_ms / 1000).toFixed(1);

  return `
  <div class="results-head">
    <div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="lang-tag"><span class="dotmark"></span>${esc((tr.detected_language || "?").toUpperCase())}</span>
        ${translated ? `<span class="trans-arrow">→ „${esc(tr.english_translation)}“</span>` : ""}
      </div>
      <h2>${esc(tr.ingredient_original)}</h2>
    </div>
    <div class="timing">${esc(t("res.processed"))}<b>${secs}s</b></div>
  </div>

  <div class="match-panel">
    <div class="match-top">
      <div>
        <div class="match-label">${esc(t("res.matched"))}</div>
        <div class="match-name-row">
          <h3 class="match-name">${esc(tr.selected_usda_name)}</h3>
          <span class="usda-id">USDA:${esc(tr.selected_usda_id)}</span>
        </div>
        ${tr.product_summary ? `<p class="match-summary">${esc(tr.product_summary)}</p>` : ""}
      </div>
      <div class="dial">
        <div class="dial-ring">
          <svg width="116" height="116" viewBox="0 0 116 116">
            <circle cx="58" cy="58" r="50" fill="none" stroke="#ECE0C9" stroke-width="11"></circle>
            <circle cx="58" cy="58" r="50" fill="none" stroke="${cm.c}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"></circle>
          </svg>
          <div class="dial-center"><div>
            <div class="dial-num">${tr.confidence}</div>
            <div class="dial-cap">${esc(t("res.conf.cap"))}</div>
          </div></div>
        </div>
        <div class="dial-badge" style="color:${cm.c};background:${cm.bg}"><span class="d" style="background:${cm.c}"></span>${esc(confWord(tr.confidence_level))}</div>
      </div>
    </div>

    ${tr.reasoning ? `<div class="reasoning-box">
      <div class="lbl">${esc(t("res.reasoning"))}</div>
      <p>${esc(tr.reasoning)}</p>
    </div>` : ""}

    <button class="trace-toggle" id="traceToggle">
      <span class="left">
        <span class="ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C0562F" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"></path></svg></span>
        <span>
          <span class="t1">${esc(state.traceOpen ? t("res.trace.hideTitle") : t("res.trace.showTitle"))}</span>
          <span class="t2">Analyze → Decide → Fetch → Search → Evaluate</span>
        </span>
      </span>
      <span class="right">${esc(state.traceOpen ? t("res.trace.hide") : t("res.trace.show"))} <span class="chevron ${state.traceOpen ? "open" : ""}">▾</span></span>
    </button>

    ${state.traceOpen ? traceBody(tr) : ""}
  </div>`;
}

function traceBody(tr) {
  const ctx = tr.context_recipes || [];
  const cands = tr.candidates || [];
  const selIdx = cands.findIndex((c) => c.selected) + 1;

  const ctxBlock = tr.needs_context
    ? (ctx.length
        ? `<div class="trace-summary-line"><span class="ico amber"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A06A1E" stroke-width="1.8"><path d="M4 5h16v14H4z"></path><path d="M4 9h16"></path><path d="M9 5v14"></path></svg></span><span>${t("trace.s3.searched", { total: fmt(state.recipesTotal), q: esc(tr.ingredient_original), n: ctx.length })}</span></div>
           <div class="ctx-list">${ctx.map((c) => `<div class="ctx-item"><span class="title">${esc(c.title)}</span>${c.usage_note ? `<span class="usage">${esc(c.usage_note)}</span>` : ""}</div>`).join("")}</div>`
        : `<p>${esc(t("trace.s3.none"))}</p>`)
    : `<p>${esc(t("trace.s3.none"))}</p>`;

  const candBlock = cands.map((c) => {
    const pct = Math.round((c.score || 0) * 100);
    return `<div class="cand ${c.selected ? "selected" : ""}">
      <span class="cid">${esc(c.usda_id)}</span>
      <span class="cname">${esc(c.name)}</span>
      ${c.selected ? `<span class="picked">${esc(t("trace.selected"))}</span>` : ""}
      <span class="cscore">${pct}%</span>
    </div>`;
  }).join("");

  return `<div class="trace-body">
    <div class="trace-stage">
      <div class="tn">01</div>
      <div>
        <h4>${esc(t("stage.1.name"))} <span class="en">Analyze</span></h4>
        <p>${esc(t("trace.s1.desc"))}</p>
        <div class="kv-row">
          <div class="kv"><span class="k">language</span> <span class="v">"${esc(tr.detected_language)}"</span></div>
          <div class="kv"><span class="k">english</span> <span class="v">"${esc(tr.english_translation)}"</span></div>
        </div>
      </div>
    </div>

    <div class="trace-stage">
      <div class="tn">02</div>
      <div>
        <h4>${esc(t("stage.2.name"))} <span class="en">Decide Context</span></h4>
        <div class="ctx-decide ${tr.needs_context ? "yes" : "no"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
          ${esc(tr.needs_context ? t("trace.s2.yes") : t("trace.s2.no"))}
        </div>
      </div>
    </div>

    <div class="trace-stage">
      <div class="tn">03</div>
      <div>
        <h4>${esc(t("stage.3.name"))} <span class="en">Fetch Context</span></h4>
        ${ctxBlock}
      </div>
    </div>

    <div class="trace-stage">
      <div class="tn">04</div>
      <div>
        <h4>${esc(t("stage.4.name"))} <span class="en">Search USDA</span></h4>
        <div class="trace-summary-line"><span class="ico green"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6F8A5B" stroke-width="1.8"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg></span><span>${t("trace.s4.searched", { total: fmt(state.usdaTotal), q: esc(tr.search_query || tr.english_translation), n: cands.length })}</span></div>
        <div class="cand-list">${candBlock}</div>
      </div>
    </div>

    <div class="trace-stage">
      <div class="tn">05</div>
      <div>
        <h4>${esc(t("stage.5.name"))} <span class="en">Evaluate</span></h4>
        <p>${selIdx > 0
          ? t("trace.s5.text", { i: selIdx, id: esc(tr.selected_usda_id), c: tr.confidence })
          : esc(t("trace.s5.nomatch"))}</p>
      </div>
    </div>
  </div>`;
}

function errorBody() {
  return `
  <div class="error-inline">
    <div class="error-mark"><div class="row"><span style="background:#E0A52C"></span><span style="background:#C0562F"></span><span style="background:#B6AB9B"></span></div></div>
    <h2>${t("err.title", { q: esc(state.query) })}</h2>
    <p>${esc(t("err.body"))}</p>
    <div class="error-actions">
      <button class="btn-primary" data-try="павлака">${esc(t("err.tryPavlaka"))}</button>
      <button class="btn-soft" data-go="recipes">${esc(t("err.browse"))}</button>
    </div>
  </div>`;
}

/* ---------- open the dedicated ingredient page (empty) ---------- */
function goIngredient() {
  state.view = "ingredient";
  state.ing.stage = "empty";
  pushURL("ingredient");
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => $("#ingInput") && $("#ingInput").focus(), 60);
}

/* ---------- run the 5-stage linker on one ingredient ---------- */
async function analyze(name) {
  name = (name || "").trim();
  if (!name || busy) return;
  busy = true;
  state.query = name;
  state.traceOpen = false;
  state.trace = null;
  state.mappingHTML = "";
  state.ing.stage = "loading";
  state.ing.loadingStage = 1;

  if (state.view !== "ingredient") state.view = "ingredient";
  pushURL("ingredient");
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });

  // animate the stages while the request is in flight
  let stage = 1;
  const paint = () => { const b = $("#ingBody"); if (b) b.innerHTML = loadingBody(stage, false); };
  const timer = setInterval(() => { if (stage < 5) { stage++; paint(); } }, 520);

  const started = Date.now();
  let trace = null, failed = false;
  try {
    trace = await api.linkIngredient(name);
  } catch (_) { failed = true; }

  const minTime = 2700, elapsed = Date.now() - started;
  if (elapsed < minTime) await sleep(minTime - elapsed);
  clearInterval(timer);
  busy = false;

  state.trace = trace || null;
  state.ing.stage = (failed || !trace || !trace.selected_usda_id) ? "error" : "results";

  const b = $("#ingBody");
  if (b) { b.innerHTML = ingBodyHTML(); bindIngBody(); }
  else render();
}
