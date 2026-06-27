"use strict";
/* exported state, PAGE_SIZE, busy */

/* =====================================================================
   Трпеза — central app state
   ===================================================================== */

const state = {
  lang: "en",
  view: "home",                                   // home | ingredient | recipes | detail
  query: "",
  ing: { stage: "empty", loadingStage: 1 },       // empty | loading | results | error
  trace: null,
  traceOpen: false,
  recipeList: [],
  recipeQuery: "",
  recipeTag: "",
  recipePage: 0,
  recipeDetail: null,
  instrOpen: false,
  mappingHTML: "",
  usdaTotal: 7793,
  recipesTotal: 36237,
};

const PAGE_SIZE = 9;
let busy = false;
