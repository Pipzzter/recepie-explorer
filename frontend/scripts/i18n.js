"use strict";

/* =====================================================================
   Трпеза — translations (MK default + EN) and language switching
   ===================================================================== */

const I18N = {
  mk: {
    "nav.home": "Дома", "nav.ingredient": "Состојка", "nav.recipes": "Рецепти",

    "hero.badge": "македонска кујна × наука за храна",
    "hero.title": 'Секоја состојка,<br>поврзана со <em>науката</em>.',
    "hero.sub": "Внесете состојка или рецепт — системот сам препознава што сте напишале и ве носи на вистинската страница. Поврзете состојка со USDA или прелистувајте 36.000+ домашни рецепти.",
    "hero.ph": "пр. павлака, торта, маслиново масло, пилешка супа…",
    "hero.submit": "Пребарај",
    "hero.try": "Пробајте:",
    "hero.smart": "🔎 паметно пребарување — препознава состојка или рецепт",

    "card.tool.kicker": "Алатка за поврзување",
    "card.tool.title": "Поврзи состојка со USDA",
    "card.tool.body": "Внеси состојка — добиваш совпаднат USDA запис со оценка на сигурност и проѕирна трага низ петте чекори на агентот.",
    "card.tool.cta": "Отвори страница за состојки →",
    "card.browse.kicker": "Прелистувач",
    "card.browse.title": "Прелистувај 36.000+ рецепти",
    "card.browse.body": "Пребарувај по наслов или ознака низ цела збирка домашни македонски рецепти, со целосни детали.",
    "card.browse.cta": "Отвори прелистувач →",

    "stats.recipes": "македонски рецепти",
    "stats.usda": "USDA FoodData записи",
    "stats.stages": "чекори на агентскиот тек",

    "ing.kicker": "Поврзување состојка",
    "ing.title": "Поврзи состојка со USDA",
    "ing.ph": "Внеси состојка на македонски или англиски…",
    "ing.submit": "Поврзи",
    "ing.empty": "Внеси состојка погоре за да го видиш точниот USDA запис, оценката на сигурност и целосната трага низ петте чекори на агентот.",

    "loading.kicker": "Анализирам состојка",
    "loading.l1": "Откривам јазик и преведувам…",
    "loading.l2": "Проценувам двосмисленост…",
    "loading.l3": "Барам рецепти со оваа состојка…",
    "loading.l4": "Пребарувам низ USDA записи…",
    "loading.l5": "Избирам најдобар кандидат…",
    "loading.done": "Готово",

    "stage.1.name": "Анализа", "stage.1.desc": "detect language · translate",
    "stage.2.name": "Одлука за контекст", "stage.2.desc": "ambiguous? needs context",
    "stage.3.name": "Преземи контекст", "stage.3.desc": "get_recipe_context()",
    "stage.4.name": "Пребарај USDA", "stage.4.desc": "search_usda_classes()",
    "stage.5.name": "Процени и избери", "stage.5.desc": "select best · confidence",
    "stage.running": "работи…", "stage.done": "✓ готово", "stage.pending": "чека",

    "res.matched": "Совпаднат USDA запис",
    "res.processed": "обработено за",
    "res.conf.high": "висока сигурност", "res.conf.med": "средна сигурност", "res.conf.low": "ниска сигурност",
    "res.reasoning": "Образложение на агентот",
    "res.trace.showTitle": "Прикажи ја трагата на агентот",
    "res.trace.hideTitle": "Сокриј ја трагата на агентот",
    "res.trace.show": "ПРИКАЖИ ДЕТАЛИ", "res.trace.hide": "СОКРИЈ",
    "res.conf.cap": "СИГ.",

    "trace.s1.desc": "Откриен јазик и превод на англиски.",
    "trace.s2.yes": "Да — потребен е контекст од рецепти",
    "trace.s2.no": "Не — состојката мапира директно",
    "trace.s3.searched": "Пребарани <strong>{total}</strong> рецепти што ја користат „{q}“ — пронајдени <strong>{n}</strong> примери за употреба.",
    "trace.s3.none": "Не се пронајдени примерни рецепти за оваа состојка во збирката.",
    "trace.s4.searched": "Пребарувано низ <strong>{total}</strong> USDA записи за „{q}“ — рангирани <strong>{n}</strong> најблиски кандидати.",
    "trace.s5.text": "Моделот избра кандидат <span class='mono2'>#{i} · USDA:{id}</span> со сигурност <strong>{c}/100</strong> и образложението прикажано погоре.",
    "trace.s5.nomatch": "Моделот не врати употреблив избор за оваа состојка.",
    "trace.selected": "ИЗБРАНО",

    "rec.kicker": "Прелистувач на рецепти",
    "rec.title": "Домашна македонска кујна",
    "rec.showing": "прикажани <b>{n}</b> од {total}",
    "rec.ph": "Пребарувај по наслов или ознака…",
    "rec.search": "Пребарај",
    "rec.ingredients": "состојки",
    "rec.empty": "Нема рецепти за „{q}“.",
    "rec.loading": "Пребарувам рецепти…",
    "rec.all": "Сите",
    "rec.page": "стр. {n} од {total}",
    "rec.prev": "← претходна", "rec.next": "следна →",

    "det.back": "← сите рецепти",
    "det.ingredients": "Состојки",
    "det.items": "{n} ставки",
    "det.link": "Поврзи →",
    "det.linkAll": "Поврзи ги сите состојки со USDA",
    "det.prep": "Подготовка",
    "det.show": "ПРИКАЖИ", "det.hide": "СОКРИЈ",
    "det.source": "извор ↗",
    "det.noIngredients": "Нема наведени состојки.",
    "det.loading": "Вчитувам рецепт…",
    "det.photo": "ФОТО",

    "map.running": "Го извршувам агентот на секоја состојка… ова може да потрае.",
    "map.analyzed": "Анализирани {n} состојки",
    "map.summary": "Преглед на мапирање",
    "map.col.ingredient": "Состојка", "map.col.qty": "Количина", "map.col.usda": "USDA ентитет", "map.col.id": "ID", "map.col.conf": "Сигурност",
    "map.details": "Детали",
    "map.nomatch": "нема совпаѓање",

    "err.title": "Нема совпаѓање за „{q}“",
    "err.body": "Ниту еден USDA запис не одговара доволно близу, а моделот не врати употреблив избор. Пробајте друго пишување или поедноставен термин.",
    "err.tryPavlaka": "Пробај „павлака“",
    "err.browse": "Прелистувај рецепти",
    "err.generic": "Нешто тргна наопаку",
  },
  en: {
    "nav.home": "Home", "nav.ingredient": "Ingredient", "nav.recipes": "Recipes",

    "hero.badge": "macedonian cuisine × food science",
    "hero.title": 'Every ingredient,<br>linked to <em>science</em>.',
    "hero.sub": "Type an ingredient or a recipe — the system recognizes which one and takes you to the right page. Link an ingredient to USDA, or browse 36,000+ home recipes.",
    "hero.ph": "e.g. павлака, cake, olive oil, chicken soup…",
    "hero.submit": "Search",
    "hero.try": "Try:",
    "hero.smart": "🔎 smart search — detects ingredient or recipe",

    "card.tool.kicker": "Linking tool",
    "card.tool.title": "Link an ingredient to USDA",
    "card.tool.body": "Enter an ingredient — get the matched USDA entry with a confidence score and a transparent trace through the agent's five steps.",
    "card.tool.cta": "Open ingredient page →",
    "card.browse.kicker": "Browser",
    "card.browse.title": "Browse 36,000+ recipes",
    "card.browse.body": "Search by title or tag across the whole collection of home Macedonian recipes, with full details.",
    "card.browse.cta": "Open browser →",

    "stats.recipes": "Macedonian recipes",
    "stats.usda": "USDA FoodData entries",
    "stats.stages": "agent pipeline stages",

    "ing.kicker": "Ingredient linking",
    "ing.title": "Link an ingredient to USDA",
    "ing.ph": "Enter an ingredient in Macedonian or English…",
    "ing.submit": "Link",
    "ing.empty": "Enter an ingredient above to see its exact USDA entry, a confidence score, and the full trace through the agent's five stages.",

    "loading.kicker": "Analyzing ingredient",
    "loading.l1": "Detecting language and translating…",
    "loading.l2": "Assessing ambiguity…",
    "loading.l3": "Finding recipes with this ingredient…",
    "loading.l4": "Searching across USDA entries…",
    "loading.l5": "Selecting the best candidate…",
    "loading.done": "Done",

    "stage.1.name": "Analyze", "stage.1.desc": "detect language · translate",
    "stage.2.name": "Decide context", "stage.2.desc": "ambiguous? needs context",
    "stage.3.name": "Fetch context", "stage.3.desc": "get_recipe_context()",
    "stage.4.name": "Search USDA", "stage.4.desc": "search_usda_classes()",
    "stage.5.name": "Evaluate", "stage.5.desc": "select best · confidence",
    "stage.running": "running…", "stage.done": "✓ done", "stage.pending": "pending",

    "res.matched": "Matched USDA entry",
    "res.processed": "processed in",
    "res.conf.high": "high confidence", "res.conf.med": "medium confidence", "res.conf.low": "low confidence",
    "res.reasoning": "Agent reasoning",
    "res.trace.showTitle": "Show the agent trace",
    "res.trace.hideTitle": "Hide the agent trace",
    "res.trace.show": "SHOW DETAILS", "res.trace.hide": "HIDE",
    "res.conf.cap": "CONF.",

    "trace.s1.desc": "Detected language and translated to English.",
    "trace.s2.yes": "Yes — recipe context is needed",
    "trace.s2.no": "No — the ingredient maps directly",
    "trace.s3.searched": "Searched <strong>{total}</strong> recipes using „{q}“ — found <strong>{n}</strong> usage examples.",
    "trace.s3.none": "No example recipes were found for this ingredient in the dataset.",
    "trace.s4.searched": "Searched <strong>{total}</strong> USDA entries for „{q}“ — ranked the <strong>{n}</strong> closest candidates.",
    "trace.s5.text": "The model picked candidate <span class='mono2'>#{i} · USDA:{id}</span> with confidence <strong>{c}/100</strong> and the reasoning shown above.",
    "trace.s5.nomatch": "The model did not return a usable choice for this ingredient.",
    "trace.selected": "SELECTED",

    "rec.kicker": "Recipe browser",
    "rec.title": "Home Macedonian cuisine",
    "rec.showing": "showing <b>{n}</b> of {total}",
    "rec.ph": "Search by title or tag…",
    "rec.search": "Search",
    "rec.ingredients": "ingredients",
    "rec.empty": "No recipes for „{q}“.",
    "rec.loading": "Searching recipes…",
    "rec.all": "All",
    "rec.page": "page {n} of {total}",
    "rec.prev": "← prev", "rec.next": "next →",

    "det.back": "← all recipes",
    "det.ingredients": "Ingredients",
    "det.items": "{n} items",
    "det.link": "Link →",
    "det.linkAll": "Link all ingredients to USDA",
    "det.prep": "Preparation",
    "det.show": "SHOW", "det.hide": "HIDE",
    "det.source": "source ↗",
    "det.noIngredients": "No ingredients listed.",
    "det.loading": "Loading recipe…",
    "det.photo": "PHOTO",

    "map.running": "Running the agent on every ingredient… this may take a moment.",
    "map.analyzed": "Analyzed {n} ingredient(s)",
    "map.summary": "Mapping summary",
    "map.col.ingredient": "Ingredient", "map.col.qty": "Quantity", "map.col.usda": "USDA entity", "map.col.id": "ID", "map.col.conf": "Confidence",
    "map.details": "Details",
    "map.nomatch": "no match",

    "err.title": "No match for „{q}“",
    "err.body": "No USDA entry matched closely enough, and the model didn't return a usable choice. Try a different spelling or a simpler term.",
    "err.tryPavlaka": "Try „павлака“",
    "err.browse": "Browse recipes",
    "err.generic": "Something went wrong",
  },
};

function t(key, vars) {
  let s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.mk[key] || key;
  if (vars) for (const k in vars) s = s.replaceAll("{" + k + "}", vars[k]);
  return s;
}

function applyStaticI18n() {
  document.documentElement.lang = state.lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
  $$("#langToggle button").forEach((b) => b.classList.toggle("active", b.getAttribute("data-lang") === state.lang));
}

function setLang(lang) {
  if (lang === state.lang) return;
  state.lang = lang;
  try { localStorage.setItem("trpeza-lang", lang); } catch (_) {}
  applyStaticI18n();
  render();
}
