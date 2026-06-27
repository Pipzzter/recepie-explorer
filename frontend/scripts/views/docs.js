"use strict";
/* exported renderDocs */

/* =====================================================================
   Трпеза — DOCUMENTATION page: short explanations of how it all works
   ===================================================================== */

function renderDocs() {
  const stage = (n, title, desc) => `
    <div class="doc-stage">
      <div class="doc-stage-num">0${n}</div>
      <div>
        <h4>${esc(title)}</h4>
        <p>${esc(desc)}</p>
      </div>
    </div>`;

  const card = (title, body) =>
    `<div class="doc-card"><h5>${esc(title)}</h5><p>${esc(body)}</p></div>`;

  return `
  <main class="doc-wrap">
    <div class="page-head">
      <div class="eyebrow">${esc(t("doc.kicker"))}</div>
      <h2 class="page-title">${esc(t("doc.title"))}</h2>
      <p class="doc-lead">${esc(t("doc.intro"))}</p>
    </div>

    <section class="doc-section">
      <h3>${esc(t("doc.ing.title"))}</h3>
      <p>${esc(t("doc.ing.body"))}</p>
      <div class="doc-stages">
        ${stage(1, t("doc.s1.t"), t("doc.s1.d"))}
        ${stage(2, t("doc.s2.t"), t("doc.s2.d"))}
        ${stage(3, t("doc.s3.t"), t("doc.s3.d"))}
        ${stage(4, t("doc.s4.t"), t("doc.s4.d"))}
        ${stage(5, t("doc.s5.t"), t("doc.s5.d"))}
      </div>
      <div class="doc-grid">
        ${card(t("doc.conf.title"), t("doc.conf.body"))}
        ${card(t("doc.trace.title"), t("doc.trace.body"))}
      </div>
      <div class="doc-actions">
        <button class="btn-soft" data-go="ingredient">${esc(t("doc.try.ing"))}</button>
        <button class="chip" data-try="павлака">павлака</button>
        <button class="chip" data-try="сирење">сирење</button>
      </div>
    </section>

    <section class="doc-section">
      <h3>${esc(t("doc.rec.title"))}</h3>
      <p>${esc(t("doc.rec.body"))}</p>
      <div class="doc-grid">
        ${card(t("doc.rec.s1.t"), t("doc.rec.s1.d"))}
        ${card(t("doc.rec.s2.t"), t("doc.rec.s2.d"))}
        ${card(t("doc.rec.s3.t"), t("doc.rec.s3.d"))}
      </div>
      <div class="doc-actions">
        <button class="btn-soft" data-go="recipes">${esc(t("doc.try.rec"))}</button>
      </div>
    </section>

    <section class="doc-section">
      <h3>${esc(t("doc.smart.title"))}</h3>
      <p>${esc(t("doc.smart.body"))}</p>
    </section>

    <section class="doc-section">
      <h3>${esc(t("doc.engine.title"))}</h3>
      <p>${esc(t("doc.engine.body"))}</p>
      ${card(t("doc.key.title"), t("doc.key.body"))}
    </section>

    <section class="doc-section">
      <h3>${esc(t("doc.data.title"))}</h3>
      <p>${esc(t("doc.data.body"))}</p>
      <div class="stats-strip">
        <div class="stat"><div class="num">${fmt(state.recipesTotal)}</div><div class="lbl">${esc(t("stats.recipes"))}</div></div>
        <div class="stat"><div class="num">${fmt(state.usdaTotal)}</div><div class="lbl">${esc(t("stats.usda"))}</div></div>
        <div class="stat"><div class="num">5</div><div class="lbl">${esc(t("stats.stages"))}</div></div>
      </div>
    </section>
  </main>`;
}
