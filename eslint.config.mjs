// ESLint flat config for the vanilla-JS frontend.
//
// The frontend uses classic <script> tags that share ONE global scope (no
// modules/imports): functions/constants declared in one file are used from
// another. ESLint analyses each file in isolation, so those cross-file symbols
// are declared as globals below (and `no-redeclare` is off, because the
// top-level declarations are exactly what create these shared globals). Each
// file also carries an `/* exported … */` directive so `no-unused-vars` knows
// its top-level definitions are consumed elsewhere.

const builtinGlobals = {
  window: "readonly", document: "readonly", localStorage: "readonly",
  location: "readonly", history: "readonly", fetch: "readonly",
  setTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly",
  encodeURIComponent: "readonly", console: "readonly",
  Promise: "readonly", Array: "readonly", Number: "readonly", String: "readonly",
  Boolean: "readonly", Math: "readonly", Date: "readonly", Object: "readonly",
  JSON: "readonly", RegExp: "readonly", isNaN: "readonly", parseInt: "readonly",
  parseFloat: "readonly",
};

const appGlobals = {
  // helpers.js
  $: "readonly", $$: "readonly", APP: "readonly", esc: "readonly",
  sleep: "readonly", fmt: "readonly", HUES: "readonly", hueGradient: "readonly",
  DIAMOND_PALETTE: "readonly", CONF: "readonly", confMeta: "readonly",
  confWord: "readonly",
  // state.js
  state: "writable", PAGE_SIZE: "readonly", busy: "writable",
  // i18n.js
  I18N: "readonly", t: "readonly", applyStaticI18n: "readonly", setLang: "readonly",
  // api.js
  api: "writable",
  // views
  renderHome: "readonly", renderIngredientPage: "readonly", ingBodyHTML: "readonly",
  loadingBody: "readonly", resultsBody: "readonly", traceBody: "readonly",
  errorBody: "readonly", goIngredient: "readonly", analyze: "readonly",
  TAG_FILTERS: "readonly", renderRecipes: "readonly", openRecipes: "readonly",
  searchRecipes: "readonly", filterRecipesByTag: "readonly",
  renderDetail: "readonly", openRecipe: "readonly", analyzeAll: "readonly",
  renderDocs: "readonly",
  // router.js
  navigate: "readonly", render: "readonly", routeTo: "readonly",
  smartSearch: "readonly", bindView: "readonly", bindIngBody: "readonly",
  toggleTrace: "readonly", pushURL: "readonly",
};

export default [
  {
    files: ["frontend/scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...builtinGlobals, ...appGlobals },
    },
    rules: {
      "no-undef": "error",
      // Shared classic-script scope: top-level declarations create the globals
      // listed above, so redeclaration warnings are expected and not useful.
      "no-redeclare": "off",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-const-assign": "error",
      "no-unused-vars": [
        "error",
        { args: "none", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-unreachable": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-cond-assign": "error",
      "no-self-assign": "error",
      "no-constant-condition": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      eqeqeq: ["error", "smart"],
    },
  },
];
