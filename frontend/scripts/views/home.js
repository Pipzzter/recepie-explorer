"use strict";

/* =====================================================================
   Трпеза — HOME page: one smart search bar + feature cards + stats
   ===================================================================== */

function renderHome() {
  const diamonds = Array.from({ length: 42 }, (_, i) =>
    `<span style="background:${DIAMOND_PALETTE[i % 4]}${i % 2 ? "cc" : "ff"}"></span>`).join("");

  return `
  <section class="hero">
    <div class="hero-corner"></div>
    <div class="wrap hero-inner">
      <div>
        <div class="kicker"><span class="dotmark"></span>${esc(t("hero.badge"))}</div>
        <h1>${t("hero.title")}</h1>
        <p class="hero-sub">${esc(t("hero.sub"))}</p>

        <div class="search-box">
          <div class="search-field">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B6AB9B" stroke-width="1.8"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg>
            <input id="heroInput" type="text" autocomplete="off" value="${esc(state.query)}" placeholder="${esc(t("hero.ph"))}">
            <button class="btn-primary" id="heroSubmit">${esc(t("hero.submit"))} →</button>
          </div>
          <div class="search-hint">${esc(t("hero.smart"))}</div>
        </div>

        <div class="try-row">
          <span class="try-label">${esc(t("hero.try"))}</span>
          <button class="chip" data-try="павлака">павлака</button>
          <button class="chip" data-try="сирење">сирење</button>
          <button class="chip" data-try="торта">торта</button>
          <button class="chip" data-try="пилешка супа">пилешка супа</button>
        </div>
      </div>

      <div class="mosaic">
        <div class="mosaic-tile tall" style="background:${hueGradient(0)}">
          <div class="photo-tag">${esc(t("det.photo"))}</div>
          <div class="scrim"><span>Ајвар</span></div>
        </div>
        <div class="mosaic-tile sm" style="background:${hueGradient(1)}"><div class="scrim"><span>Тавче гравче</span></div></div>
        <div class="mosaic-tile sm" style="background:${hueGradient(2)}"><div class="scrim"><span>Бурек</span></div></div>
      </div>
    </div>
    <div class="wrap"><div class="diamonds">${diamonds}</div></div>
  </section>

  <section class="wrap">
    <div class="feature-grid">
      <button class="feature-card" id="cardTool">
        <div class="feature-icon tool"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C0562F" stroke-width="1.7"><path d="M12 3v6"></path><circle cx="12" cy="14" r="6"></circle><path d="M9 14h6"></path></svg></div>
        <div class="feature-kicker tool">${esc(t("card.tool.kicker"))}</div>
        <h3>${esc(t("card.tool.title"))}</h3>
        <p>${esc(t("card.tool.body"))}</p>
        <span class="feature-cta tool">${esc(t("card.tool.cta"))}</span>
      </button>
      <button class="feature-card" id="cardBrowse">
        <div class="feature-icon browse"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6F8A5B" stroke-width="1.7"><path d="M4 5h16v14H4z"></path><path d="M4 9h16"></path><path d="M9 5v14"></path></svg></div>
        <div class="feature-kicker browse">${esc(t("card.browse.kicker"))}</div>
        <h3>${esc(t("card.browse.title"))}</h3>
        <p>${esc(t("card.browse.body"))}</p>
        <span class="feature-cta browse">${esc(t("card.browse.cta"))}</span>
      </button>
    </div>

    <div class="stats-strip">
      <div class="stat"><div class="num">${fmt(state.recipesTotal)}</div><div class="lbl">${esc(t("stats.recipes"))}</div></div>
      <div class="stat"><div class="num">${fmt(state.usdaTotal)}</div><div class="lbl">${esc(t("stats.usda"))}</div></div>
      <div class="stat"><div class="num">5</div><div class="lbl">${esc(t("stats.stages"))}</div></div>
    </div>
    <div style="height:60px"></div>
  </section>`;
}
