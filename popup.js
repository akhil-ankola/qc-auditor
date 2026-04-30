// popup.js — PagePulse v2.0
// Dark Mode | Score History | Broken Images | SEO X-Ray
'use strict';

const CIRC       = 2 * Math.PI * 69; // r=69 → 433.54
const SEV_PTS    = { high: 5, medium: 3, low: 1 };
const MAX_HISTORY = 10;

// ── Module-level state (replaces window.* globals) ────────────────────────────
const IMG_PAGE  = 15;
const LINK_PAGE = 20;
let _imgSections  = {};          // { broken[], toFix[], completed[] }
let _linksAll     = [];          // sorted unique links array
let _imgCardFn    = null;        // image card renderer (set in renderOvImages)
let _linkItemFn   = null;        // link item renderer (set in renderOvLinks)
let _schemaPretty = new Map();   // idx → pretty JSON string (avoids large data-attrs)

// ─── Runtime CSS (Quick Wins, Overview, Schema) ────────────────────────────────
(function injectCSS() {
  const s = document.createElement('style');
  s.textContent = `
    /* ── Quick Wins ──────────────────────────────────────────── */
    .quick-wins {
      background: linear-gradient(135deg, var(--orange-lt) 0%, var(--orange-lt) 100%);
      border: 1.5px solid var(--orange); border-radius: 10px;
      margin: 10px; overflow: hidden;
    }
    .qw-header {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px 5px;
      font-size: 11.5px; font-weight: 700; color: var(--orange);
      letter-spacing: .4px; text-transform: uppercase;
    }
    .qw-item {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 5px 12px; border-top: 1px solid var(--border);
      font-size: 12px; color: var(--t2); line-height: 1.4;
    }
    .qw-pts {
      background: var(--green); color: #fff; border-radius: 4px;
      padding: 1px 5px; font-size: 11px; font-weight: 700;
      white-space: nowrap; flex-shrink: 0; margin-top: 1px;
    }
    /* ── Issue severity pills ─────────────────────────────────── */
    .issue-sev-pill {
      border-radius: 4px; padding: 1px 6px; font-size: 10.5px;
      font-weight: 700; white-space: nowrap; margin-left: 4px;
    }
    .sev-high   { background: var(--red-lt);    color: var(--red); }
    .sev-medium { background: var(--orange-lt); color: var(--orange); }
    .sev-low    { background: var(--blue-lt);   color: var(--blue); }
    .sv-hint { font-size: 10.5px; color: var(--t4); margin-left: 3px; font-weight: 400; }
    /* Full-text rows (title, description) in Overview tab */
    .detail-row--full { align-items: flex-start; }
    .full-text-val {
      flex: 1; font-size: 11.5px; font-weight: 600; line-height: 1.5;
      word-break: break-word; white-space: normal; text-align: left;
      display: flex; flex-wrap: wrap; align-items: flex-start;
      gap: 4px; max-width: none;
    }
    .full-text-val span:first-child { flex: 1; min-width: 0; }

    /* ══════════════════════════════════════════════════════════
       SEO X-RAY — Inner tabs (pill style, distinct from parent underline tabs)
    ══════════════════════════════════════════════════════════ */
    .ov-tabs-bar {
      display: flex; gap: 5px; padding: 7px 10px;
      background: var(--bg); border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 10; overflow-x: auto;
      flex-wrap: nowrap;
      transition: background .25s, border-color .25s;
    }
    .ov-tabs-bar::-webkit-scrollbar { display: none; }
    .ov-tab-btn {
      padding: 4px 12px;
      border: 1.5px solid var(--border); background: var(--card);
      cursor: pointer; font-family: inherit; font-size: 11px;
      font-weight: 600; color: var(--t3); border-radius: 20px;
      transition: all .15s; white-space: nowrap; position: relative;
    }
    .ov-tab-btn::after { display: none; }
    .ov-tab-btn.active {
      background: var(--blue); border-color: var(--blue);
      color: #fff; font-weight: 700;
    }
    .ov-tab-btn:hover:not(.active) {
      border-color: var(--blue); color: var(--blue);
      background: var(--blue-lt);
    }
    .ov-panel { display: none; }
    .ov-panel.active { display: block; }

    /* ── Page Summary ─────────────────────────────────────────── */
    .ov-meta-table { background: var(--card); transition: background .25s; }
    .ov-meta-row {
      display: flex; align-items: flex-start;
      padding: 8px 15px; border-bottom: 1px solid var(--border2); gap: 10px;
    }
    .ov-meta-row:last-child { border-bottom: none; }
    .ov-meta-key { font-size: 12px; font-weight: 700; color: var(--t3); min-width: 110px; flex-shrink: 0; padding-top: 1px; }
    .ov-meta-val { font-size: 12px; color: var(--t1); line-height: 1.5; word-break: break-word; flex: 1; }
    .ov-meta-val.missing { color: var(--red); font-style: italic; }
    .ov-meta-val.warn    { color: var(--orange); }
    .ov-meta-val.good    { color: var(--green); }

    .ov-stats-grid { display: flex; background: var(--card); border-top: 2px solid var(--border); border-bottom: 1px solid var(--border); margin-top: 6px; transition: background .25s, border-color .25s; }
    .ov-stat-cell  { flex: 1; text-align: center; padding: 10px 4px 8px; border-right: 1px solid var(--border2); }
    .ov-stat-cell:last-child { border-right: none; }
    .ov-stat-label { font-size: 10.5px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px; }
    .ov-stat-num   { font-size: 18px; font-weight: 800; color: var(--t1); display: block; line-height: 1; }
    .ov-stat-num.zero { color: var(--border); }
    .ov-stat-num.warn { color: var(--orange); }
    .ov-stat-num.fail { color: var(--red); }

    /* ── Headers Tree ─────────────────────────────────────────── */
    .ov-tree-wrap { background: var(--card); padding: 10px 0 4px; transition: background .25s; }
    .ov-tree-item {
      display: flex; align-items: baseline; gap: 7px;
      padding: 3px 15px 3px calc(15px + var(--indent) * 18px); line-height: 1.45;
    }
    .ov-tree-item:hover { background: var(--tree-hover); }
    .ov-h-tag {
      font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 4px;
      white-space: nowrap; flex-shrink: 0; letter-spacing: .3px; text-transform: uppercase;
    }
    .ov-h1 { background: var(--blue);    color: #fff; }
    .ov-h2 { background: var(--blue-lt); color: var(--blue); }
    .ov-h3 { background: var(--border2); color: var(--t2); }
    .ov-h4 { background: var(--orange-lt); color: var(--orange); }
    .ov-h5 { background: var(--green-lt);  color: var(--green); }
    .ov-h6 { background: var(--purple-lt); color: var(--purple); }
    .ov-tree-text { font-size: 12.5px; color: var(--t1); }
    .ov-h-counts { display: flex; background: var(--bg); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-top: 6px; transition: background .25s, border-color .25s; }
    .ov-h-count-cell { flex: 1; text-align: center; padding: 8px 2px; border-right: 1px solid var(--border); }
    .ov-h-count-cell:last-child { border-right: none; }
    .ov-h-count-lbl { font-size: 10.5px; font-weight: 700; color: var(--t4); display: block; }
    .ov-h-count-num { font-size: 15px; font-weight: 800; color: var(--t1); display: block; }
    .ov-h-count-num.none { color: var(--border); }

    /* ── Images ───────────────────────────────────────────────── */
    .ov-img-stats { display: flex; background: var(--card); border-bottom: 2px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-img-stat  { flex: 1; text-align: center; padding: 12px 4px 10px; border-right: 1px solid var(--border2); }
    .ov-img-stat:last-child { border-right: none; }
    .ov-img-stat-label { font-size: 10px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 5px; }
    .ov-img-stat-num   { font-size: 24px; font-weight: 800; line-height: 1; display: block; }
    .ov-img-stat-num.neutral { color: var(--blue); }
    .ov-img-stat-num.problem { color: var(--red); }
    .ov-img-stat-num.broken  { color: var(--red); }
    .ov-img-stat-num.ok      { color: var(--green); }

    .ov-img-section { padding: 8px 15px 4px; font-size: 11px; font-weight: 800; color: var(--t4); text-transform: uppercase; letter-spacing: .6px; background: var(--bg); border-bottom: 1px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-img-section.broken-section { color: var(--red); background: var(--red-lt); border-color: var(--red); }

    .ov-img-card {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 15px; border-bottom: 1px solid var(--border2);
      background: var(--card); transition: background .12s, border-color .25s;
    }
    .ov-img-card:last-of-type { border-bottom: none; }
    .ov-img-card.is-broken { background: var(--red-lt); border-left: 3px solid var(--red); }
    .ov-img-thumb {
      width: 38px; height: 38px; border-radius: 6px;
      background: var(--border2); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 16px; overflow: hidden;
    }
    .ov-img-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 5px; }
    .ov-img-thumb.broken-thumb { background: var(--red-lt); border-color: var(--red); }
    .ov-img-info { flex: 1; min-width: 0; }
    .ov-img-filename { font-size: 12.5px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
    .ov-img-broken-badge { font-size: 10.5px; font-weight: 700; background: var(--red); color: #fff; padding: 1px 6px; border-radius: 4px; margin-bottom: 3px; display: inline-block; }
    .ov-img-attrs { display: flex; gap: 8px; flex-wrap: wrap; }
    .ov-img-attr  { font-size: 11px; display: flex; align-items: center; gap: 3px; }
    .ov-img-attr-key { color: var(--t4); font-weight: 600; }
    .ov-img-attr-val.miss  { color: var(--red);    font-weight: 700; }
    .ov-img-attr-val.ok    { color: var(--green);  font-weight: 700; }
    .ov-img-attr-val.empty { color: var(--orange); font-weight: 700; }

    /* ── Links ────────────────────────────────────────────────── */
    .ov-link-stats { display: flex; background: var(--card); border-bottom: 2px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-link-stat  { flex: 1; text-align: center; padding: 10px 4px 8px; border-right: 1px solid var(--border2); }
    .ov-link-stat:last-child { border-right: none; }
    .ov-link-stat-label { font-size: 10px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px; }
    .ov-link-stat-num   { font-size: 20px; font-weight: 800; display: block; line-height: 1; }
    .ov-link-stat-num.blue { color: var(--blue); }
    .ov-link-stat-num.warn { color: var(--orange); }
    .ov-links-label { padding: 7px 15px 4px; font-size: 11px; font-weight: 800; color: var(--t4); text-transform: uppercase; letter-spacing: .6px; background: var(--bg); border-bottom: 1px solid var(--border); border-top: 1px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-link-item { padding: 8px 15px; background: var(--card); border-bottom: 1px solid var(--border2); transition: background .12s, border-color .25s; }
    .ov-link-item:last-child { border-bottom: none; }
    .ov-link-row1   { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
    .ov-link-badge  { font-size: 8.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
    .badge-anchor   { background: var(--blue-lt);   color: var(--blue); }
    .badge-internal { background: var(--green-lt);  color: var(--green); }
    .badge-external { background: var(--red-lt);    color: var(--red); }
    .ov-link-href   { font-size: 12px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .ov-link-title  { font-size: 11.5px; color: var(--t3); margin-bottom: 2px; }
    .ov-link-title .ov-link-title-val  { font-weight: 600; color: var(--t2); }
    .ov-link-title .ov-link-title-miss { color: var(--red); font-style: italic; }
    .ov-link-occ    { font-size: 11px; color: var(--blue); font-weight: 600; }

    /* ── Schema ───────────────────────────────────────────────── */
    .ov-schema-stats { display: flex; background: var(--card); border-bottom: 2px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-schema-stat  { flex: 1; text-align: center; padding: 10px 4px 8px; border-right: 1px solid var(--border2); }
    .ov-schema-stat:last-child { border-right: none; }
    .ov-schema-stat-label { font-size: 10px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px; }
    .ov-schema-stat-num   { font-size: 22px; font-weight: 800; display: block; line-height: 1; }
    .ov-schema-stat-num.found { color: var(--green); }
    .ov-schema-stat-num.none  { color: var(--red); }
    .ov-schema-block { margin: 8px 12px; border-radius: 10px; overflow: hidden; border: 1.5px solid var(--border); background: var(--card); transition: background .25s, border-color .25s; }
    .ov-schema-block-head { display: flex; align-items: center; gap: 8px; padding: 9px 13px; background: var(--bg); border-bottom: 1px solid var(--border); justify-content: space-between; transition: background .25s, border-color .25s; }
    .ov-schema-block-left { display: flex; align-items: center; gap: 8px; }
    .ov-schema-idx  { font-size: 10.5px; font-weight: 800; color: #fff; background: var(--blue); border-radius: 4px; padding: 1px 6px; flex-shrink: 0; }
    .ov-schema-type { font-size: 13px; font-weight: 700; color: var(--t1); }
    .ov-schema-type-tag { font-size: 10.5px; font-weight: 700; padding: 1px 7px; border-radius: 5px; background: var(--blue-lt); color: var(--blue); white-space: nowrap; }
    .ov-schema-type-tag.error { background: var(--red-lt); color: var(--red); }
    .ov-schema-export-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px; background: var(--blue); color: #fff;
      border: none; font-size: 11px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: opacity .15s; white-space: nowrap;
    }
    .ov-schema-export-btn:hover { opacity: .85; }
    .ov-schema-code {
      font-family: 'Menlo','Consolas','Monaco',monospace;
      font-size: 11.5px; line-height: 1.6; color: var(--t1);
      background: var(--code-bg); padding: 10px 13px;
      overflow-x: auto; white-space: pre; max-height: 220px; overflow-y: auto;
      transition: background .25s, color .25s;
    }
    .ov-schema-code::-webkit-scrollbar { width: 4px; height: 4px; }
    .ov-schema-code::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    .json-key  { color: var(--blue); font-weight: 600; }
    .json-str  { color: var(--green); }
    .json-num  { color: var(--red); }
    .json-bool { color: var(--purple); font-weight: 700; }
    .json-null { color: var(--t4); font-weight: 700; }
    .ov-schema-error { padding: 10px 13px; color: var(--red); font-size: 12px; font-family: 'Menlo','Consolas',monospace; background: var(--red-lt); }
    .ov-export-all-wrap { padding: 10px 12px 12px; display: flex; justify-content: flex-end; }
    .ov-export-all-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 16px; border-radius: 8px; background: var(--green); color: #fff;
      border: none; font-size: 12px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: opacity .15s;
    }
    .ov-export-all-btn:hover { opacity: .85; }

    /* ── Shared helpers ───────────────────────────────────────── */
    .ov-truncate-note { text-align: center; padding: 8px 15px; font-size: 11.5px; color: var(--t4); background: var(--bg); border-top: 1px solid var(--border); }
    .ov-empty { display: flex; flex-direction: column; align-items: center; padding: 24px; gap: 6px; text-align: center; background: var(--bg); }
    .ov-empty-icon { font-size: 24px; }
    .ov-empty-text { font-size: 13px; font-weight: 700; color: var(--t1); }
    .ov-empty-sub  { font-size: 12px; color: var(--t4); }

    /* ── Copy button ──────────────────────────────────────────── */
    .ov-copy-btn {
      width: 22px; height: 22px; border-radius: 5px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: none; border: 1px solid var(--border);
      color: var(--t4); cursor: pointer; transition: all .15s;
      padding: 0;
    }
    .ov-copy-btn:hover { background: var(--blue-lt); border-color: var(--blue); color: var(--blue); }
    .ov-copy-btn.copied { background: var(--green-lt); border-color: var(--green); color: var(--green); }


    /* ── Phase 4: Search, Format bar, Export, Keyword Table ─── */
    .ov-toolbar {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px; background: var(--card);
      border-bottom: 1px solid var(--border);
      transition: background .25s, border-color .25s;
    }
    .ov-search {
      flex: 1; max-width: 130px; padding: 5px 10px; border-radius: 20px;
      border: 1.5px solid var(--border); background: var(--input-bg);
      color: var(--t1); font-size: 11px; font-family: inherit;
      outline: none; transition: border-color .15s;
    }
    .ov-search:focus { border-color: var(--blue); }
    .ov-search::placeholder { color: var(--t4); }
    .ov-export-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 11px; border-radius: 20px; white-space: nowrap;
      background: var(--blue); color: #fff; border: none;
      font-size: 10.5px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: opacity .15s;
    }
    .ov-export-btn:hover { opacity: .85; }
    .ov-export-btn.green { background: var(--green); }

    /* ── Download on Front toggle (in ov-toolbar) ─────────────────── */
    .img-dl-front-label {
      display: flex; align-items: center; gap: 5px;
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
      padding: 4px 9px 4px 6px; border-radius: 20px;
      border: 1.5px solid var(--border); background: var(--card);
      font-size: 10.5px; font-weight: 700; color: var(--t3);
      transition: all .15s; user-select: none;
    }
    .img-dl-front-label input[type="checkbox"] { display: none; }
    .img-dl-front-label:hover { border-color: var(--blue); color: var(--blue); }
    .img-dl-front-label:has(input:checked) { border-color: var(--blue); background: var(--blue-lt); color: var(--blue); }
    .img-dl-front-toggle {
      width: 26px; height: 14px; border-radius: 7px; flex-shrink: 0;
      background: var(--border2); border: 1.5px solid var(--border);
      position: relative; transition: all .2s;
    }
    .img-dl-front-toggle::after {
      content: ''; position: absolute; top: 1px; left: 1px;
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--t4); transition: transform .2s, background .2s;
    }
    .img-dl-front-label:has(input:checked) .img-dl-front-toggle { background: var(--blue-lt); border-color: var(--blue); }
    .img-dl-front-label:has(input:checked) .img-dl-front-toggle::after { transform: translateX(12px); background: var(--blue); }

    .ov-fmt-bar {
      display: flex; flex-wrap: wrap; gap: 5px; align-items: center;
      padding: 8px 12px; background: var(--card);
      border-bottom: 1px solid var(--border);
      transition: background .25s, border-color .25s;
    }
    .ov-fmt-pill {
      display: flex; align-items: center; gap: 4px;
      padding: 3px 9px; border-radius: 12px; cursor: pointer;
      font-size: 10.5px; font-weight: 700; border: 1.5px solid transparent;
      transition: all .15s; background: var(--border2); color: var(--t2);
    }
    .ov-fmt-pill:hover { border-color: var(--blue); color: var(--blue); }
    .ov-item-num {
      width: 22px; height: 22px; border-radius: 50%;
      background: var(--border2); color: var(--t4);
      font-size: 9px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .kw-toolbar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--card); border-bottom: 1px solid var(--border); }
    .kw-stats { display: flex; gap: 10px; padding: 7px 12px 6px; background: var(--bg); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    /* N-gram tab switcher */
    .kw-ngram-tabs {
      display: flex; gap: 4px; padding: 6px 12px;
      background: var(--card); border-bottom: 1px solid var(--border);
      transition: background .25s, border-color .25s;
    }
    .kw-ngram-btn {
      padding: 4px 14px; border-radius: 16px; font-size: 11px; font-weight: 700;
      cursor: pointer; font-family: inherit; border: 1.5px solid var(--border);
      background: var(--bg); color: var(--t3); transition: all .15s;
    }
    .kw-ngram-btn:hover  { border-color: var(--blue); color: var(--blue); }
    .kw-ngram-btn.active { background: var(--blue); border-color: var(--blue); color: #fff; }
    .kw-stat { font-size: 10.5px; color: var(--t3); }
    .kw-stat strong { color: var(--t1); font-weight: 800; }
    .kw-export-row { display: flex; gap: 6px; padding: 7px 12px; background: var(--card); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .kw-exp-btn {
      padding: 4px 11px; border-radius: 6px; font-size: 10px; font-weight: 700;
      cursor: pointer; font-family: inherit; transition: all .15s;
      border: 1.5px solid var(--border); background: var(--bg); color: var(--t2);
    }
    .kw-exp-btn:hover { border-color: var(--blue); color: var(--blue); background: var(--blue-lt); }
    /* Keyword export dropdown */
    .kw-dl-wrap { position: relative; }
    .kw-dl-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: 20px;
      background: var(--blue); color: #fff; border: none;
      font-size: 10.5px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: opacity .15s;
    }
    .kw-dl-btn:hover { opacity: .85; }
    .kw-dl-menu {
      position: absolute; top: calc(100% + 5px); right: 0;
      background: var(--card); border: 1.5px solid var(--border);
      border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.15);
      overflow: hidden; z-index: 50; min-width: 140px;
      animation: fadeIn .12s ease;
    }
    .kw-dl-menu-item {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 14px; font-size: 11px; font-weight: 600;
      color: var(--t1); cursor: pointer; border: none;
      background: none; width: 100%; font-family: inherit;
      transition: background .12s; text-align: left;
    }
    .kw-dl-menu-item:hover { background: var(--hover-bg); color: var(--blue); }
    .kw-table-wrap { overflow-x: auto; }
    .kw-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .kw-table th {
      padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 800;
      color: var(--t4); text-transform: uppercase; letter-spacing: .4px;
      background: var(--bg); border-bottom: 2px solid var(--border);
      white-space: nowrap; cursor: pointer; user-select: none;
      position: sticky; top: 0; transition: background .25s, border-color .25s;
    }
    .kw-table th:hover { color: var(--blue); }
    .kw-table th.sort-asc::after  { content: " ↑"; color: var(--blue); }
    .kw-table th.sort-desc::after { content: " ↓"; color: var(--blue); }
    .kw-table td {
      padding: 6px 10px; border-bottom: 1px solid var(--border2);
      background: var(--card); color: var(--t1); transition: background .12s;
    }
    .kw-table tr:hover td { background: var(--hover-bg); }
    .kw-table tr:last-child td { border-bottom: none; }
    .kw-table td:first-child { color: var(--t4); font-size: 10px; }
    .kw-word { font-weight: 700; }
    .kw-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 4px; font-size: 9px; font-weight: 800;
    }
    .kw-badge.yes-b { background: var(--blue-lt);   color: var(--blue);   }
    .kw-badge.yes-i { background: var(--purple-lt); color: var(--purple); }
    .kw-badge.no    { background: var(--border2);   color: var(--t4);     }
    .prom-dots { display: flex; gap: 2px; align-items: center; }
    .prom-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border2); }
    .prom-dot.on { background: var(--blue); }

    /* ── Tech Stack Tab ─────────────────────────────────────────── */
    .tech-summary {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 15px; background: var(--card);
      font-size: 11px; color: var(--t2);
      border-bottom: 2px solid var(--border);
      transition: background .25s, border-color .25s;
    }
    .tech-summary strong { color: var(--green); font-size: 14px; }
    .tech-group {
      background: var(--card); margin-bottom: 4px;
      transition: background .25s;
    }
    .tech-group-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 15px 5px;
      font-size: 10.5px; font-weight: 800; color: var(--t3);
      text-transform: uppercase; letter-spacing: .5px;
      background: var(--bg); border-bottom: 1px solid var(--border);
      border-top: 1px solid var(--border);
      transition: background .25s, border-color .25s;
    }
    .tech-group-badge {
      font-size: 9px; font-weight: 800; padding: 2px 7px;
      border-radius: 8px; background: var(--green-lt); color: var(--green);
      text-transform: none; letter-spacing: 0;
    }
    .tech-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 15px; border-bottom: 1px solid var(--border2);
      transition: background .12s;
    }
    .tech-row:last-child { border-bottom: none; }
    .tech-row:hover { background: var(--hover-bg); }
    .tech-name { font-size: 11.5px; font-weight: 600; color: var(--t1); }
    .tech-row--off .tech-name { color: var(--t4); }
    .tech-val { display: flex; align-items: center; gap: 6px; }
    .tech-val--none { color: var(--border); font-size: 13px; }
    .tech-val--found { }
    .tech-id {
      font-size: 11px; font-weight: 700; color: var(--green);
      font-family: 'Menlo','Consolas',monospace; letter-spacing: .3px;
      max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    /* ── Load More button ─────────────────────────────────────── */
    .ov-load-more-btn {
      display: flex; align-items: center; justify-content: center;
      width: 100%; padding: 10px 16px;
      background: var(--bg); border: none;
      border-top: 1px solid var(--border);
      font-family: inherit; font-size: 12px; font-weight: 700;
      color: var(--blue); cursor: pointer;
      transition: background .15s, color .15s;
      gap: 6px;
    }
    .ov-load-more-btn::before {
      content: '';
      display: inline-block; width: 14px; height: 14px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%231A73E8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-size: contain;
    }
    :root.dark .ov-load-more-btn::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238AB4F8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    }
    .ov-load-more-btn:hover { background: var(--blue-lt); }

    /* ── Schema Accordion ─────────────────────────────────────────── */
    .ov-schema-block-head { cursor: pointer; user-select: none; }
    .ov-schema-chevron {
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: transform .2s; color: var(--t4); margin-left: 2px;
    }
    .ov-schema-block.collapsed .ov-schema-chevron { transform: rotate(-90deg); }
    .ov-schema-block.collapsed .ov-schema-code,
    .ov-schema-block.collapsed .ov-schema-error { display: none; }

    /* ── WCAG Tab ─────────────────────────────────────────────────── */
    .wcag-tabs-bar {
      display: flex; gap: 5px; padding: 7px 10px;
      background: var(--bg); border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 10;
      transition: background .25s, border-color .25s;
    }
    .wcag-tab-btn {
      padding: 4px 12px; border: 1.5px solid var(--border);
      background: var(--card); cursor: pointer; font-family: inherit;
      font-size: 11px; font-weight: 600; color: var(--t3);
      border-radius: 20px; transition: all .15s; white-space: nowrap;
    }
    .wcag-tab-btn::after { display: none; }
    .wcag-tab-btn.active { background: var(--purple); border-color: var(--purple); color: #fff; font-weight: 700; }
    .wcag-tab-btn:hover:not(.active) { border-color: var(--purple); color: var(--purple); background: var(--purple-lt); }
    .wcag-panel { display: none; }
    .wcag-panel.active { display: block; }

    /* ── WCAG Order tab ───────────────────────────────────────────── */
    .wcag-order-ctrl {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 9px 14px; background: var(--card);
      border-bottom: 2px solid var(--border);
      transition: background .25s, border-color .25s;
    }
    .wcag-path-label {
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      user-select: none; padding: 6px 12px; border-radius: 20px;
      border: 1.5px solid var(--border); background: var(--bg);
      font-size: 11.5px; font-weight: 700; color: var(--t2); transition: all .15s;
    }
    .wcag-path-label input[type="checkbox"] { display: none; }
    .wcag-path-toggle {
      width: 32px; height: 17px; border-radius: 9px; flex-shrink: 0;
      background: var(--border2); border: 1.5px solid var(--border);
      position: relative; transition: all .2s;
    }
    .wcag-path-toggle::after {
      content: ''; position: absolute; top: 1px; left: 1px;
      width: 11px; height: 11px; border-radius: 50%;
      background: var(--t4); transition: transform .2s, background .2s;
    }
    .wcag-path-label:has(input:checked) { border-color: var(--purple); background: var(--purple-lt); color: var(--purple); }
    .wcag-path-label:has(input:checked) .wcag-path-toggle { background: var(--purple-lt); border-color: var(--purple); }
    .wcag-path-label:has(input:checked) .wcag-path-toggle::after { transform: translateX(15px); background: var(--purple); }
    .wcag-order-count { font-size: 11px; color: var(--t4); font-weight: 600; }

    .wcag-order-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 8px 14px; border-bottom: 1px solid var(--border2);
      background: var(--card); transition: background .12s;
    }
    .wcag-order-item:last-child { border-bottom: none; }
    .wcag-order-item:hover { background: var(--hover-bg); }
    .wcag-order-num {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--purple); color: #fff;
      font-size: 10px; font-weight: 800; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; margin-top: 2px;
    }
    .wcag-order-body { flex: 1; min-width: 0; }
    .wcag-order-tag {
      font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 4px;
      background: var(--blue-lt); color: var(--blue);
      text-transform: lowercase; letter-spacing: .2px; flex-shrink: 0;
    }
    .wcag-order-text { font-size: 12.5px; font-weight: 600; color: var(--t1); word-break: break-word; }
    .wcag-order-text.empty { color: var(--t4); font-style: italic; font-weight: 400; }
    .wcag-order-meta { display: flex; gap: 5px; margin-top: 3px; flex-wrap: wrap; }
    .wcag-order-pill {
      font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;
      background: var(--border2); color: var(--t3);
    }
    .wcag-order-pill.tabidx { background: var(--orange-lt); color: var(--orange); }
    .wcag-order-pill.role   { background: var(--green-lt);  color: var(--green); }
  `;
  document.head.appendChild(s);
})();

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initDarkMode();
  await initHistory();
  setupTabs();
  setupOverviewTabs();
  setupFontsTab();
  setupWcagTab();
  await restoreActiveTab();
  await restoreActiveOvTab();
  document.getElementById('btnReanalyze').addEventListener('click', runAudit);
  document.getElementById('btnRetry').addEventListener('click', runAudit);
  runAudit();
});

// ══════════════════════════════════════════════════════════════════════════════
//  DARK MODE
// ══════════════════════════════════════════════════════════════════════════════
async function initDarkMode() {
  const { darkMode } = await storageGet('darkMode');
  const prefersDark  = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = darkMode !== undefined ? darkMode : prefersDark;
  applyDarkMode(isDark);

  document.getElementById('btnDark').addEventListener('click', async () => {
    const currentlyDark = document.documentElement.classList.contains('dark');
    applyDarkMode(!currentlyDark);
    await storageSet('darkMode', !currentlyDark);
  });
}

function applyDarkMode(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
  document.getElementById('iconMoon').classList.toggle('hidden', isDark);
  document.getElementById('iconSun').classList.toggle('hidden', !isDark);
  document.getElementById('btnDark').classList.toggle('active', isDark);
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCORE HISTORY
// ══════════════════════════════════════════════════════════════════════════════
let _currentHostname = '';

async function initHistory() {
  document.getElementById('btnHistory').addEventListener('click', toggleHistoryPanel);
  document.getElementById('btnClearHistory').addEventListener('click', async () => {
    if (!_currentHostname) return;
    await storageRemove(`history_${_currentHostname}`);
    renderHistoryPanel([]);
  });
}

function toggleHistoryPanel() {
  const panel = document.getElementById('historyPanel');
  const btn   = document.getElementById('btnHistory');
  const isOpen = !panel.classList.contains('hidden');
  panel.classList.toggle('hidden', isOpen);
  btn.classList.toggle('active', !isOpen);
}

async function saveToHistory(hostname, scores) {
  const key = `history_${hostname}`;
  const { [key]: existing } = await storageGet(key);
  const history = Array.isArray(existing) ? existing : [];

  history.unshift({
    timestamp:  Date.now(),
    total:      scores.total,
    seoScore:   scores.seoScore,
    perfScore:  scores.perfScore,
    a11yScore:  scores.a11yScore,
    bpScore:    scores.bpScore
  });

  const trimmed = history.slice(0, MAX_HISTORY);
  await storageSet(key, trimmed);
  return trimmed;
}

async function loadHistory(hostname) {
  const key = `history_${hostname}`;
  const { [key]: existing } = await storageGet(key);
  return Array.isArray(existing) ? existing : [];
}

function renderHistoryPanel(history) {
  const el = document.getElementById('historyList');

  if (!history.length) {
    el.innerHTML = `<div class="history-empty">No history yet for this domain.<br>Run an audit to start tracking!</div>`;
    return;
  }

  el.innerHTML = history.map((entry, i) => {
    const date  = new Date(entry.timestamp);
    const label = formatDate(date);

    // Grade badge
    let badgeCls;
    if      (entry.total >= 90) badgeCls = 'hbadge-excellent';
    else if (entry.total >= 70) badgeCls = 'hbadge-good';
    else if (entry.total >= 50) badgeCls = 'hbadge-fair';
    else                        badgeCls = 'hbadge-poor';

    // Delta vs previous entry
    let deltaHTML = '';
    if (i < history.length - 1) {
      const delta = entry.total - history[i + 1].total;
      if      (delta > 0) deltaHTML = `<span class="history-delta delta-up">▲ +${delta}</span>`;
      else if (delta < 0) deltaHTML = `<span class="history-delta delta-down">▼ ${delta}</span>`;
      else                deltaHTML = `<span class="history-delta delta-same">— same</span>`;
    }

    return `<div class="history-item">
      <div class="history-score-badge ${badgeCls}">${entry.total}</div>
      <div class="history-meta">
        <div class="history-date">${esc(label)}</div>
        <div class="history-cats">
          <span class="hcat">SEO ${entry.seoScore}/25</span>
          <span class="hcat">Perf ${entry.perfScore}/25</span>
          <span class="hcat">A11y ${entry.a11yScore}/25</span>
          <span class="hcat">BP ${entry.bpScore}/25</span>
        </div>
      </div>
      ${deltaHTML}
    </div>`;
  }).join('');
}

function formatDate(d) {
  const now  = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ══════════════════════════════════════════════════════════════════════════════
//  STORAGE HELPERS (chrome.storage.local)
// ══════════════════════════════════════════════════════════════════════════════
function storageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}
function storageSet(key, value) {
  return new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve));
}
function storageRemove(key) {
  return new Promise(resolve => chrome.storage.local.remove(key, resolve));
}

// ══════════════════════════════════════════════════════════════════════════════
//  TABS SETUP
// ══════════════════════════════════════════════════════════════════════════════
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${tab}`).classList.add('active');
      storageSet('activeTab', tab); // persist
    });
  });
}

async function restoreActiveTab() {
  const { activeTab } = await storageGet('activeTab');
  if (activeTab) {
    const btn   = document.querySelector(`.tab-btn[data-tab="${activeTab}"]`);
    const panel = document.getElementById(`panel-${activeTab}`);
    if (btn && panel) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      panel.classList.add('active');
    }
  }
}

function setupOverviewTabs() {
  document.querySelectorAll('.ov-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.ovtab;
      document.querySelectorAll('.ov-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.ov-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`ovpanel-${tab}`).classList.add('active');
      storageSet('activeOvTab', tab); // persist
    });
  });
}

async function restoreActiveOvTab() {
  const { activeOvTab } = await storageGet('activeOvTab');
  if (activeOvTab) {
    const btn   = document.querySelector(`.ov-tab-btn[data-ovtab="${activeOvTab}"]`);
    const panel = document.getElementById(`ovpanel-${activeOvTab}`);
    if (btn && panel) {
      document.querySelectorAll('.ov-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.ov-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      panel.classList.add('active');
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN AUDIT FLOW
// ══════════════════════════════════════════════════════════════════════════════
async function runAudit() {
  showState('loading');
  animateLoadingSteps();

  // Hide history panel on new audit
  document.getElementById('historyPanel').classList.add('hidden');
  document.getElementById('btnHistory').classList.remove('active');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return showError('Cannot determine the current tab URL.');

    const blocked = ['chrome://','chrome-extension://','about:','edge://','brave://','moz-extension://'];
    if (blocked.some(p => tab.url.startsWith(p)))
      return showError('Browser internal pages cannot be audited. Navigate to any website and try again.');

    try {
      const u = new URL(tab.url);
      _currentHostname = u.hostname.replace(/^www\./, '');
      document.getElementById('siteName').textContent = _currentHostname;
      document.getElementById('siteDot').className =
        'site-dot' + (u.protocol === 'https:' ? '' : ' insecure');
    } catch (_) {
      _currentHostname = tab.url.slice(0, 35);
      document.getElementById('siteName').textContent = _currentHostname;
    }

    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await delay(120);

    const resp = await chrome.tabs.sendMessage(tab.id, { action: 'collectData' });
    if (!resp?.success) throw new Error(resp?.error || 'Failed to collect page data.');

    const scores = calculateScores(resp.data);

    // Save to history + refresh panel
    const history = await saveToHistory(_currentHostname, scores);
    renderHistoryPanel(history);

    renderResults(scores, resp.data);
    showState('results');
    await restoreActiveTab();
    await restoreActiveOvTab();
    requestAnimationFrame(() => setTimeout(() => animateScores(scores), 80));

  } catch (err) {
    console.error('[PagePulse]', err);
    showError(err.message || 'An unexpected error occurred. Please try again.');
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function showState(s) {
  ['loading','results','error'].forEach(x =>
    document.getElementById(`state${capitalize(x)}`).classList.toggle('hidden', x !== s)
  );
}
function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showState('error');
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCORE CALCULATION
// ══════════════════════════════════════════════════════════════════════════════
function calculateScores(data) {
  const issues = [];
  const deduct = { seo: 0, perf: 0, a11y: 0, bp: 0 };
  const fail   = (catKey, cat, sev, title, detail) => {
    const pts = SEV_PTS[sev] || 1;
    issues.push({ cat, sev, title, detail, pts });
    deduct[catKey] = Math.min(deduct[catKey] + pts, 25);
  };

  const S = data.seo, P = data.performance,
        A = data.accessibility, B = data.bestPractices,
        OV = data.overview;

  // ── SEO ────────────────────────────────────────────────────────────────────
  if (!S.title)
    fail('seo','SEO','high','Missing <title> tag','Every page needs a unique, descriptive title. It\'s the #1 on-page SEO signal and appears as the clickable headline in search results.');
  else if (S.titleLength < 30)
    fail('seo','SEO','medium',`Title too short — ${S.titleLength} chars (target: 50–60)`,`Expand to 50–60 chars, leading with your primary keyword. You have ${60 - S.titleLength} characters of unused space.`);
  else if (S.titleLength > 60)
    fail('seo','SEO','low',`Title too long — ${S.titleLength} chars (truncated at 60)`,'Trim to fit the key message. Remove filler like "| Home" or "Welcome to".');

  if (!S.metaDescription)
    fail('seo','SEO','high','Missing meta description','Write a compelling 140–160 char description with a clear CTA. Good descriptions directly improve organic CTR.');
  else if (S.metaDescriptionLength < 140)
    fail('seo','SEO','medium',`Meta description too short — ${S.metaDescriptionLength} chars (target: 140–160)`,`You have ${160 - S.metaDescriptionLength} chars of unused SERP snippet space. Expand with a benefit statement, keyword, and call-to-action.`);
  else if (S.metaDescriptionLength > 160)
    fail('seo','SEO','low',`Meta description too long — ${S.metaDescriptionLength} chars (truncated at 160)`,'Put the critical message first; trim filler from the end.');

  if (S.h1Count === 0)      fail('seo','SEO','high','No H1 heading found','Every page needs exactly one H1 containing your primary keyword.');
  else if (S.h1Count > 1)   fail('seo','SEO','medium',`${S.h1Count} H1 tags detected — should be exactly 1`,'Multiple H1s dilute keyword signals. Keep one H1; use H2–H6 for sub-sections.');
  if (S.h2Count === 0 && S.h1Count > 0)
    fail('seo','SEO','low','No H2 headings found',
      'For multi-section pages, H2 tags help Google index sub-topics and improve scannability. If this is a short single-topic page (landing page, 404, login), this is not an issue. For content-heavy pages, add H2s to divide content into logical sections.');
  if (!S.headingHierarchyOk) fail('seo','SEO','medium','Broken heading hierarchy (levels skipped)','Heading levels must not skip (e.g., H1 → H3 without H2). Fix heading nesting: H1 → H2 → H3 → H4.');

  const hasOGFull = S.ogTitle && S.ogDescription && S.ogImage;
  const hasOGAny  = S.ogTitle || S.ogDescription || S.ogImage;
  if (!hasOGAny)
    fail('seo','SEO','medium','No Open Graph meta tags found','Without OG tags, social platforms auto-generate previews. Add og:title, og:description, og:image (1200×630px), og:url, og:type.');
  else if (!hasOGFull) {
    const missing = [!S.ogTitle&&'og:title',!S.ogDescription&&'og:description',!S.ogImage&&'og:image'].filter(Boolean).join(', ');
    fail('seo','SEO','low',`Incomplete Open Graph tags — missing: ${missing}`,'Partial OG tags produce broken social cards. Use Facebook\'s Sharing Debugger to validate.');
  }

  if (!S.canonical) fail('seo','SEO','low','No canonical tag','Add <link rel="canonical"> to prevent duplicate content penalties.');
  if (!S.jsonLD)    fail('seo','SEO','medium','No structured data (JSON-LD) found','Structured data unlocks Rich Results. Validate at search.google.com/rich-results-test.');
  if (S.nonDescriptiveLinks > 0) fail('seo','SEO','low',`${S.nonDescriptiveLinks} non-descriptive link(s) ("click here", "here", "read more")`,'Vague anchor text misses SEO signals. Replace with descriptive text like "View pricing plans".');

  // ── Performance ───────────────────────────────────────────────────────────
  if (P.loadTime > 0) {
    if      (P.loadTime >= 4000) fail('perf','Performance','high',`Very slow page load: ${(P.loadTime/1000).toFixed(2)}s — target: <2.5s`,'Critically slow. Google data shows page abandonment increases sharply above 3s. Fix: server caching, CDN, image compression, eliminate render-blocking resources.');
    else if (P.loadTime >= 2500) fail('perf','Performance','medium',`Slow page load: ${(P.loadTime/1000).toFixed(2)}s — target: <2.5s`,'Above Google\'s recommended 2.5s LCP threshold. Quick wins: lazy-load images, code-split JS, compress to WebP/AVIF, enable gzip/Brotli, add a CDN.');
    else if (P.loadTime >= 1500) fail('perf','Performance','low',`Page load: ${(P.loadTime/1000).toFixed(2)}s — good, room to improve`,'Acceptable but not optimal. Target <1.5s for excellent Core Web Vitals. Preload critical fonts/CSS, preconnect to third-party origins.');
  }
  if (P.ttfb > 0) {
    if      (P.ttfb >= 1800) fail('perf','Performance','high',`High TTFB: ${P.ttfb}ms — target: <800ms`,'Server response is critically slow. Google\'s threshold for "needs improvement" is 1800ms. Fix: server-side caching (Redis/Memcached), CDN, database query optimization.');
    else if (P.ttfb >= 800)  fail('perf','Performance','medium',`TTFB: ${P.ttfb}ms — target: <800ms`,'Slow server response. Google\'s "good" threshold is under 800ms. Add HTTP cache headers, use a reverse proxy (Nginx/Cloudflare), optimize slow server-side code.');
  }
  if      (P.renderBlockingScripts >= 4) fail('perf','Performance','high',`${P.renderBlockingScripts} render-blocking scripts — critical`,'Add defer to DOM-dependent scripts; async to independent ones. Move non-critical scripts after </body>.');
  else if (P.renderBlockingScripts >= 1) fail('perf','Performance','medium',`${P.renderBlockingScripts} render-blocking script(s)`,'Add async or defer. Eliminating blocking scripts is often the highest-impact performance change.');
  if      (P.domSize >= 3000) fail('perf','Performance','high',`Excessive DOM: ${P.domSize.toLocaleString()} nodes — Google limit: 1,500`,'Solutions: virtual scrolling for lists, lazy-render below-fold sections via Intersection Observer.');
  else if (P.domSize >= 1500) fail('perf','Performance','medium',`Large DOM: ${P.domSize.toLocaleString()} nodes — Google limit: 1,500`,'Consider pagination, infinite scroll with DOM recycling, or rendering off-screen content only when it enters the viewport.');
  if (P.totalImages >= 3) {
    const r = P.lazyImages / P.totalImages;
    if      (r < 0.3) fail('perf','Performance','medium',`Only ${P.lazyImages}/${P.totalImages} images use lazy loading`,`Add loading="lazy" to all below-fold images. Can reduce initial page weight by 40–70%.`);
    else if (r < 0.7) fail('perf','Performance','low',`${P.lazyImages}/${P.totalImages} images lazy loaded — could be higher`,`${P.totalImages - P.lazyImages} images still load eagerly. Add loading="lazy" to any non-hero image.`);
  }
  if (P.largeImagesCount > 0) fail('perf','Performance','medium',`${P.largeImagesCount} large image(s) detected (>200KB each)`,'Compress to WebP or AVIF (50–80% smaller). Serve correct dimensions. Tools: Squoosh.app, Cloudinary, sharp.');
  if (P.totalImages >= 3 && !P.hasWebP) fail('perf','Performance','low',`No WebP or next-gen images (${P.totalImages} images use legacy formats)`,'WebP is 25–34% smaller than JPEG; AVIF up to 50% smaller. Use <picture> for format negotiation.');
  if      (P.scriptsCount > 20) fail('perf','Performance','medium',`${P.scriptsCount} external scripts — too many`,'Bundle with Vite/Webpack, audit third-party scripts, load non-critical scripts on user interaction.');
  else if (P.scriptsCount > 12) fail('perf','Performance','low',`${P.scriptsCount} external scripts loaded`,'Consider bundling related scripts. Audit third-party scripts for unused ones.');

  // ── Accessibility ─────────────────────────────────────────────────────────
  if (!A.langAttribute) fail('a11y','Accessibility','high','Missing lang attribute on <html>','Screen readers switch pronunciation engines based on lang. Without it, text-to-speech may be unintelligible. Required for WCAG 3.1.1.');
  if (A.totalImages > 0 && A.imagesWithoutAlt > 0) fail('a11y','Accessibility','high',`${A.imagesWithoutAlt} of ${A.totalImages} image(s) missing alt attribute`,'For meaningful images: descriptive alt text. For decorative: alt="" (empty string). Violates WCAG 1.1.1.');
  if (A.poorAltCount > 0) fail('a11y','Accessibility','low',`${A.poorAltCount} image(s) with meaningless alt text (e.g., "image", "photo")`,'Generic alt text is worse than no alt. Write what the image conveys, not what it is.');

  // ── Broken images issue (NEW) ──────────────────────────────────────────────
  const brokenCount = OV?.imagesBroken || 0;
  if (brokenCount > 0) fail('a11y','Accessibility','high',`${brokenCount} broken image(s) detected (404 / failed to load)`,'These images return errors and render as empty boxes. Fix or remove the broken src URLs. Broken images hurt user experience and can affect SEO image indexing.');

  if (A.hasForms && A.inputsWithoutLabels > 0)
    fail('a11y','Accessibility','high',
      `${A.inputsWithoutLabels} form input(s) missing accessible labels`,
      `These inputs have no programmatic label — placeholder text does NOT count. Placeholders disappear on typing, have insufficient color contrast, and are not reliably announced by screen readers. Fix options: (1) <label for="inputId">, (2) aria-label="Email address" on the input, (3) wrap the input inside <label>. Violates WCAG 1.3.1 and 4.1.2.`);
  if (A.buttonsWithoutText > 0) fail('a11y','Accessibility','high',`${A.buttonsWithoutText} button(s) without accessible text`,'Icon-only buttons are announced as "button" with no context. Add aria-label="Close dialog". Violates WCAG 4.1.2.');
  if (A.linksWithoutText > 0)   fail('a11y','Accessibility','medium',`${A.linksWithoutText} link(s) without accessible text`,'Links with no text or aria-label are announced as the raw URL. Add descriptive text or aria-label.');
  if (!A.hasSkipNav)             fail('a11y','Accessibility','medium','No skip navigation link','Add <a href="#main-content">Skip to main content</a> as the first element. Required by WCAG 2.4.1.');
  if      (A.ariaLandmarks === 0) fail('a11y','Accessibility','medium','No semantic landmark regions found','Add <main>, <nav>, <header>, and <footer> to create navigable regions for screen reader users.');
  else if (A.ariaLandmarks < 3)   fail('a11y','Accessibility','low',`Limited landmarks — ${A.ariaLandmarks} found (recommend 3+)`,'Add more semantic regions: <main>, <nav>, <header>, <footer>, <aside>.');
  if (A.tabindexAbuse > 0)        fail('a11y','Accessibility','low',`${A.tabindexAbuse} element(s) with positive tabindex`,'Remove all tabindex="1+". Use tabindex="0" for natural tab order; tabindex="-1" for programmatic focus.');
  if (A.focusCssKilled || A.focusKilledInline > 0) fail('a11y','Accessibility','medium','Focus outline appears to be suppressed','Never remove focus indicators without replacing with a custom :focus-visible style. Violates WCAG 2.4.7.');

  // ── Best Practices ────────────────────────────────────────────────────────
  if (!B.isHttps)              fail('bp','Best Practices','high','Site is not using HTTPS','HTTP is unencrypted and carries a Google ranking penalty. Get a free SSL certificate from Let\'s Encrypt.');
  if (B.mixedContent)          fail('bp','Best Practices','high','Mixed content: HTTP resources on HTTPS page','Your HTTPS page loads HTTP resources — browsers block or warn, breaking your UI. Update all resource URLs to HTTPS.');
  if (!B.hasViewportMeta)      fail('bp','Best Practices','high','Missing viewport meta tag','Without <meta name="viewport" content="width=device-width, initial-scale=1">, your site renders zoomed-out on mobile.');
  if (!B.hasSemanticHTML)      fail('bp','Best Practices','medium',`Low semantic HTML — only ${B.semanticTagsCount} semantic element type(s)`,'Replace generic <div> containers with <article>, <section>, <figure>, <time>, <address>.');
  if (B.deprecatedTags.length) fail('bp','Best Practices','medium',`Deprecated HTML tags: ${B.deprecatedTags.slice(0,5).join(', ')}`,'Replacements: <font> → CSS; <center> → CSS text-align; <b> → <strong>; <strike>/<s> → <del>.');
  if (B.externalLinksUnsafe)   fail('bp','Best Practices','medium',`${B.externalLinksUnsafe} external link(s) missing rel="noopener noreferrer"`,'Add rel="noopener noreferrer" to all external links to prevent reverse tabnapping.');
  if (!B.doctypePresent)       fail('bp','Best Practices','medium','Missing DOCTYPE declaration','<!DOCTYPE html> must be the first line. Without it, browsers enter "quirks mode".');
  if (B.inlineEventHandlers)   fail('bp','Best Practices','low',`${B.inlineEventHandlers} inline event handler(s) found`,'Migrate onclick/onload etc. to external JS using addEventListener().');
  if (!B.charsetMeta)          fail('bp','Best Practices','low','Missing charset meta tag','Add <meta charset="UTF-8"> as the very first tag inside <head>.');
  if (!B.hasFavicon)           fail('bp','Best Practices','low','No favicon found','Add <link rel="icon" href="/favicon.ico" sizes="32x32"> and an apple-touch-icon for iOS.');

  const seoScore  = Math.max(0, 25 - deduct.seo);
  const perfScore = Math.max(0, 25 - deduct.perf);
  const a11yScore = Math.max(0, 25 - deduct.a11y);
  const bpScore   = Math.max(0, 25 - deduct.bp);
  const total     = seoScore + perfScore + a11yScore + bpScore;
  const quickWins = [...issues].sort((a, b) => b.pts - a.pts).slice(0, 3);

  return {
    total, seoScore, perfScore, a11yScore, bpScore,
    issues, quickWins,
    suggestions: generateSuggestions(data, { seoScore, perfScore, a11yScore, bpScore })
  };
}

// ── Suggestions ───────────────────────────────────────────────────────────────
function generateSuggestions(data, scores) {
  const S = data.seo, P = data.performance,
        A = data.accessibility, B = data.bestPractices,
        OV = data.overview;
  const sugs = [];
  const add  = (pri, cat, title, detail, impact) => sugs.push({ pri, cat, title, detail, impact });

  if (!S.ogTitle || !S.ogImage) add('high','SEO','Implement Full Open Graph Protocol','Add og:title, og:description, og:image (1200×630px), og:url, og:type. Controls how your page appears when shared on social platforms. Complete OG tags increase social CTR by up to 40%.','High');
  if (!S.jsonLD) add('high','SEO','Add JSON-LD Structured Data Markup','Add Schema.org JSON-LD in a <script type="application/ld+json"> tag. Rich Results can increase CTR by 20–30% and earn featured snippets. Validate at search.google.com/rich-results-test.','High');
  if (P.renderBlockingScripts > 0) add('high','Performance','Eliminate All Render-Blocking Scripts',`${P.renderBlockingScripts} script(s) block page render. Add defer to DOM-dependent scripts; async to independent ones. One eliminated blocking script can improve FCP by 300–800ms.`,'High');
  if (P.totalImages >= 3 && (P.lazyImages / P.totalImages) < 0.5) add('high','Performance','Implement Lazy Loading + Modern Image Formats',`Add loading="lazy" to ${P.totalImages - P.lazyImages} non-hero images. Convert to WebP (25–34% smaller) or AVIF (50% smaller). Use <picture> with srcset for responsive images.`,'High');
  if ((OV?.imagesBroken || 0) > 0) add('high','Accessibility','Fix Broken Images',`${OV.imagesBroken} image(s) fail to load. Open the SEO X-Ray → Images tab to see which files are broken. Update the src URLs or remove the broken <img> tags entirely.`,'High');
  if (A.hasForms && A.inputsWithoutLabels > 0) add('high','Accessibility','Fix Form Inputs — Add Proper Labels',`${A.inputsWithoutLabels} input(s) have no programmatic label. Placeholder text does NOT count — it disappears on typing and screen readers do not reliably announce it. Fix: (1) <label for="inputId">, (2) aria-label="Email address", (3) wrap input inside <label>. Placeholder can remain as a hint alongside the label.`,'High');
  if (!B.isHttps) add('high','Security','Migrate to HTTPS Immediately','Use Let\'s Encrypt (free) via Certbot. After installing: update all URLs to HTTPS, add 301 redirects, add HSTS header.','High');
  if (!A.hasSkipNav) add('medium','Accessibility','Add Skip Navigation Link','Add <a href="#main-content" class="skip-link">Skip to main content</a> as the first element in <body>. Required for WCAG 2.4.1 (Level A).','Medium');
  if (B.externalLinksUnsafe > 0) add('medium','Security','Secure All External Links',`${B.externalLinksUnsafe} external link(s) are vulnerable. Add rel="noopener noreferrer" to every external link.`,'Medium');
  if (!S.canonical) add('medium','SEO','Implement Canonical URLs Site-Wide','Add <link rel="canonical" href="https://example.com/exact-url"> to every page. Critical for e-commerce with faceted navigation.','Medium');
  if (!B.hasSemanticHTML) add('medium','Best Practices','Adopt Semantic HTML Elements','Replace generic <div> containers with <article>, <section>, <figure>/<figcaption>, <time>, <address>. Free accessibility and SEO upgrade.','Medium');
  if (P.domSize > 1500) add('medium','Performance','Reduce DOM Complexity',`${P.domSize.toLocaleString()} elements. For long lists: TanStack Virtual. For below-fold: Intersection Observer. Each 1,000 DOM nodes adds ~1.5ms to style recalculation.`,'Medium');
  if (P.inlineStyles > 30) add('low','Performance','Extract Inline Styles to CSS Classes',`${P.inlineStyles} elements use inline styles. Move to CSS classes or Tailwind. CSS files are cached separately.`,'Low');
  if (A.tabindexAbuse > 0) add('low','Accessibility','Remove Positive tabindex Values','Remove all tabindex="1+". Use tabindex="0" for natural order; tabindex="-1" for programmatic focus only.','Low');
  return sugs;
}

// ══════════════════════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════════════════════
function renderResults(scores, data) {
  document.getElementById('chipIssues').textContent = scores.issues.length;
  document.getElementById('chipSugg').textContent   = scores.suggestions.length;
  document.getElementById('footerInfo').textContent =
    `${scores.issues.length} issue${scores.issues.length !== 1 ? 's' : ''} found`;

  // Issues
  const issuesList = document.getElementById('issuesList');
  if (!scores.issues.length) {
    issuesList.innerHTML = emptyState('🎉', 'No issues detected!', 'This page is in great shape.');
  } else {
    const sorted = [...scores.issues].sort((a, b) => ({ high:0, medium:1, low:2 }[a.sev] - { high:0, medium:1, low:2 }[b.sev]));
    issuesList.innerHTML = quickWinsHTML(scores.quickWins) + sorted.map(issueCard).join('');
  }

  // Suggestions
  const suggestionsList = document.getElementById('suggestionsList');
  suggestionsList.innerHTML = !scores.suggestions.length
    ? emptyState('✨', 'No additional suggestions', 'Your site is following web best practices well.')
    : scores.suggestions.map(suggCard).join('');

  renderDetails(data, scores);
  renderOvTech(data.overview);
  renderOverview(data);
  renderWcagOrder(data.wcag?.tabOrder || []);
}

function quickWinsHTML(wins) {
  if (!wins.length) return '';
  return `<div class="quick-wins">
    <div class="qw-header">🔥 Fix These First — Biggest Point Gains</div>
    ${wins.map(w => `<div class="qw-item"><span class="qw-pts">+${w.pts} pts</span><span>${esc(w.title)}</span></div>`).join('')}
  </div>`;
}

function issueCard(issue) {
  const icons    = { high:'🔴', medium:'🟡', low:'🔵' };
  const sevLabel = { high:'High', medium:'Medium', low:'Low' };
  const bdg      = { high:'badge-critical', medium:'badge-warning', low:'badge-info' };
  return `<div class="issue-card">
    <div class="issue-badge ${bdg[issue.sev]}">${icons[issue.sev]}</div>
    <div class="issue-body">
      <div class="issue-title">${esc(issue.title)}</div>
      <div class="issue-detail">${esc(issue.detail)}</div>
      <div class="issue-footer">
        <span class="tag tag-cat">${esc(issue.cat)}</span>
        <span class="issue-sev-pill sev-${issue.sev}">${sevLabel[issue.sev]} −${issue.pts}pts</span>
      </div>
    </div>
  </div>`;
}

function suggCard(s) {
  return `<div class="suggestion-card">
    <div class="sug-bar sug-${s.pri}"></div>
    <div class="sug-body">
      <div class="sug-title">${esc(s.title)}</div>
      <div class="sug-detail">${esc(s.detail)}</div>
      <div class="sug-footer">
        <span class="tag tag-cat">${esc(s.cat)}</span>
        <span class="impact-tag imp-${s.impact}">Impact: ${esc(s.impact)}</span>
      </div>
    </div>
  </div>`;
}

function emptyState(icon, title, sub) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${esc(title)}</div><div class="empty-sub">${esc(sub)}</div></div>`;
}

// ── Overview Tab (formerly Details) ───────────────────────────────────────────
function renderDetails(data, scores) {
  const S = data.seo, P = data.performance,
        A = data.accessibility, B = data.bestPractices,
        OV = data.overview;
  const el = document.getElementById('detailsContent');

  // Section builder — standard rows
  const sec = (icon, label, scoreVal, rows) => `
    <div class="details-section">
      <div class="details-head">
        <span class="details-head-icon">${icon}</span>
        <span class="details-head-label">${label}</span>
        <span class="details-head-score" style="color:${scoreColor(scoreVal,25)}">${scoreVal}/25</span>
      </div>
      ${rows.map(([k,v,c]) =>
        `<div class="detail-row"><span class="detail-key">${esc(k)}</span><span class="detail-val val-${c}">${v}</span></div>`
      ).join('')}
    </div>`;

  // Full-text row — wraps text, no truncation, with copy button
  const fullRow = (icon, label, scoreVal, extraRows) => {
    const titleCls = S.title ? (S.titleLength>=30&&S.titleLength<=60?'pass':'warn') : 'fail';
    const descCls  = S.metaDescription ? (S.metaDescriptionLength>=140&&S.metaDescriptionLength<=160?'pass':'warn') : 'fail';

    const titleHTML = S.title
      ? `<div class="full-text-val val-${titleCls}">
           <span>${esc(S.title)}</span>
           <span class="sv-hint">(${S.titleLength} chars)</span>
           <button class="ov-copy-btn" data-copy="${esc(S.title)}" title="Copy title">${copyIconSVG()}</button>
         </div>`
      : `<div class="full-text-val val-fail" style="font-style:italic;">✗ Missing</div>`;

    const descHTML = S.metaDescription
      ? `<div class="full-text-val val-${descCls}">
           <span>${esc(S.metaDescription)}</span>
           <span class="sv-hint">(${S.metaDescriptionLength} chars)</span>
           <button class="ov-copy-btn" data-copy="${esc(S.metaDescription)}" title="Copy description">${copyIconSVG()}</button>
         </div>`
      : `<div class="full-text-val val-fail" style="font-style:italic;">✗ Missing</div>`;

    const stdRows = extraRows.map(([k,v,c]) =>
      `<div class="detail-row"><span class="detail-key">${esc(k)}</span><span class="detail-val val-${c}">${v}</span></div>`
    ).join('');

    return `
      <div class="details-section">
        <div class="details-head">
          <span class="details-head-icon">${icon}</span>
          <span class="details-head-label">${label}</span>
          <span class="details-head-score" style="color:${scoreColor(scoreVal,25)}">${scoreVal}/25</span>
        </div>
        <div class="detail-row detail-row--full">
          <span class="detail-key">Title</span>
          ${titleHTML}
        </div>
        <div class="detail-row detail-row--full">
          <span class="detail-key">Description</span>
          ${descHTML}
        </div>
        ${stdRows}
      </div>`;
  };

  // Performance helpers
  const ltCls   = P.loadTime<=0?'neu':P.loadTime<2500?'pass':P.loadTime<4000?'warn':'fail';
  const ltLabel = P.loadTime<=0?'N/A':P.loadTime<1500?`${(P.loadTime/1000).toFixed(2)}s — Fast ✓`:P.loadTime<2500?`${(P.loadTime/1000).toFixed(2)}s — OK`:P.loadTime<4000?`${(P.loadTime/1000).toFixed(2)}s — Slow ⚠`:`${(P.loadTime/1000).toFixed(2)}s — Critical ✗`;
  const ttfbCls = P.ttfb<=0?'neu':P.ttfb<800?'pass':P.ttfb<1800?'warn':'fail';
  const ttfbLbl = P.ttfb<=0?'N/A':P.ttfb<800?`${P.ttfb}ms — Good ✓`:P.ttfb<1800?`${P.ttfb}ms — Slow ⚠ (target: <800ms)`:`${P.ttfb}ms — Critical ✗`;
  const domCls  = P.domSize<1500?'pass':P.domSize<3000?'warn':'fail';
  const domLbl  = P.domSize<1500?`${P.domSize.toLocaleString()} — OK ✓`:P.domSize<3000?`${P.domSize.toLocaleString()} — Large ⚠`:`${P.domSize.toLocaleString()} — Excessive ✗`;

  const brokenCount = OV?.imagesBroken || 0;

  el.innerHTML =
    fullRow('🔍','SEO', scores.seoScore, [
      ['H1 / H2 / H3',      `${S.h1Count} / ${S.h2Count} / ${S.h3Count}`,                                   S.h1Count===1?'pass':S.h1Count===0?'fail':'warn'],
      ['Heading Hierarchy',  S.headingHierarchyOk?'✓ Correct':'✗ Broken',                                    S.headingHierarchyOk?'pass':'fail'],
      ['Open Graph',         (S.ogTitle&&S.ogDescription&&S.ogImage)?'✓ Complete':(S.ogTitle||S.ogDescription)?'⚠ Partial':'✗ Missing', (S.ogTitle&&S.ogDescription&&S.ogImage)?'pass':(S.ogTitle||S.ogDescription)?'warn':'fail'],
      ['Canonical Tag',      S.canonical?'✓ Present':'⚠ Missing',                                            S.canonical?'pass':'warn'],
      ['JSON-LD / Schema',   S.jsonLD?'✓ Found':'⚠ Not found',                                               S.jsonLD?'pass':'warn'],
      ['Internal / External',`${S.internalLinks} / ${S.externalLinks}`,                                      'neu'],
      ['Vague Link Text',    `${S.nonDescriptiveLinks} ${S.nonDescriptiveLinks===0?'✓':'⚠'}`,                S.nonDescriptiveLinks===0?'pass':'warn'],
    ]) +
    sec('⚡','Performance (Desktop)', scores.perfScore, [
      ['Page Load Time',     ltLabel,                                                                          ltCls],
      ['TTFB',               ttfbLbl,                                                                          ttfbCls],
      ['DOM Content Loaded', P.domContentLoaded>0?`${(P.domContentLoaded/1000).toFixed(2)}s`:'N/A',          'neu'],
      ['DOM Size',           domLbl,                                                                           domCls],
      ['External Scripts',   `${P.scriptsCount} ${P.scriptsCount<=10?'✓':P.scriptsCount<=20?'⚠ Many':'✗ Too many'}`, P.scriptsCount<=10?'pass':P.scriptsCount<=20?'warn':'fail'],
      ['Render-Blocking',    `${P.renderBlockingScripts} ${P.renderBlockingScripts===0?'✓':'✗'}`,             P.renderBlockingScripts===0?'pass':'fail'],
      ['Lazy Images',        `${P.lazyImages} / ${P.totalImages} ${P.totalImages>0&&P.lazyImages/P.totalImages>=0.7?'✓':'⚠'}`, P.totalImages===0||P.lazyImages/P.totalImages>=0.7?'pass':'warn'],
      ['Large Images >200KB',`${P.largeImagesCount} ${P.largeImagesCount===0?'✓':'⚠'}`,                      P.largeImagesCount===0?'pass':'warn'],
      ['WebP / Next-Gen',    P.hasWebP?'✓ Detected':'⚠ None found',                                          P.hasWebP?'pass':'warn'],
    ]) +
    sec('♿','Accessibility', scores.a11yScore, [
      ['Language (lang="")', A.langAttribute?`✓ "${A.langAttribute}"`:' ✗ Missing',                          A.langAttribute?'pass':'fail'],
      ['Images Without Alt', A.totalImages>0?`${A.imagesWithoutAlt} of ${A.totalImages}`:'N/A',              A.imagesWithoutAlt===0?'pass':'fail'],
      ['Broken Images',      `${brokenCount} ${brokenCount===0?'✓':'✗ Broken'}`,                             brokenCount===0?'pass':'fail'],
      ['Poor Alt Text',      `${A.poorAltCount} ${A.poorAltCount===0?'✓':'⚠'}`,                              A.poorAltCount===0?'pass':'warn'],
      ['Form Inputs',        A.hasForms?`${A.inputsWithoutLabels} unlabeled`:'No forms ✓',                   (!A.hasForms||A.inputsWithoutLabels===0)?'pass':'fail'],
      ['Buttons Without Text',`${A.buttonsWithoutText} ${A.buttonsWithoutText===0?'✓':'✗'}`,                 A.buttonsWithoutText===0?'pass':'fail'],
      ['Skip Navigation',    A.hasSkipNav?'✓ Found':'⚠ Missing',                                              A.hasSkipNav?'pass':'warn'],
      ['ARIA Landmarks',     `${A.ariaLandmarks} ${A.ariaLandmarks>=3?'✓':A.ariaLandmarks>0?'⚠':'✗'}`,     A.ariaLandmarks>=3?'pass':A.ariaLandmarks>0?'warn':'fail'],
      ['Focus Visibility',   (A.focusCssKilled||A.focusKilledInline>0)?'✗ Suppressed':'✓ OK',                (A.focusCssKilled||A.focusKilledInline>0)?'fail':'pass'],
    ]) +
    sec('🛡️','Best Practices', scores.bpScore, [
      ['HTTPS',              B.isHttps?'✓ Secure':'✗ Insecure',                                              B.isHttps?'pass':'fail'],
      ['Mixed Content',      B.mixedContent?'✗ Detected':'✓ Clean',                                          B.mixedContent?'fail':'pass'],
      ['Viewport Meta',      B.hasViewportMeta?'✓ Present':'✗ Missing',                                      B.hasViewportMeta?'pass':'fail'],
      ['DOCTYPE',            B.doctypePresent?'✓ HTML5':'✗ Missing',                                         B.doctypePresent?'pass':'fail'],
      ['Charset Meta',       B.charsetMeta?'✓ UTF-8':'⚠ Missing',                                            B.charsetMeta?'pass':'warn'],
      ['Semantic HTML',      `${B.semanticTagsCount} type(s) ${B.hasSemanticHTML?'✓':'⚠'}`,                 B.hasSemanticHTML?'pass':'warn'],
      ['Deprecated Tags',    B.deprecatedTags.length===0?'✓ None':B.deprecatedTags.slice(0,3).join(', '),   B.deprecatedTags.length===0?'pass':'warn'],
      ['Unsafe Ext. Links',  `${B.externalLinksUnsafe} ${B.externalLinksUnsafe===0?'✓':'⚠'}`,               B.externalLinksUnsafe===0?'pass':'warn'],
      ['Inline Event Handlers',`${B.inlineEventHandlers} ${B.inlineEventHandlers===0?'✓':'⚠'}`,             B.inlineEventHandlers===0?'pass':'warn'],
    ]);

  // Wire copy buttons via delegation
  el.addEventListener('click', e => {
    const btn = e.target.closest('.ov-copy-btn[data-copy]');
    if (btn) copyToClipboard(btn.dataset.copy, btn);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  SEO X-RAY
// ══════════════════════════════════════════════════════════════════════════════
function renderOverview(data) {
  const S = data.seo, OV = data.overview;
  renderOvSummary(S, OV);
  renderOvHeaders(OV);
  renderOvImages(OV);
  renderOvLinks(OV);
  renderOvSchema(OV);
  renderOvKeywords(OV);
}

// ── Page Summary ──────────────────────────────────────────────────────────────
function renderOvSummary(S, OV) {
  const el  = document.getElementById('ovSummaryContent');
  const row = (key, val, cls='') => `<div class="ov-meta-row"><span class="ov-meta-key">${key}</span><span class="ov-meta-val ${cls}">${val}</span></div>`;

  const titleVal = S.title
    ? `${esc(S.title)} <span style="color:var(--t4);font-size:10px;font-weight:400;">(${S.titleLength} chars)</span>
       <button class="ov-copy-btn" data-copy="${esc(S.title)}" title="Copy title" style="vertical-align:middle;margin-left:4px;">${copyIconSVG()}</button>`
    : 'Missing title tag!';
  const descVal  = S.metaDescription
    ? `${esc(S.metaDescription)} <span style="color:var(--t4);font-size:10px;font-weight:400;">(${S.metaDescriptionLength} chars)</span>
       <button class="ov-copy-btn" data-copy="${esc(S.metaDescription)}" title="Copy description" style="vertical-align:middle;margin-left:4px;">${copyIconSVG()}</button>`
    : 'Description is missing!';
  const totalLinks = OV.totalLinks || (S.internalLinks + S.externalLinks + S.emptyLinks);

  const statCell = (label, num, cls='') => `<div class="ov-stat-cell"><span class="ov-stat-label">${label}</span><span class="ov-stat-num ${num===0?'zero':''} ${cls}">${num}</span></div>`;

  el.innerHTML = `
    <div class="ov-meta-table">
      ${row('Title',      titleVal,  S.title?(S.titleLength>=30&&S.titleLength<=60?'good':'warn'):'missing')}
      ${row('Description',descVal,   S.metaDescription?(S.metaDescriptionLength>=140&&S.metaDescriptionLength<=160?'good':'warn'):'missing')}
      ${row('Canonical',  S.canonical?esc(S.canonical):'Canonical URL is not defined.', S.canonical?'good':'missing')}
      ${row('Robots Tag', OV.robots?esc(OV.robots.toUpperCase()):'Not defined (defaults to index, follow)', OV.robots?(OV.robots.toLowerCase().includes('noindex')?'warn':''):'warn')}
      ${row('Language',   OV.lang?esc(OV.lang):'Not defined!', OV.lang?'good':'missing')}
    </div>
    <div class="ov-stats-grid">
      ${statCell('H1', OV.h1Count, OV.h1Count===1?'':'warn')}
      ${statCell('H2', OV.h2Count)}
      ${statCell('H3', OV.h3Count)}
      ${statCell('H4', OV.h4Count)}
      ${statCell('H5', OV.h5Count)}
      ${statCell('H6', OV.h6Count)}
      ${statCell('Images', OV.imagesTotal)}
      ${statCell('Links', totalLinks)}
    </div>`;

  // Wire copy buttons
  el.addEventListener('click', e => {
    const btn = e.target.closest('.ov-copy-btn[data-copy]');
    if (btn) copyToClipboard(btn.dataset.copy, btn);
  });
}

// ── Headers Tree ──────────────────────────────────────────────────────────────
function renderOvHeaders(OV) {
  const el   = document.getElementById('ovHeadersContent');
  const tree = OV.headingsTree || [];
  if (!tree.length) { el.innerHTML = `<div class="ov-empty"><div class="ov-empty-icon">📋</div><div class="ov-empty-text">No headings found</div><div class="ov-empty-sub">This page has no H1–H6 heading elements.</div></div>`; return; }
  const tags = ['ov-h1','ov-h2','ov-h3','ov-h4','ov-h5','ov-h6'];
  const cc = (lbl, num) => `<div class="ov-h-count-cell"><span class="ov-h-count-lbl">${lbl}</span><span class="ov-h-count-num ${num===0?'none':''}">${num}</span></div>`;
  el.innerHTML = `
    <div class="ov-tree-wrap">${tree.map(item => `<div class="ov-tree-item" style="--indent:${item.level-1}"><span class="ov-h-tag ${tags[item.level-1]||'ov-h6'}">H${item.level}</span><span class="ov-tree-text">${esc(item.text)}</span></div>`).join('')}</div>
    <div class="ov-h-counts">${cc('H1',OV.h1Count)}${cc('H2',OV.h2Count)}${cc('H3',OV.h3Count)}${cc('H4',OV.h4Count)}${cc('H5',OV.h5Count)}${cc('H6',OV.h6Count)}</div>`;
}

// ── Copy to clipboard helper ──────────────────────────────────────────────────
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = copyIconSVG();
    }, 1500);
  });
}

function copyIconSVG() {
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
}
function downloadIconSVG() {
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
}

// ── Images (with Broken section + Load More) ──────────────────────────────────

function renderOvImages(OV) {
  const el   = document.getElementById('ovImagesContent');
  const imgs = OV.imagesList || [];
  const fmts = OV.imageFormats || {};

  _imgSections = {
    broken:    imgs.filter(i => i.broken),
    toFix:     imgs.filter(i => !i.broken && !i.complete),
    completed: imgs.filter(i => !i.broken && i.complete)
  };

  const attrVal = (val, present) => {
    if (!present && val === null) return `<span class="ov-img-attr-val miss">/ (missing)</span>`;
    if (!present && val === '')   return `<span class="ov-img-attr-val empty">/ (empty)</span>`;
    return `<span class="ov-img-attr-val ok">${esc((val||'').slice(0,60))}</span>`;
  };

  let _globalIdx = 0;
  _imgCardFn = (img) => {
    _globalIdx++;
    return `
    <div class="ov-img-card ${img.broken?'is-broken':''}" data-fmt="${img.format||'OTHER'}" data-filename="${esc((img.filename||'').toLowerCase())}">
      <div class="ov-item-num">${_globalIdx}</div>
      <div class="ov-img-thumb ${img.broken?'broken-thumb':''}">
        ${img.broken
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
          : img.src ? `<img src="${esc(img.src)}" alt="" class="ov-thumb-img">` : '🖼️'}
      </div>
      <div class="ov-img-info">
        ${img.broken ? '<span class="ov-img-broken-badge">⚠ 404 / Broken</span>' : ''}
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
          ${img.src && !img.broken ? `<button class="ov-copy-btn img-dl-btn" data-src="${esc(img.src)}" data-filename="${esc(img.filename)}" title="Download image">${downloadIconSVG()}</button>` : ''}
          <button class="ov-copy-btn" data-copy="${esc(img.src)}" title="Copy URL">${copyIconSVG()}</button>
          <span class="ov-img-filename" title="${esc(img.src)}">${esc(img.filename)}</span>
          ${img.format && img.format !== 'OTHER' ? `<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;background:var(--border2);color:var(--t3);">${img.format}</span>` : ''}
        </div>
        <div class="ov-img-attrs">
          <span class="ov-img-attr"><span class="ov-img-attr-key">ALT:</span>${attrVal(img.alt, img.hasAlt)}</span>
          <span class="ov-img-attr"><span class="ov-img-attr-key">Title:</span>${attrVal(img.title||null, img.hasTitle)}</span>
        </div>
      </div>
    </div>`;
  };

  // Format pills
  const fmtOrder = ['WEBP','SVG','AVIF','PNG','JPG','GIF','OTHER'];
  const fmtPills = fmtOrder
    .filter(f => fmts[f] > 0)
    .map(f => `<span class="ov-fmt-pill" data-fmt="${f}"><span class="fmt-count">${fmts[f]}</span> ${f}</span>`)
    .join('');

  // Section builder with Load More
  const sectionHTML = (key, labelHTML, labelClass, list) => {
    if (!list.length) return '';
    const initial = list.slice(0, IMG_PAGE);
    const hasMore = list.length > IMG_PAGE;
    return `
      <div class="ov-img-section ${labelClass}">${labelHTML} (${list.length})</div>
      <div class="ov-img-list" id="imgList-${key}">${initial.map(_imgCardFn).join('')}</div>
      ${hasMore ? `<button class="ov-load-more-btn" data-list="img" data-section="${key}" data-offset="${IMG_PAGE}">Load More — ${list.length - IMG_PAGE} remaining</button>` : ''}`;
  };

  el.innerHTML = `
    <!-- Stats -->
    <div class="ov-img-stats">
      <div class="ov-img-stat"><span class="ov-img-stat-label">Images</span><span class="ov-img-stat-num neutral">${OV.imagesTotal}</span></div>
      <div class="ov-img-stat"><span class="ov-img-stat-label">Broken</span><span class="ov-img-stat-num ${OV.imagesBroken>0?'broken':'ok'}">${OV.imagesBroken}</span></div>
      <div class="ov-img-stat"><span class="ov-img-stat-label">Without ALT</span><span class="ov-img-stat-num ${OV.imagesWithoutAlt>0?'problem':'ok'}">${OV.imagesWithoutAlt}</span></div>
      <div class="ov-img-stat"><span class="ov-img-stat-label">Without Title</span><span class="ov-img-stat-num ${OV.imagesWithoutTitle>0?'problem':'ok'}">${OV.imagesWithoutTitle}</span></div>
    </div>
    <!-- Format pills -->
    ${fmtPills ? `<div class="ov-fmt-bar"><span style="font-size:10px;font-weight:700;color:var(--t4);margin-right:2px;">Formats:</span>${fmtPills}</div>` : ''}
    <!-- Toolbar: search + download ZIP + copy all -->
    <div class="ov-toolbar">
      <input class="ov-search" id="imgSearch" placeholder="Search by filename…" type="text">
      <button class="ov-export-btn green" id="btnDownloadImgs" title="Download all images as ZIP">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download All
      </button>
      <button class="ov-export-btn" id="btnCopyAllImgUrls" title="Copy all image URLs to clipboard" style="background:var(--card);color:var(--t2);border:1.5px solid var(--border);">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy URLs
      </button>
      <label class="img-dl-front-label" title="Hover over any image on the page to see a download popup">
        <input type="checkbox" id="chkDownloadFront">
        <span class="img-dl-front-toggle"></span>
        Download on Front
      </label>
    </div>
    <!-- Lists -->
    <div id="imgAllSections">
      ${sectionHTML('broken',    '⚠ Broken Images',      'broken-section', _imgSections.broken)}
      ${sectionHTML('toFix',     '⚠ Images to Complete', '',               _imgSections.toFix)}
      ${sectionHTML('completed', '✓ Completed',           '',               _imgSections.completed)}
      ${!imgs.length ? `<div class="ov-empty"><div class="ov-empty-icon">🖼️</div><div class="ov-empty-text">No images found</div></div>` : ''}
    </div>`;

  // Wire Load More
  el.querySelectorAll('.ov-load-more-btn[data-list="img"]').forEach(btn => {
    btn.addEventListener('click', () => loadMoreImages(btn));
  });

  // Copy buttons
  el.addEventListener('click', e => {
    const btn = e.target.closest('.ov-copy-btn[data-copy]');
    if (btn) copyToClipboard(btn.dataset.copy, btn);
  });

  // Handle broken thumbnails via error event delegation (no inline onerror)
  el.addEventListener('error', e => {
    if (e.target.classList.contains('ov-thumb-img')) {
      e.target.style.display = 'none';
      e.target.parentNode.textContent = '🖼️';
    }
  }, true); // capture phase so it fires before default

  // Format filter — single-select, all images (loads all into DOM on filter)
  let _activeFmt = null;
  el.querySelectorAll('.ov-fmt-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const fmt = pill.dataset.fmt;
      if (_activeFmt === fmt) {
        _activeFmt = null;
        pill.classList.remove('active');
      } else {
        el.querySelectorAll('.ov-fmt-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        _activeFmt = fmt;
      }
      applyImgFilters(el, imgs);
    });
  });

  // Search — applies to ALL images including unloaded ones
  el.querySelector('#imgSearch').addEventListener('input', e => {
    applyImgFilters(el, imgs);
  });

  // Download All as ZIP
  el.querySelector('#btnDownloadImgs').addEventListener('click', async () => {
    const urls = imgs.map(i => i.src).filter(Boolean);
    if (!urls.length) return;

    const btn = el.querySelector('#btnDownloadImgs');
    const origHTML = btn.innerHTML;
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Zipping…`;
    btn.disabled = true;

    try {
      await downloadImagesAsZip(urls, `images-${location.hostname||'page'}`);
    } catch (e) {
      // Fallback: download as text list if fetch fails
      downloadBlob(urls.join('\n'), 'text/plain', `images-${location.hostname||'page'}.txt`);
    }

    btn.innerHTML = origHTML;
    btn.disabled  = false;
  });

  // Copy All image URLs
  el.querySelector('#btnCopyAllImgUrls').addEventListener('click', (e) => {
    const btn  = e.currentTarget;
    const urls = imgs.map(i => i.src).filter(Boolean).join('\n');
    navigator.clipboard.writeText(urls).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      btn.style.color = 'var(--green)';
      btn.style.borderColor = 'var(--green)';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 1500);
    });
  });

  // Download on Front toggle — sends message to content script
  el.querySelector('#chkDownloadFront').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.tabs.sendMessage(tab.id, { action: 'toggleImageDownloader', enabled });
    } catch (_) {}
  });

  // Restore checkbox state — query content script to see if downloader is still active
  (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const resp = await chrome.tabs.sendMessage(tab.id, { action: 'getImageDownloaderState' });
      const chk  = el.querySelector('#chkDownloadFront');
      if (chk && resp?.active) chk.checked = true;
    } catch (_) {}
  })();

  // Per-image download buttons (delegated)
  el.addEventListener('click', async (e) => {
    const dlBtn = e.target.closest('.img-dl-btn');
    if (!dlBtn) return;
    const src      = dlBtn.dataset.src;
    const filename = dlBtn.dataset.filename || src.split('/').pop() || 'image';
    if (!src) return;

    const origHTML = dlBtn.innerHTML;
    dlBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    dlBtn.disabled = true;

    try {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error('fetch failed');
      const data = new Uint8Array(await resp.arrayBuffer());

      // Ensure correct extension
      const KNOWN_EXTS = /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|tiff|ico)$/i;
      let fname = filename;
      if (!KNOWN_EXTS.test(fname)) {
        const MIME_EXT = {'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/svg+xml':'.svg','image/avif':'.avif','image/bmp':'.bmp','image/x-icon':'.ico'};
        const mime  = (resp.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
        const ext   = MIME_EXT[mime] || detectExtFromBytes(data) || '.jpg';
        const dot   = fname.lastIndexOf('.');
        const base  = dot > 0 && dot > fname.length - 8 ? fname.slice(0, dot) : fname;
        fname = base + ext;
      }

      const blob = new Blob([data]);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
      dlBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => { dlBtn.innerHTML = origHTML; dlBtn.disabled = false; }, 1500);
    } catch (_) {
      // Fallback: open in new tab
      window.open(src, '_blank', 'noopener');
      dlBtn.innerHTML = origHTML;
      dlBtn.disabled = false;
    }
  });
}

// Apply format filter + search across ALL images, re-rendering if needed
function applyImgFilters(el, allImgs) {
  const q      = (el.querySelector('#imgSearch')?.value || '').toLowerCase().trim();
  const fmt    = el.querySelector('.ov-fmt-pill.active')?.dataset.fmt || null;

  const matches = allImgs.filter(img => {
    const fmtOk  = !fmt || (img.format || 'OTHER') === fmt;
    const textOk = !q   || (img.filename || '').toLowerCase().includes(q) ||
                           (img.src || '').toLowerCase().includes(q);
    return fmtOk && textOk;
  });

  const isFiltering = q || fmt;

  if (isFiltering) {
    // Show flat filtered list replacing all sections
    const container = el.querySelector('#imgAllSections');
    if (!container) return;

    // Reset counters for numbering
    let idx = 0;
    const attrVal = (val, present) => {
      if (!present && val === null) return `<span class="ov-img-attr-val miss">/ (missing)</span>`;
      if (!present && val === '')   return `<span class="ov-img-attr-val empty">/ (empty)</span>`;
      return `<span class="ov-img-attr-val ok">${esc((val||'').slice(0,60))}</span>`;
    };
    const cards = matches.map(img => {
      idx++;
      return `
      <div class="ov-img-card ${img.broken?'is-broken':''}" data-fmt="${img.format||'OTHER'}" data-filename="${esc((img.filename||'').toLowerCase())}">
        <div class="ov-item-num">${idx}</div>
        <div class="ov-img-thumb ${img.broken?'broken-thumb':''}">
          ${img.broken
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
            : img.src ? `<img src="${esc(img.src)}" alt="" class="ov-thumb-img">` : '🖼️'}
        </div>
        <div class="ov-img-info">
          ${img.broken ? '<span class="ov-img-broken-badge">⚠ 404 / Broken</span>' : ''}
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
            <button class="ov-copy-btn" data-copy="${esc(img.src)}" title="Copy URL">${copyIconSVG()}</button>
            <span class="ov-img-filename" title="${esc(img.src)}">${esc(img.filename)}</span>
            ${img.format && img.format !== 'OTHER' ? `<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;background:var(--border2);color:var(--t3);">${img.format}</span>` : ''}
          </div>
          <div class="ov-img-attrs">
            <span class="ov-img-attr"><span class="ov-img-attr-key">ALT:</span>${attrVal(img.alt, img.hasAlt)}</span>
            <span class="ov-img-attr"><span class="ov-img-attr-key">Title:</span>${attrVal(img.title||null, img.hasTitle)}</span>
          </div>
        </div>
      </div>`;
    });

    container.innerHTML = matches.length
      ? `<div class="ov-img-section" style="background:var(--blue-lt);color:var(--blue);">🔍 ${matches.length} result${matches.length!==1?'s':''} found</div>${cards.join('')}`
      : `<div class="ov-empty"><div class="ov-empty-icon">🔍</div><div class="ov-empty-text">No images match</div></div>`;

  } else {
    // Restore original paginated sections — re-render
    renderOvImages_restore(el, allImgs);
  }
}

function renderOvImages_restore(el, imgs) {
  const container = el.querySelector('#imgAllSections');
  if (!container) return;

  // Reset global index
  let idx = 0;
  const mkCard = _imgCardFn;  // reuse existing card fn (already has closure on attrVal)

  const sectionHTML = (key, labelHTML, labelClass, list) => {
    if (!list.length) return '';
    // Slice for pagination
    const initial = list.slice(0, IMG_PAGE);
    const hasMore = list.length > IMG_PAGE;
    return `
      <div class="ov-img-section ${labelClass}">${labelHTML} (${list.length})</div>
      <div class="ov-img-list" id="imgList-${key}">${initial.map(_imgCardFn).join('')}</div>
      ${hasMore ? `<button class="ov-load-more-btn" data-list="img" data-section="${key}" data-offset="${IMG_PAGE}">Load More — ${list.length - IMG_PAGE} remaining</button>` : ''}`;
  };

  // Reset section counters
  _imgSections = {
    broken:    imgs.filter(i => i.broken),
    toFix:     imgs.filter(i => !i.broken && !i.complete),
    completed: imgs.filter(i => !i.broken && i.complete)
  };

  // Re-number from 1
  let n = 0;
  const renum = (html) => html; // numbering is set during _imgCardFn calls

  container.innerHTML =
    sectionHTML('broken',    '⚠ Broken Images',      'broken-section', _imgSections.broken) +
    sectionHTML('toFix',     '⚠ Images to Complete', '',               _imgSections.toFix) +
    sectionHTML('completed', '✓ Completed',           '',               _imgSections.completed) +
    (!imgs.length ? `<div class="ov-empty"><div class="ov-empty-icon">🖼️</div><div class="ov-empty-text">No images found</div></div>` : '');

  container.querySelectorAll('.ov-load-more-btn[data-list="img"]').forEach(btn => {
    btn.addEventListener('click', () => loadMoreImages(btn));
  });
}

function loadMoreImages(btn) {
  const section = btn.dataset.section;
  const offset  = parseInt(btn.dataset.offset);
  const list    = _imgSections[section] || [];
  const next    = list.slice(offset, offset + IMG_PAGE);
  const remaining = list.length - offset - IMG_PAGE;
  const container = document.getElementById(`imgList-${section}`);
  container.insertAdjacentHTML('beforeend', next.map(_imgCardFn).join(''));
  if (remaining > 0) { btn.dataset.offset = offset + IMG_PAGE; btn.textContent = `Load More — ${remaining} remaining`; }
  else { btn.remove(); }
}

// ── Links (with Load More, Search, Export) ───────────────────────────────────

function renderOvLinks(OV) {
  const el    = document.getElementById('ovLinksContent');
  _linksAll   = [...(OV.linksList || [])].sort((a, b) => {
    const o = l => l.isAnchor?0:l.isInternal?1:2;
    return o(a) - o(b) || b.count - a.count;
  });

  const badge = l => l.isAnchor
    ? `<span class="ov-link-badge badge-anchor">Anchor</span>`
    : l.isInternal
      ? `<span class="ov-link-badge badge-internal">Internal</span>`
      : `<span class="ov-link-badge badge-external">External</span>`;

  let _linkIdx = 0;
  _linkItemFn = l => {
    _linkIdx++;
    return `<div class="ov-link-item" data-href="${esc((l.href||'').toLowerCase())}">
    <div class="ov-link-row1">
      <span class="ov-item-num">${_linkIdx}</span>
      <button class="ov-copy-btn" data-copy="${esc(l.href)}" title="Copy URL">${copyIconSVG()}</button>
      ${badge(l)}<span class="ov-link-href" title="${esc(l.href)}">${esc(l.href.length>50?l.href.slice(0,47)+'…':l.href)}</span>
    </div>
    <div class="ov-link-title">Title: ${l.title?`<span class="ov-link-title-val">${esc(l.title)}</span>`:`<span class="ov-link-title-miss">not defined</span>`}</div>
    ${l.count>1?`<div class="ov-link-occ">↩ Found ${l.count-1} more occurrence${l.count>2?'s':''}</div>`:''}
  </div>`;
  };

  const initial   = _linksAll.slice(0, LINK_PAGE);
  const remaining = _linksAll.length - LINK_PAGE;

  el.innerHTML = `
    <div class="ov-link-stats">
      <div class="ov-link-stat"><span class="ov-link-stat-label">Links</span><span class="ov-link-stat-num blue">${OV.totalLinks||0}</span></div>
      <div class="ov-link-stat"><span class="ov-link-stat-label">Unique</span><span class="ov-link-stat-num blue">${OV.uniqueLinks||0}</span></div>
      <div class="ov-link-stat"><span class="ov-link-stat-label">Internal Unique</span><span class="ov-link-stat-num blue">${OV.internalUniqueLinks||0}</span></div>
      <div class="ov-link-stat"><span class="ov-link-stat-label">Without Title</span><span class="ov-link-stat-num ${OV.linksWithoutTitle>0?'warn':'blue'}">${OV.linksWithoutTitle||0}</span></div>
    </div>
    <!-- Toolbar: search + export -->
    <div class="ov-toolbar">
      <input class="ov-search" id="linkSearch" placeholder="Search links…" type="text">
      <button class="ov-export-btn" id="btnExportLinks">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>
    </div>
    <div class="ov-links-label">Links &lt;a/&gt;</div>
    <div id="linkListContainer">${initial.map(_linkItemFn).join('')}</div>
    ${remaining > 0 ? `<button class="ov-load-more-btn" data-list="links" data-offset="${LINK_PAGE}">Load More — ${remaining} remaining</button>` : ''}
    ${!_linksAll.length ? `<div class="ov-empty"><div class="ov-empty-icon">🔗</div><div class="ov-empty-text">No links found</div></div>` : ''}`;

  // Wire Load More
  const lmBtn = el.querySelector('.ov-load-more-btn[data-list="links"]');
  if (lmBtn) lmBtn.addEventListener('click', () => loadMoreLinks(lmBtn));

  // Copy
  el.addEventListener('click', e => {
    const btn = e.target.closest('.ov-copy-btn[data-copy]');
    if (btn) copyToClipboard(btn.dataset.copy, btn);
  });

  // Search
  el.querySelector('#linkSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    el.querySelectorAll('.ov-link-item').forEach(item => {
      item.style.display = item.dataset.href.includes(q) ? '' : 'none';
    });
  });

  // Export as CSV
  el.querySelector('#btnExportLinks').addEventListener('click', () => {
    const rows  = [['#','URL','Type','Title','Occurrences']];
    _linksAll.forEach((l, i) => {
      const type = l.isAnchor ? 'Anchor' : l.isInternal ? 'Internal' : 'External';
      rows.push([i+1, l.href, type, l.title || '', l.count]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadBlob(csv, 'text/csv', `links-${location.hostname || 'page'}.csv`);
  });
}

function loadMoreLinks(btn) {
  const container = document.getElementById('linkListContainer');
  if (!container) return;
  const offset    = parseInt(btn.dataset.offset);
  const next      = _linksAll.slice(offset, offset + LINK_PAGE);
  const remaining = _linksAll.length - offset - LINK_PAGE;
  container.insertAdjacentHTML('beforeend', next.map(_linkItemFn).join(''));
  if (remaining > 0) { btn.dataset.offset = offset + LINK_PAGE; btn.textContent = `Load More — ${remaining} remaining`; }
  else { btn.remove(); }
}

// ── Schema ────────────────────────────────────────────────────────────────────
function renderOvSchema(OV) {
  const el      = document.getElementById('ovSchemaContent');
  const schemas = OV.schemas || [];

  if (!schemas.length) {
    el.innerHTML = `
      <div class="ov-schema-stats">
        <div class="ov-schema-stat"><span class="ov-schema-stat-label">Schemas Found</span><span class="ov-schema-stat-num none">0</span></div>
        <div class="ov-schema-stat"><span class="ov-schema-stat-label">Valid</span><span class="ov-schema-stat-num none">—</span></div>
      </div>
      <div class="ov-empty" style="padding:32px 24px;">
        <div class="ov-empty-icon">🗂️</div>
        <div class="ov-empty-text">No JSON-LD schema found</div>
        <div class="ov-empty-sub">Add structured data to unlock Google Rich Results —<br>star ratings, FAQs, breadcrumbs &amp; more.</div>
      </div>`;
    return;
  }

  const validCount = schemas.filter(s => s.parsed && !s.error).length;
  const allTypes   = schemas.map(s => s.type).filter(Boolean).join(', ');

  function highlight(json) {
    return json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
        if (/^"/.test(match)) return /:$/.test(match) ? `<span class="json-key">${match}</span>` : `<span class="json-str">${match}</span>`;
        if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
        if (/null/.test(match))       return `<span class="json-null">${match}</span>`;
        return `<span class="json-num">${match}</span>`;
      });
  }

  // Populate schema pretty-print store (avoids large data-* attributes)
  _schemaPretty.clear();
  schemas.forEach((schema, i) => {
    if (schema.parsed && !schema.error) {
      _schemaPretty.set(i, JSON.stringify(schema.parsed, null, 2));
    }
  });

  const chevronSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const blocksHTML = schemas.map((schema, i) => {
    const hasError = !!schema.error;
    const pretty   = _schemaPretty.get(i) || null;
    return `<div class="ov-schema-block collapsed">
      <div class="ov-schema-block-head">
        <div class="ov-schema-block-left">
          <span class="ov-schema-idx">#${i+1}</span>
          <span class="ov-schema-type">${esc(hasError?'Parse Error':schema.type)}</span>
          <span class="ov-schema-type-tag ${hasError?'error':''}">${hasError?'⚠ Invalid JSON':'JSON-LD'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${!hasError ? `
          <button class="ov-copy-btn" data-schema-copy="${i}" title="Copy JSON" style="width:26px;height:26px;">
            ${copyIconSVG()}
          </button>
          <button class="ov-schema-export-btn" data-schema-idx="${i}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>` : ''}
          <span class="ov-schema-chevron">${chevronSVG}</span>
        </div>
      </div>
      ${hasError
        ? `<div class="ov-schema-error">⚠ Parse Error: ${esc(schema.error)}<br><br><code>${esc(schema.raw.slice(0,200))}${schema.raw.length>200?'…':''}</code></div>`
        : `<div class="ov-schema-code">${highlight(pretty)}</div>`}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="ov-schema-stats">
      <div class="ov-schema-stat"><span class="ov-schema-stat-label">Schemas Found</span><span class="ov-schema-stat-num found">${schemas.length}</span></div>
      <div class="ov-schema-stat"><span class="ov-schema-stat-label">Valid</span><span class="ov-schema-stat-num ${validCount===schemas.length?'found':'none'}">${validCount} / ${schemas.length}</span></div>
      <div class="ov-schema-stat"><span class="ov-schema-stat-label">Types</span><span class="ov-schema-stat-num found" style="font-size:10px;padding-top:3px">${esc(allTypes.slice(0,30))}${allTypes.length>30?'…':''}</span></div>
    </div>
    ${blocksHTML}
    ${validCount>1?`<div class="ov-export-all-wrap"><button class="ov-export-all-btn" id="exportAllSchemas">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>Export All Schemas</button></div>`:'' }`;

  el.querySelectorAll('[data-schema-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = schemas[parseInt(btn.dataset.schemaIdx)];
      if (!s?.parsed) return;
      downloadJSON(s.parsed, `schema-${s.type.replace(/[^a-z0-9]/gi,'-').toLowerCase()||'data'}-${s.index+1}.json`);
    });
  });

  // Schema copy buttons — read from _schemaPretty Map (no large data-attrs)
  el.querySelectorAll('[data-schema-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pretty = _schemaPretty.get(parseInt(btn.dataset.schemaCopy));
      if (pretty) copyToClipboard(pretty, btn);
    });
  });

  // Export all
  const expAll = el.querySelector('#exportAllSchemas');
  if (expAll) expAll.addEventListener('click', () => {
    const valid = schemas.map(s=>s.parsed).filter(Boolean);
    downloadJSON(valid.length===1?valid[0]:valid, 'schema-all.json');
  });

  // Accordion toggle
  el.querySelectorAll('.ov-schema-block-head').forEach(head => {
    head.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      head.closest('.ov-schema-block').classList.toggle('collapsed');
    });
  });
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Tech Stack (shown in Overview tab, below audit scores) ───────────────────
function renderOvTech(OV) {
  const el   = document.getElementById('techContent');
  if (!el) return;
  const tech = OV.tech || [];

  // Group items
  const groups = {};
  tech.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  const groupIcons = {
    'Tag Manager':          '🏷',
    'Analytics':            '📊',
    'Advertising & Pixels': '📣',
    'CMS / Platform':       '🔧',
    'Framework':            '⚛️',
  };

  const detectedCount = tech.filter(t => t.value).length;
  const totalCount    = tech.length;

  const HIDE_UNDETECTED = new Set(['CMS / Platform', 'Framework']);

  const groupsHTML = Object.entries(groups).map(([groupName, items]) => {
    const detected = items.filter(i => i.value);
    const icon = groupIcons[groupName] || '🔩';

    // For CMS/Platform and Framework: hide entire group if nothing detected
    if (HIDE_UNDETECTED.has(groupName) && !detected.length) return '';

    const rows = items.map(item => {
      // For CMS/Platform and Framework: skip undetected items entirely
      if (HIDE_UNDETECTED.has(groupName) && !item.value) return '';

      if (!item.value) {
        return `<div class="tech-row tech-row--off">
          <span class="tech-name">${esc(item.name)}</span>
          <span class="tech-val tech-val--none">–</span>
        </div>`;
      }
      const displayVal = item.value === 'Detected' ? item.name : item.value;
      return `<div class="tech-row tech-row--on">
        <span class="tech-name">${esc(item.name)}</span>
        <span class="tech-val tech-val--found">
          <span class="tech-id">${esc(displayVal)}</span>
          <button class="ov-copy-btn" data-copy="${esc(displayVal)}" title="Copy">${copyIconSVG()}</button>
        </span>
      </div>`;
    }).join('');

    return `
      <div class="tech-group">
        <div class="tech-group-head">
          <span>${icon} ${esc(groupName)}</span>
          ${detected.length ? `<span class="tech-group-badge">${detected.length} detected</span>` : ''}
        </div>
        ${rows}
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="tech-summary">
      <span><strong>${detectedCount}</strong> tools detected</span>
      <span style="color:var(--t4);">·</span>
      <span style="color:var(--t4);">${totalCount - detectedCount} not found</span>
    </div>
    ${groupsHTML}`;

  // Wire copy buttons
  el.addEventListener('click', e => {
    const btn = e.target.closest('.ov-copy-btn[data-copy]');
    if (btn) copyToClipboard(btn.dataset.copy, btn);
  });
}


// ── ZIP builder (pure JS, no library) ────────────────────────────────────────
async function downloadImagesAsZip(urls, zipName) {
  const MAX = 4;
  const entries = [];

  // MIME type → file extension map
  const MIME_EXT = {
    'image/jpeg':      '.jpg',
    'image/jpg':       '.jpg',
    'image/png':       '.png',
    'image/webp':      '.webp',
    'image/gif':       '.gif',
    'image/svg+xml':   '.svg',
    'image/avif':      '.avif',
    'image/bmp':       '.bmp',
    'image/tiff':      '.tiff',
    'image/ico':       '.ico',
    'image/x-icon':    '.ico',
  };

  for (let i = 0; i < urls.length; i += MAX) {
    const results = await Promise.all(urls.slice(i, i + MAX).map(async (url, batchIdx) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = new Uint8Array(await resp.arrayBuffer());

        // 1. Try filename from URL path (strip query string)
        let name = url.split('?')[0].split('/').filter(Boolean).pop() || 'image';
        name = name.slice(-80); // limit length

        // 2. Detect extension — use Content-Type if filename has no image extension
        const KNOWN_EXTS = /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|tiff|ico)$/i;
        if (!KNOWN_EXTS.test(name)) {
          const mime   = (resp.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
          const ext    = MIME_EXT[mime] || detectExtFromBytes(data) || '.jpg';
          // Strip any existing non-image extension and add correct one
          const dotPos = name.lastIndexOf('.');
          const base   = dotPos > 0 && dotPos > name.length - 8 ? name.slice(0, dotPos) : name;
          name = base + ext;
        }

        return { name, data };
      } catch (_) { return null; }
    }));
    results.forEach(r => { if (r) entries.push(r); });
  }

  if (!entries.length) throw new Error('No images fetched');

  // Deduplicate filenames
  const seen = {};
  entries.forEach(e => {
    const key = e.name;
    if (seen[key] !== undefined) {
      const dot  = e.name.lastIndexOf('.');
      const base = dot > 0 ? e.name.slice(0, dot) : e.name;
      const ext  = dot > 0 ? e.name.slice(dot)    : '';
      e.name = base + '_' + (++seen[key]) + ext;
    } else { seen[key] = 0; }
  });

  const zip  = buildZip(entries);
  const blob = new Blob([zip], { type: 'application/zip' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = zipName + '.zip'; a.click();
  URL.revokeObjectURL(url);
}

// Detect image format from magic bytes (file signature)
function detectExtFromBytes(bytes) {
  if (!bytes || bytes.length < 4) return null;
  const h = bytes;
  // JPEG: FF D8 FF
  if (h[0]===0xFF && h[1]===0xD8 && h[2]===0xFF) return '.jpg';
  // PNG: 89 50 4E 47
  if (h[0]===0x89 && h[1]===0x50 && h[2]===0x4E && h[3]===0x47) return '.png';
  // GIF: 47 49 46 38
  if (h[0]===0x47 && h[1]===0x49 && h[2]===0x46 && h[3]===0x38) return '.gif';
  // WEBP: 52 49 46 46 ... 57 45 42 50
  if (h[0]===0x52 && h[1]===0x49 && h[2]===0x46 && h[3]===0x46 && bytes.length>11 && h[8]===0x57 && h[9]===0x45 && h[10]===0x42 && h[11]===0x50) return '.webp';
  // AVIF / HEIF (ftyp box): bytes 4-7 = 'ftyp'
  if (bytes.length>11 && h[4]===0x66 && h[5]===0x74 && h[6]===0x79 && h[7]===0x70) return '.avif';
  // SVG: starts with '<' or UTF-8 BOM then '<'
  if (h[0]===0x3C || (h[0]===0xEF && h[1]===0xBB && h[2]===0xBF && h[3]===0x3C)) return '.svg';
  // BMP: 42 4D
  if (h[0]===0x42 && h[1]===0x4D) return '.bmp';
  // ICO: 00 00 01 00
  if (h[0]===0x00 && h[1]===0x00 && h[2]===0x01 && h[3]===0x00) return '.ico';
  return null;
}

function buildZip(entries) {
  const T = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); T[i] = c; }
  const crc32 = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = T[(c ^ d[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const u16 = n => [n & 0xFF, (n >> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF];

  const parts = []; const central = []; let off = 0;
  for (const { name, data } of entries) {
    const nb = new TextEncoder().encode(name);
    const cr = crc32(data);
    const lh = new Uint8Array([0x50,0x4B,0x03,0x04,0x14,0,0,0,0,0,0,0,0,0,...u32(cr),...u32(data.length),...u32(data.length),...u16(nb.length),0,0,...nb]);
    const ce = new Uint8Array([0x50,0x4B,0x01,0x02,0x14,0,0x14,0,0,0,0,0,0,0,0,0,...u32(cr),...u32(data.length),...u32(data.length),...u16(nb.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(off),...nb]);
    parts.push(lh, data); central.push(ce);
    off += lh.length + data.length;
  }
  const cd  = central.reduce((a,b) => { const c = new Uint8Array(a.length+b.length); c.set(a); c.set(b,a.length); return c; }, new Uint8Array(0));
  const eocd = new Uint8Array([0x50,0x4B,0x05,0x06,0,0,0,0,...u16(entries.length),...u16(entries.length),...u32(cd.length),...u32(off),0,0]);
  parts.push(cd, eocd);
  const tot = parts.reduce((s,p) => s+p.length,0);
  const out = new Uint8Array(tot); let pos = 0;
  for (const p of parts) { out.set(p,pos); pos += p.length; }
  return out;
}

// ── Download helper ───────────────────────────────────────────────────────────
function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Keywords Tab ──────────────────────────────────────────────────────────────
let _kwData      = [];   // active dataset (1/2/3-word based on active tab)
let _kwFiltered  = [];   // after search filter
let _kwSortCol   = '#';
let _kwSortAsc   = false;
let _kwAllData   = {};   // { uni, bi, tri } — all datasets from OV

// Over-optimisation density thresholds
const KW_WARN = { uni: 3.0, bi: 2.0, tri: 1.5 };

function renderOvKeywords(OV) {
  const el = document.getElementById('ovKeywordsContent');
  _kwAllData = {
    uni: OV.keywords  || [],
    bi:  OV.bigrams   || [],
    tri: OV.trigrams  || [],
  };
  const totalWords = OV.totalWordCount || 0;

  if (!_kwAllData.uni.length && !_kwAllData.bi.length && !_kwAllData.tri.length) {
    el.innerHTML = `<div class="ov-empty" style="padding:32px;">
      <div class="ov-empty-icon">🔤</div>
      <div class="ov-empty-text">No keywords extracted</div>
      <div class="ov-empty-sub">Page has insufficient visible text (min. 2 occurrences).</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <!-- Stats bar -->
    <div class="kw-stats">
      <span class="kw-stat"><strong>${totalWords.toLocaleString()}</strong> total words</span>
      <span class="kw-stat"><strong>${_kwAllData.uni.length}</strong> 1-word</span>
      <span class="kw-stat"><strong>${_kwAllData.bi.length}</strong> 2-word</span>
      <span class="kw-stat"><strong>${_kwAllData.tri.length}</strong> 3-word</span>
    </div>
    <!-- N-gram tab switcher -->
    <div class="kw-ngram-tabs">
      <button class="kw-ngram-btn active" data-ng="uni">1-Word</button>
      <button class="kw-ngram-btn" data-ng="bi">2-Word</button>
      <button class="kw-ngram-btn" data-ng="tri">3-Word</button>
    </div>
    <!-- Search + Download toolbar -->
    <div class="kw-toolbar">
      <input class="ov-search" id="kwSearch" placeholder="Search keywords…" type="text">
      <div class="kw-dl-wrap" id="kwDlWrap">
        <button class="kw-dl-btn" id="kwDlBtn">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download ▾
        </button>
      </div>
    </div>
    <!-- Table -->
    <div class="kw-table-wrap">
      <table class="kw-table" id="kwTable">
        <thead>
          <tr>
            <th data-col="#">#</th>
            <th data-col="word" id="kwColPhrase">Keyword</th>
            <th data-col="count">Count</th>
            <th data-col="density">Density</th>
            <th data-col="bold" id="kwColBold">Bold</th>
            <th data-col="italic" id="kwColItalic">Italic</th>
            <th data-col="prominence">Prominence</th>
          </tr>
        </thead>
        <tbody id="kwTbody"></tbody>
      </table>
    </div>`;

  // Load initial unigram data
  _kwData     = [..._kwAllData.uni];
  _kwFiltered = [..._kwData];
  _kwSortCol  = '#';
  _kwSortAsc  = false;
  let _activeNg = 'uni';
  renderKwTable(el, 'uni');
  updateKwSortHeaders(el);

  // N-gram tab switching
  el.querySelectorAll('.kw-ngram-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.kw-ngram-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _activeNg = btn.dataset.ng;
      _kwData     = [..._kwAllData[_activeNg]];
      _kwFiltered = [..._kwData];
      _kwSortCol  = '#';
      _kwSortAsc  = false;

      // Update column labels for phrase tabs (hide Bold/Italic for bi/tri)
      const boldCol   = el.querySelector('#kwColBold');
      const italicCol = el.querySelector('#kwColItalic');
      const phraseCol = el.querySelector('#kwColPhrase');
      if (phraseCol) phraseCol.textContent = _activeNg === 'uni' ? 'Keyword' : (_activeNg === 'bi' ? '2-Word Phrase' : '3-Word Phrase');
      if (boldCol)   boldCol.style.display   = _activeNg === 'uni' ? '' : 'none';
      if (italicCol) italicCol.style.display = _activeNg === 'uni' ? '' : 'none';

      // Clear search
      const searchEl = el.querySelector('#kwSearch');
      if (searchEl) searchEl.value = '';

      renderKwTable(el, _activeNg);
      updateKwSortHeaders(el);
    });
  });

  // Sort on header click
  el.querySelectorAll('.kw-table th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (_kwSortCol === col) { _kwSortAsc = !_kwSortAsc; }
      else { _kwSortCol = col; _kwSortAsc = col === 'word'; }
      sortKwData();
      renderKwTable(el, _activeNg);
      updateKwSortHeaders(el);
    });
  });

  // Search
  el.querySelector('#kwSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    _kwFiltered = q ? _kwData.filter(k => k.word.includes(q)) : [..._kwData];
    sortKwData();
    renderKwTable(el, _activeNg);
  });

  // Download dropdown
  const dlWrap = el.querySelector('#kwDlWrap');
  const dlBtn  = el.querySelector('#kwDlBtn');
  dlBtn.addEventListener('click', e => {
    e.stopPropagation();
    const existing = dlWrap.querySelector('.kw-dl-menu');
    if (existing) { existing.remove(); return; }
    const menu = document.createElement('div');
    menu.className = 'kw-dl-menu';
    menu.innerHTML = `
      <button class="kw-dl-menu-item" data-fmt="csv">📄 CSV</button>
      <button class="kw-dl-menu-item" data-fmt="json">{ } JSON</button>
      <button class="kw-dl-menu-item" data-fmt="txt">📋 Plain Text</button>`;
    dlWrap.appendChild(menu);

    menu.querySelectorAll('.kw-dl-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const fmt      = item.dataset.fmt;
        const label    = _activeNg === 'uni' ? '1word' : _activeNg === 'bi' ? '2word' : '3word';
        const isUni    = _activeNg === 'uni';
        if (fmt === 'csv') {
          const hdrs = isUni
            ? ['#','Keyword','Count','Density %','Bold','Italic','Prominence']
            : ['#','Phrase','Count','Density %','Prominence'];
          const rows = [hdrs, ..._kwData.map((k, i) => isUni
            ? [i+1, k.word, k.count, k.density, k.bold?'Yes':'No', k.italic?'Yes':'No', k.prominence]
            : [i+1, k.word, k.count, k.density, k.prominence])];
          downloadBlob(rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'), 'text/csv', `keywords-${label}.csv`);
        } else if (fmt === 'json') {
          downloadBlob(JSON.stringify(_kwData.map((k,i)=>({rank:i+1,...k})),null,2), 'application/json', `keywords-${label}.json`);
        } else {
          downloadBlob(_kwData.map((k,i)=>`${i+1}. ${k.word} (${k.count}x, ${k.density}%)`).join('\n'), 'text/plain', `keywords-${label}.txt`);
        }
        menu.remove();
      });
    });

    const close = () => { menu.remove(); document.removeEventListener('click', close); };
    setTimeout(() => document.addEventListener('click', close), 10);
  });
}

function sortKwData() {
  _kwFiltered.sort((a, b) => {
    let va, vb;
    switch (_kwSortCol) {
      case '#':          va = _kwData.indexOf(a); vb = _kwData.indexOf(b); break;
      case 'word':       va = a.word;       vb = b.word;       break;
      case 'count':      va = a.count;      vb = b.count;      break;
      case 'density':    va = a.density;    vb = b.density;    break;
      case 'bold':       va = a.bold?1:0;   vb = b.bold?1:0;   break;
      case 'italic':     va = a.italic?1:0; vb = b.italic?1:0; break;
      case 'prominence': va = a.prominence; vb = b.prominence; break;
      default:           va = 0; vb = 0;
    }
    if (va < vb) return _kwSortAsc ? -1 : 1;
    if (va > vb) return _kwSortAsc ? 1 : -1;
    return 0;
  });
}

function renderKwTable(el, ngType) {
  const tbody   = el.querySelector('#kwTbody');
  if (!tbody) return;
  const isUni   = ngType === 'uni';
  const warnPct = KW_WARN[ngType] || 3.0;
  const limit   = ngType === 'tri' ? 100 : 200;

  const promDots = p => {
    const filled = Math.min(Math.round((p / 14) * 5), 5);
    return `<div class="prom-dots">${Array.from({length:5},(_,i)=>`<div class="prom-dot${i<filled?' on':''}"></div>`).join('')}</div>`;
  };

  tbody.innerHTML = _kwFiltered.slice(0, limit).map(k => {
    const origRank    = _kwData.indexOf(k) + 1;
    const isOverOpt   = k.density >= warnPct;
    const densityCell = isOverOpt
      ? `<span class="kw-density" style="color:var(--orange);font-weight:800;" title="⚠ Possible over-optimisation (>${warnPct}%)">${k.density}% ⚠</span>`
      : `<span class="kw-density">${k.density}%</span>`;

    if (isUni) {
      return `<tr ${isOverOpt ? 'style="background:var(--orange-lt);"' : ''}>
        <td>${origRank}</td>
        <td><span class="kw-word">${esc(k.word)}</span></td>
        <td>${k.count}</td>
        <td>${densityCell}</td>
        <td><span class="kw-badge ${k.bold?'yes-b':'no'}">${k.bold?'B':'–'}</span></td>
        <td><span class="kw-badge ${k.italic?'yes-i':'no'}">${k.italic?'I':'–'}</span></td>
        <td>${promDots(k.prominence)}</td>
      </tr>`;
    } else {
      return `<tr ${isOverOpt ? 'style="background:var(--orange-lt);"' : ''}>
        <td>${origRank}</td>
        <td><span class="kw-word">${esc(k.word)}</span></td>
        <td>${k.count}</td>
        <td>${densityCell}</td>
        <td style="display:none"></td>
        <td style="display:none"></td>
        <td>${promDots(k.prominence)}</td>
      </tr>`;
    }
  }).join('');

  if (_kwFiltered.length > limit) {
    tbody.insertAdjacentHTML('beforeend',
      `<tr><td colspan="7" style="text-align:center;color:var(--t4);font-size:10px;padding:8px;">Showing ${limit} of ${_kwFiltered.length}</td></tr>`);
  }
}

function updateKwSortHeaders(el) {
  el.querySelectorAll('.kw-table th').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
    if (th.dataset.col === _kwSortCol) th.classList.add(_kwSortAsc ? 'sort-asc' : 'sort-desc');
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════
function animateScores(scores) {
  const ringTrack = document.getElementById('ringTrack');
  const scoreNum  = document.getElementById('scoreNum');
  const gradeEl   = document.getElementById('scoreGrade');

  let color, grade, gradeCls;
  if      (scores.total >= 90) { color='#1E8E3E'; grade='Excellent';  gradeCls='grade-excellent'; }
  else if (scores.total >= 70) { color='#1A73E8'; grade='Good';       gradeCls='grade-good'; }
  else if (scores.total >= 50) { color='#E37400'; grade='Needs Work'; gradeCls='grade-fair'; }
  else                         { color='#D93025'; grade='Poor';       gradeCls='grade-poor'; }

  ringTrack.style.stroke = color;
  const target = scores.total, dur = 1300, t0 = performance.now();
  const tick = now => {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    scoreNum.textContent = Math.round(e * target);
    ringTrack.style.strokeDashoffset = CIRC - (e * target / 100) * CIRC;
    if (p < 1) { requestAnimationFrame(tick); }
    else {
      scoreNum.textContent = target;
      ringTrack.style.strokeDashoffset = CIRC - (target / 100) * CIRC;
      gradeEl.textContent = grade;
      gradeEl.className   = `score-grade ${gradeCls}`;
    }
  };
  requestAnimationFrame(tick);

  setTimeout(() => {
    [
      { pts:'ptsSeo',  bar:'barSeo',  score:scores.seoScore },
      { pts:'ptsPerf', bar:'barPerf', score:scores.perfScore },
      { pts:'ptsA11y', bar:'barA11y', score:scores.a11yScore },
      { pts:'ptsBp',   bar:'barBp',   score:scores.bpScore },
    ].forEach(({ pts, bar, score }, i) => {
      setTimeout(() => {
        const el = document.getElementById(pts);
        el.textContent = `${score}/25`;
        el.style.color = scoreColor(score, 25);
        document.getElementById(bar).style.width = `${(score/25)*100}%`;
      }, i * 80);
    });
  }, 500);
}

let stepTimer = null;
function animateLoadingSteps() {
  if (stepTimer) clearInterval(stepTimer);
  const steps = ['step1','step2','step3','step4'];
  steps.forEach(id => { const el=document.getElementById(id); if(el) el.classList.remove('active','done'); });
  let i = 0;
  const next = () => {
    if (i > 0) document.getElementById(steps[i-1])?.classList.replace('active','done');
    if (i < steps.length) { document.getElementById(steps[i])?.classList.add('active'); i++; }
    else clearInterval(stepTimer);
  };
  next();
  stepTimer = setInterval(next, 320);
}

// ══════════════════════════════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════════════════════════════
function scoreColor(val, max) {
  const p = val / max;
  if (p >= 0.8) return 'var(--green)';
  if (p >= 0.6) return 'var(--orange)';
  return 'var(--red)';
}
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ══════════════════════════════════════════════════════════════════════════════
//  WCAG TAB
// ══════════════════════════════════════════════════════════════════════════════

function setupWcagTab() {
  document.querySelectorAll('.wcag-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.wcagtab;
      document.querySelectorAll('.wcag-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.wcag-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`wcagpanel-${tab}`).classList.add('active');
    });
  });
}

function renderWcagOrder(tabOrder) {
  const el = document.getElementById('wcagOrderContent');
  if (!el) return;

  if (!tabOrder || !tabOrder.length) {
    el.innerHTML = `<div class="ov-empty" style="padding:32px;">
      <div class="ov-empty-icon">⌨️</div>
      <div class="ov-empty-text">No focusable elements found</div>
      <div class="ov-empty-sub">This page has no keyboard-navigable elements.</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div class="wcag-order-ctrl">
      <label class="wcag-path-label" title="Overlay tab-order path visually on the page">
        <input type="checkbox" id="chkTabOrderPath">
        <span class="wcag-path-toggle"></span>
        Show tab path on page
      </label>
      <span class="wcag-order-count">${tabOrder.length} focusable element${tabOrder.length !== 1 ? 's' : ''}</span>
    </div>
    <div id="wcagOrderList">
      ${tabOrder.map(item => {
        const typeStr = item.type ? ` [${esc(item.type)}]` : '';
        const label   = item.text || '';
        const hasTi   = item.tabindex !== null && item.tabindex !== '0' && item.tabindex !== '-1';
        return `<div class="wcag-order-item">
          <div class="wcag-order-num">${item.index}</div>
          <div class="wcag-order-body">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
              <span class="wcag-order-tag">${esc(item.tag)}${esc(typeStr)}</span>
              <span class="wcag-order-text ${label ? '' : 'empty'}">${label ? esc(label) : 'no accessible label'}</span>
            </div>
            ${(item.role || hasTi) ? `<div class="wcag-order-meta">
              ${item.role ? `<span class="wcag-order-pill role">role="${esc(item.role)}"</span>` : ''}
              ${hasTi     ? `<span class="wcag-order-pill tabidx">tabindex="${esc(item.tabindex)}"</span>` : ''}
            </div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  el.querySelector('#chkTabOrderPath').addEventListener('change', async e => {
    await storageSet('tabOrderOverlayActive', e.target.checked);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleTabOrderOverlay', enabled: e.target.checked });
      }
    } catch (_) {}
  });

  // Restore persisted state — re-check and re-activate if it was on before popup closed
  (async () => {
    const { tabOrderOverlayActive } = await storageGet('tabOrderOverlayActive');
    const chk = el.querySelector('#chkTabOrderPath');
    if (!tabOrderOverlayActive || !chk) return;
    chk.checked = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleTabOrderOverlay', enabled: true });
      }
    } catch (_) {}
  })();
}

// ══════════════════════════════════════════════════════════════════════════════
//  FONTS INFO TAB
// ══════════════════════════════════════════════════════════════════════════════

async function setupFontsTab() {
  const btnRemove = document.getElementById('btnRemoveFontLayers');
  const chkHover  = document.getElementById('chkShowAllOnHover');
  const chkHex    = document.getElementById('chkShowHex');

  // ── Always reset all checkboxes on popup open (page refresh resets state) ─
  document.querySelectorAll('.fontPropChk').forEach(c => { c.checked = false; });
  chkHover.checked = false;
  chkHex.checked   = false;
  await storageSet('activeFontProp', null);
  // Remove any leftover overlays from previous session
  await sendFontMessage({ action: 'removeFontLayers' });

  // ── Single-select checkbox: checking one unchecks others, triggers inspector
  document.querySelectorAll('.fontPropChk').forEach(chk => {
    chk.addEventListener('change', async () => {
      if (chk.checked) {
        // Uncheck all others
        document.querySelectorAll('.fontPropChk').forEach(c => {
          if (c !== chk) c.checked = false;
        });
        // Deactivate "Show all infos on hover" if it was active
        if (chkHover.checked) {
          chkHover.checked = false;
          await sendFontMessage({ action: 'removeFontLayers' });
        }
        await storageSet('activeFontProp', chk.value);
        await runInspector(chk.value);
      } else {
        // Unchecked — remove overlays and clear persisted state
        await storageSet('activeFontProp', null);
        await sendFontMessage({ action: 'removeFontLayers' });
      }
    });
  });

  // ── Remove Layers: clear overlays + uncheck all + clear storage
  btnRemove.addEventListener('click', async () => {
    await sendFontMessage({ action: 'removeFontLayers' });
    document.querySelectorAll('.fontPropChk').forEach(c => { c.checked = false; });
    chkHover.checked = false;
    await storageSet('activeFontProp', null);
  });

  // ── Show All on Hover toggle ───────────────────────────────────────────────
  chkHover.addEventListener('change', async () => {
    if (chkHover.checked) {
      // Uncheck all property checkboxes and remove any overlays
      document.querySelectorAll('.fontPropChk').forEach(c => { c.checked = false; });
      await storageSet('activeFontProp', null);
      await sendFontMessage({ action: 'removeFontLayers' });
      // Activate inspector in hover-only mode (no overlay labels, just tooltip on hover)
      await sendFontMessage({
        action: 'activateFontInspector',
        property: 'fontFamily',   // default property for hover-all mode
        showAllOnHover: true,
        showHex: chkHex.checked,
        hoverOnlyMode: true        // signal: skip drawLayers, only attach hover
      });
    } else {
      // Turned off — remove inspector
      await sendFontMessage({ action: 'removeFontLayers' });
    }
  });

  // ── Hex toggle: live-update active mode
  chkHex.addEventListener('change', async () => {
    if (chkHover.checked) {
      // Re-activate hover-all mode with updated hex setting
      await sendFontMessage({
        action: 'activateFontInspector',
        property: 'fontFamily',
        showAllOnHover: true,
        showHex: chkHex.checked,
        hoverOnlyMode: true
      });
    } else {
      const sel = document.querySelector('.fontPropChk:checked');
      if (sel) await runInspector(sel.value);
    }
  });

  async function runInspector(prop) {
    return await sendFontMessage({
      action: 'activateFontInspector',
      property: prop,
      showAllOnHover: chkHover.checked,
      showHex: chkHex.checked,
      hoverOnlyMode: false
    });
  }
}

function propLabel(prop) {
  const map = {
    fontWeight: 'Font Weight', fontSize: 'Font Size', fontFamily: 'Font Family',
    fontStyle: 'Font Style', color: 'Font Color', lineHeight: 'Line Height',
    letterSpacing: 'Letter Spacing', textTransform: 'Text Transform',
    textDecoration: 'Text Decoration'
  };
  return map[prop] || prop;
}

async function sendFontMessage(msg) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch (_) {}
    return await chrome.tabs.sendMessage(tab.id, msg);
  } catch (err) {
    // silent fail — font inspector not available on this page
    return null;
  }
}
