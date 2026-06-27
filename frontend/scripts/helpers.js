"use strict";
/* exported $, $$, APP, esc, sleep, fmt, HUES, hueGradient, DIAMOND_PALETTE,
   CONF, confMeta, confWord */

/* =====================================================================
   Трпеза — DOM + formatting helpers and presentation constants
   ===================================================================== */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const APP = () => $("#app");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// locale-aware number formatting (state.lang is read at call time)
const fmt = (n) => Number(n || 0).toLocaleString(state.lang === "mk" ? "de-DE" : "en-US");

/* ---------- folk colour palette for placeholder photos ---------- */
const HUES = [
  ["#E7C9A2", "#E0BE92"], ["#C9D3B4", "#BCC8A2"], ["#E9C68C", "#E3BB78"],
  ["#D8B79A", "#CEA988"], ["#E2C7A0", "#DBBC8E"], ["#EAC079", "#E6B765"],
];
const hueGradient = (i) => {
  const h = HUES[i % HUES.length];
  return `repeating-linear-gradient(135deg, ${h[0]} 0 13px, ${h[1]} 13px 26px)`;
};
const DIAMOND_PALETTE = ["#C0562F", "#E0A52C", "#B23121", "#7E8C66"];

/* ---------- confidence level → colour ---------- */
const CONF = {
  high: { c: "#6F8A5B", bg: "#EEF1E4", line: "#DCE3CB" },
  med:  { c: "#A06A1E", bg: "#FFEFD9", line: "#EAD2A4" },
  low:  { c: "#B23121", bg: "#FBE9E2", line: "#F0CFC4" },
};
const confMeta = (lvl) => CONF[lvl] || CONF.med;
const confWord = (lvl) => t("res.conf." + (lvl in CONF ? lvl : "med"));
