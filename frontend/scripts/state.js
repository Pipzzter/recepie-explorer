"use strict";

/* =====================================================================
   Трпеза — central app state
   ===================================================================== */

const state = {
  lang: "mk",
  view: "home",                                   // home | ingredient | recipes | detail
  query: "",
  ing: { stage: "empty", loadingStage: 1 },       // empty | loading | results | error
  trace: null,
  traceOpen: false,
  recipeList: [],
  recipeQuery: "",
  recipePage: 0,
  recipeDetail: null,
  instrOpen: false,
  mappingHTML: "",
  usdaTotal: 7793,
  recipesTotal: 36237,
};

const PAGE_SIZE = 9;
let busy = false;
