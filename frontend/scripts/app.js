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
    else if (n === "docs") navigate("docs");
  }));

  setupKeyModal();
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

/* ---------- API-key modal: enter an OpenAI key to enable the LLM pipeline ---------- */
function setupKeyModal() {
  const overlay = $("#keyOverlay");
  const input = $("#keyInput");
  const status = $("#keyStatus");
  const saveBtn = $("#keySave");
  if (!overlay) return;

  const setStatus = (msg, cls) => {
    status.textContent = msg || "";
    status.className = "key-status" + (cls ? " " + cls : "");
  };
  const open = () => {
    setStatus("");
    overlay.classList.remove("hidden");
    setTimeout(() => input.focus(), 40);
  };
  const close = () => overlay.classList.add("hidden");

  const save = async () => {
    const key = input.value.trim();
    if (!key) { setStatus(t("key.empty"), "err"); return; }
    saveBtn.disabled = true;
    setStatus(t("key.saving"), "");
    try {
      const res = await api.setKey(key);
      $("#modelName").textContent = res.engine || "openai";
      setStatus(t("key.ok", { engine: res.engine || "openai" }), "ok");
      input.value = "";
      setTimeout(close, 1100);
    } catch (e) {
      setStatus(e.message || t("key.fail"), "err");
    } finally {
      saveBtn.disabled = false;
    }
  };

  $("#keyBtn").addEventListener("click", open);
  $("#keyClose").addEventListener("click", close);
  $("#keyCancel").addEventListener("click", close);
  saveBtn.addEventListener("click", save);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
}

document.addEventListener("DOMContentLoaded", init);
