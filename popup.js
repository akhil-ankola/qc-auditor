// popup.js — QC Auditor v2.0
// Dark Mode | Score History | Broken Images | SEO X-Ray
'use strict';

const CIRC    = 2 * Math.PI * 62;
const SEV_PTS = { high: 5, medium: 3, low: 1 };
const MAX_HISTORY = 10;

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
      font-size: 10.5px; font-weight: 700; color: var(--orange);
      letter-spacing: .4px; text-transform: uppercase;
    }
    .qw-item {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 5px 12px; border-top: 1px solid var(--border);
      font-size: 11px; color: var(--t2); line-height: 1.4;
    }
    .qw-pts {
      background: var(--green); color: #fff; border-radius: 4px;
      padding: 1px 5px; font-size: 10px; font-weight: 700;
      white-space: nowrap; flex-shrink: 0; margin-top: 1px;
    }
    /* ── Issue severity pills ─────────────────────────────────── */
    .issue-sev-pill {
      border-radius: 4px; padding: 1px 6px; font-size: 9.5px;
      font-weight: 700; white-space: nowrap; margin-left: 4px;
    }
    .sev-high   { background: var(--red-lt);    color: var(--red); }
    .sev-medium { background: var(--orange-lt); color: var(--orange); }
    .sev-low    { background: var(--blue-lt);   color: var(--blue); }
    .sv-hint { font-size: 9.5px; color: var(--t4); margin-left: 3px; font-weight: 400; }

    /* ══════════════════════════════════════════════════════════
       SEO X-RAY — Inner tabs
    ══════════════════════════════════════════════════════════ */
    .ov-tabs-bar {
      display: flex; gap: 2px; padding: 8px 10px 0;
      background: var(--card); border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 10; overflow-x: auto;
      transition: background .25s, border-color .25s;
    }
    .ov-tabs-bar::-webkit-scrollbar { display: none; }
    .ov-tab-btn {
      padding: 5px 10px 7px; border: none; background: none;
      cursor: pointer; font-family: inherit; font-size: 11px;
      font-weight: 600; color: var(--t3); position: relative;
      transition: color .15s; border-radius: 4px 4px 0 0;
      white-space: nowrap;
    }
    .ov-tab-btn::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 2px; background: var(--blue); border-radius: 2px 2px 0 0;
      transform: scaleX(0); transition: transform .2s;
    }
    .ov-tab-btn.active { color: var(--blue); }
    .ov-tab-btn.active::after { transform: scaleX(1); }
    .ov-tab-btn:hover:not(.active) { color: var(--t1); background: var(--hover-bg); }
    .ov-panel { display: none; }
    .ov-panel.active { display: block; }

    /* ── Page Summary ─────────────────────────────────────────── */
    .ov-meta-table { background: var(--card); transition: background .25s; }
    .ov-meta-row {
      display: flex; align-items: flex-start;
      padding: 8px 15px; border-bottom: 1px solid var(--border2); gap: 10px;
    }
    .ov-meta-row:last-child { border-bottom: none; }
    .ov-meta-key { font-size: 11px; font-weight: 700; color: var(--t3); min-width: 110px; flex-shrink: 0; padding-top: 1px; }
    .ov-meta-val { font-size: 11px; color: var(--t1); line-height: 1.5; word-break: break-word; flex: 1; }
    .ov-meta-val.missing { color: var(--red); font-style: italic; }
    .ov-meta-val.warn    { color: var(--orange); }
    .ov-meta-val.good    { color: var(--green); }

    .ov-stats-grid { display: flex; background: var(--card); border-top: 2px solid var(--border); border-bottom: 1px solid var(--border); margin-top: 6px; transition: background .25s, border-color .25s; }
    .ov-stat-cell  { flex: 1; text-align: center; padding: 10px 4px 8px; border-right: 1px solid var(--border2); }
    .ov-stat-cell:last-child { border-right: none; }
    .ov-stat-label { font-size: 9.5px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px; }
    .ov-stat-num   { font-size: 17px; font-weight: 800; color: var(--t1); display: block; line-height: 1; }
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
      font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px;
      white-space: nowrap; flex-shrink: 0; letter-spacing: .3px; text-transform: uppercase;
    }
    .ov-h1 { background: var(--blue);    color: #fff; }
    .ov-h2 { background: var(--blue-lt); color: var(--blue); }
    .ov-h3 { background: var(--border2); color: var(--t2); }
    .ov-h4 { background: var(--orange-lt); color: var(--orange); }
    .ov-h5 { background: var(--green-lt);  color: var(--green); }
    .ov-h6 { background: var(--purple-lt); color: var(--purple); }
    .ov-tree-text { font-size: 11.5px; color: var(--t1); }
    .ov-h-counts { display: flex; background: var(--bg); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-top: 6px; transition: background .25s, border-color .25s; }
    .ov-h-count-cell { flex: 1; text-align: center; padding: 8px 2px; border-right: 1px solid var(--border); }
    .ov-h-count-cell:last-child { border-right: none; }
    .ov-h-count-lbl { font-size: 9.5px; font-weight: 700; color: var(--t4); display: block; }
    .ov-h-count-num { font-size: 14px; font-weight: 800; color: var(--t1); display: block; }
    .ov-h-count-num.none { color: var(--border); }

    /* ── Images ───────────────────────────────────────────────── */
    .ov-img-stats { display: flex; background: var(--card); border-bottom: 2px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-img-stat  { flex: 1; text-align: center; padding: 12px 4px 10px; border-right: 1px solid var(--border2); }
    .ov-img-stat:last-child { border-right: none; }
    .ov-img-stat-label { font-size: 9px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 5px; }
    .ov-img-stat-num   { font-size: 22px; font-weight: 800; line-height: 1; display: block; }
    .ov-img-stat-num.neutral { color: var(--blue); }
    .ov-img-stat-num.problem { color: var(--red); }
    .ov-img-stat-num.broken  { color: var(--red); }
    .ov-img-stat-num.ok      { color: var(--green); }

    .ov-img-section { padding: 8px 15px 4px; font-size: 10px; font-weight: 800; color: var(--t4); text-transform: uppercase; letter-spacing: .6px; background: var(--bg); border-bottom: 1px solid var(--border); transition: background .25s, border-color .25s; }
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
    .ov-img-filename { font-size: 11.5px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
    .ov-img-broken-badge { font-size: 9.5px; font-weight: 700; background: var(--red); color: #fff; padding: 1px 6px; border-radius: 4px; margin-bottom: 3px; display: inline-block; }
    .ov-img-attrs { display: flex; gap: 8px; flex-wrap: wrap; }
    .ov-img-attr  { font-size: 10px; display: flex; align-items: center; gap: 3px; }
    .ov-img-attr-key { color: var(--t4); font-weight: 600; }
    .ov-img-attr-val.miss  { color: var(--red);    font-weight: 700; }
    .ov-img-attr-val.ok    { color: var(--green);  font-weight: 700; }
    .ov-img-attr-val.empty { color: var(--orange); font-weight: 700; }

    /* ── Links ────────────────────────────────────────────────── */
    .ov-link-stats { display: flex; background: var(--card); border-bottom: 2px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-link-stat  { flex: 1; text-align: center; padding: 10px 4px 8px; border-right: 1px solid var(--border2); }
    .ov-link-stat:last-child { border-right: none; }
    .ov-link-stat-label { font-size: 9px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px; }
    .ov-link-stat-num   { font-size: 18px; font-weight: 800; display: block; line-height: 1; }
    .ov-link-stat-num.blue { color: var(--blue); }
    .ov-link-stat-num.warn { color: var(--orange); }
    .ov-links-label { padding: 7px 15px 4px; font-size: 10px; font-weight: 800; color: var(--t4); text-transform: uppercase; letter-spacing: .6px; background: var(--bg); border-bottom: 1px solid var(--border); border-top: 1px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-link-item { padding: 8px 15px; background: var(--card); border-bottom: 1px solid var(--border2); transition: background .12s, border-color .25s; }
    .ov-link-item:last-child { border-bottom: none; }
    .ov-link-row1   { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
    .ov-link-badge  { font-size: 8.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
    .badge-anchor   { background: var(--blue-lt);   color: var(--blue); }
    .badge-internal { background: var(--green-lt);  color: var(--green); }
    .badge-external { background: var(--red-lt);    color: var(--red); }
    .ov-link-href   { font-size: 11px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .ov-link-title  { font-size: 10.5px; color: var(--t3); margin-bottom: 2px; }
    .ov-link-title .ov-link-title-val  { font-weight: 600; color: var(--t2); }
    .ov-link-title .ov-link-title-miss { color: var(--red); font-style: italic; }
    .ov-link-occ    { font-size: 10px; color: var(--blue); font-weight: 600; }

    /* ── Schema ───────────────────────────────────────────────── */
    .ov-schema-stats { display: flex; background: var(--card); border-bottom: 2px solid var(--border); transition: background .25s, border-color .25s; }
    .ov-schema-stat  { flex: 1; text-align: center; padding: 10px 4px 8px; border-right: 1px solid var(--border2); }
    .ov-schema-stat:last-child { border-right: none; }
    .ov-schema-stat-label { font-size: 9px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px; }
    .ov-schema-stat-num   { font-size: 20px; font-weight: 800; display: block; line-height: 1; }
    .ov-schema-stat-num.found { color: var(--green); }
    .ov-schema-stat-num.none  { color: var(--red); }
    .ov-schema-block { margin: 8px 12px; border-radius: 10px; overflow: hidden; border: 1.5px solid var(--border); background: var(--card); transition: background .25s, border-color .25s; }
    .ov-schema-block-head { display: flex; align-items: center; gap: 8px; padding: 9px 13px; background: var(--bg); border-bottom: 1px solid var(--border); justify-content: space-between; transition: background .25s, border-color .25s; }
    .ov-schema-block-left { display: flex; align-items: center; gap: 8px; }
    .ov-schema-idx  { font-size: 9.5px; font-weight: 800; color: #fff; background: var(--blue); border-radius: 4px; padding: 1px 6px; flex-shrink: 0; }
    .ov-schema-type { font-size: 12px; font-weight: 700; color: var(--t1); }
    .ov-schema-type-tag { font-size: 9.5px; font-weight: 700; padding: 1px 7px; border-radius: 5px; background: var(--blue-lt); color: var(--blue); white-space: nowrap; }
    .ov-schema-type-tag.error { background: var(--red-lt); color: var(--red); }
    .ov-schema-export-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px; background: var(--blue); color: #fff;
      border: none; font-size: 10px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: opacity .15s; white-space: nowrap;
    }
    .ov-schema-export-btn:hover { opacity: .85; }
    .ov-schema-code {
      font-family: 'Menlo','Consolas','Monaco',monospace;
      font-size: 10.5px; line-height: 1.6; color: var(--t1);
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
    .ov-schema-error { padding: 10px 13px; color: var(--red); font-size: 11px; font-family: 'Menlo','Consolas',monospace; background: var(--red-lt); }
    .ov-export-all-wrap { padding: 10px 12px 12px; display: flex; justify-content: flex-end; }
    .ov-export-all-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 16px; border-radius: 8px; background: var(--green); color: #fff;
      border: none; font-size: 11px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: opacity .15s;
    }
    .ov-export-all-btn:hover { opacity: .85; }

    /* ── Shared helpers ───────────────────────────────────────── */
    .ov-truncate-note { text-align: center; padding: 8px 15px; font-size: 10.5px; color: var(--t4); background: var(--bg); border-top: 1px solid var(--border); }
    .ov-empty { display: flex; flex-direction: column; align-items: center; padding: 24px; gap: 6px; text-align: center; background: var(--bg); }
    .ov-empty-icon { font-size: 24px; }
    .ov-empty-text { font-size: 12px; font-weight: 700; color: var(--t1); }
    .ov-empty-sub  { font-size: 11px; color: var(--t4); }
  `;
  document.head.appendChild(s);
})();

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initDarkMode();
  await initHistory();
  setupTabs();
  setupOverviewTabs();
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
    });
  });
}

function setupOverviewTabs() {
  document.querySelectorAll('.ov-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.ovtab;
      document.querySelectorAll('.ov-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.ov-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`ovpanel-${tab}`).classList.add('active');
    });
  });
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
    requestAnimationFrame(() => setTimeout(() => animateScores(scores), 80));

  } catch (err) {
    console.error('[QC Auditor]', err);
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
  if (S.h2Count === 0 && S.h1Count > 0) fail('seo','SEO','low','No H2 headings found','H2 headings define page sections and help Google index sub-topics.');
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
    if      (P.loadTime >= 4000) fail('perf','Performance','high',`Very slow page load: ${(P.loadTime/1000).toFixed(2)}s — target: <2s`,'Critically slow. 53% of mobile users abandon pages over 3s. Fix: server caching, CDN, image compression, eliminate render-blocking resources.');
    else if (P.loadTime >= 2000) fail('perf','Performance','medium',`Slow page load: ${(P.loadTime/1000).toFixed(2)}s — target: <2s`,'Above 2s threshold. Quick wins: lazy-load images, code-split JS, compress to WebP/AVIF, enable gzip/Brotli, add a CDN.');
    else if (P.loadTime >= 1000) fail('perf','Performance','low',`Page load: ${(P.loadTime/1000).toFixed(2)}s — good, room to improve`,'Target <1s for excellent Core Web Vitals. Preload critical fonts/CSS, preconnect to third-party origins.');
  }
  if (P.ttfb > 0) {
    if      (P.ttfb >= 600) fail('perf','Performance','high',`High TTFB: ${P.ttfb}ms — target: <200ms`,'Server takes over 600ms before sending any data. Fix: server-side caching (Redis/Memcached), CDN, database query optimization.');
    else if (P.ttfb >= 200) fail('perf','Performance','medium',`TTFB: ${P.ttfb}ms — target: <200ms`,'Slow server response. Add HTTP cache headers, use a reverse proxy (Nginx/Cloudflare), optimize slow server-side code.');
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

  if (A.hasForms && A.inputsWithoutLabels > 0) fail('a11y','Accessibility','high',`${A.inputsWithoutLabels} form input(s) without proper labels`,'Unlabeled inputs are announced as "edit text" with zero context. Fix: <label for="inputId">, aria-label, or wrap in <label>. Violates WCAG 1.3.1.');
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
  if (A.hasForms && A.inputsWithoutLabels > 0) add('high','Accessibility','Fix Form Accessibility',`${A.inputsWithoutLabels} inputs have no programmatic labels — a critical WCAG failure. Three valid approaches: <label for="inputId">, aria-label="Email", or wrap input inside <label>.`,'High');
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
  renderOverview(data);
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

// ── Details Tab ───────────────────────────────────────────────────────────────
function renderDetails(data, scores) {
  const S = data.seo, P = data.performance,
        A = data.accessibility, B = data.bestPractices,
        OV = data.overview;
  const el  = document.getElementById('detailsContent');
  const sec = (icon, label, scoreVal, rows) => `
    <div class="details-section">
      <div class="details-head">
        <span class="details-head-icon">${icon}</span>
        <span class="details-head-label">${label}</span>
        <span class="details-head-score" style="color:${scoreColor(scoreVal,25)}">${scoreVal}/25</span>
      </div>
      ${rows.map(([k,v,c]) => `<div class="detail-row"><span class="detail-key">${esc(k)}</span><span class="detail-val val-${c}">${v}</span></div>`).join('')}
    </div>`;

  const ltCls   = P.loadTime<=0?'neu':P.loadTime<2000?'pass':P.loadTime<4000?'warn':'fail';
  const ltLabel = P.loadTime<=0?'N/A':P.loadTime<1000?`${(P.loadTime/1000).toFixed(2)}s — Fast ✓`:P.loadTime<2000?`${(P.loadTime/1000).toFixed(2)}s — OK`:P.loadTime<4000?`${(P.loadTime/1000).toFixed(2)}s — Slow ⚠`:`${(P.loadTime/1000).toFixed(2)}s — Critical ✗`;
  const ttfbCls = P.ttfb<=0?'neu':P.ttfb<200?'pass':P.ttfb<600?'warn':'fail';
  const ttfbLbl = P.ttfb<=0?'N/A':P.ttfb<200?`${P.ttfb}ms — Excellent ✓`:P.ttfb<600?`${P.ttfb}ms — Slow ⚠ (target: <200ms)`:`${P.ttfb}ms — Critical ✗`;
  const domCls  = P.domSize<1500?'pass':P.domSize<3000?'warn':'fail';
  const domLbl  = P.domSize<1500?`${P.domSize.toLocaleString()} — OK ✓`:P.domSize<3000?`${P.domSize.toLocaleString()} — Large ⚠`:`${P.domSize.toLocaleString()} — Excessive ✗`;

  const brokenCount = OV?.imagesBroken || 0;

  el.innerHTML =
    sec('🔍','SEO',scores.seoScore,[
      ['Page Title', S.title?`"${S.title.slice(0,26)}${S.title.length>26?'…':''}"`:' ✗ Missing', S.title?(S.titleLength>=30&&S.titleLength<=60?'pass':'warn'):'fail'],
      ['Title Length', S.titleLength?`${S.titleLength} chars ${S.titleLength>=50&&S.titleLength<=60?'✓':'⚠ (50–60 ideal)'}`:'N/A', S.titleLength>=50&&S.titleLength<=60?'pass':S.titleLength>=30?'warn':'fail'],
      ['Meta Description', S.metaDescription?`${S.metaDescriptionLength} chars ${S.metaDescriptionLength>=140&&S.metaDescriptionLength<=160?'✓':'⚠'}`:'✗ Missing', S.metaDescriptionLength>=140&&S.metaDescriptionLength<=160?'pass':S.metaDescriptionLength>0?'warn':'fail'],
      ['H1 / H2 / H3', `${S.h1Count} / ${S.h2Count} / ${S.h3Count}`, S.h1Count===1?'pass':S.h1Count===0?'fail':'warn'],
      ['Heading Hierarchy', S.headingHierarchyOk?'✓ Correct':'✗ Broken', S.headingHierarchyOk?'pass':'fail'],
      ['Open Graph', (S.ogTitle&&S.ogDescription&&S.ogImage)?'✓ Complete':(S.ogTitle||S.ogDescription)?'⚠ Partial':'✗ Missing', (S.ogTitle&&S.ogDescription&&S.ogImage)?'pass':(S.ogTitle||S.ogDescription)?'warn':'fail'],
      ['Canonical Tag', S.canonical?'✓ Present':'⚠ Missing', S.canonical?'pass':'warn'],
      ['JSON-LD / Schema', S.jsonLD?'✓ Found':'⚠ Not found', S.jsonLD?'pass':'warn'],
      ['Internal / External', `${S.internalLinks} / ${S.externalLinks}`, 'neu'],
      ['Vague Link Text', `${S.nonDescriptiveLinks} ${S.nonDescriptiveLinks===0?'✓':'⚠'}`, S.nonDescriptiveLinks===0?'pass':'warn'],
    ]) +
    sec('⚡','Performance',scores.perfScore,[
      ['Page Load Time', ltLabel, ltCls],
      ['TTFB', ttfbLbl, ttfbCls],
      ['DOM Content Loaded', P.domContentLoaded>0?`${(P.domContentLoaded/1000).toFixed(2)}s`:'N/A', 'neu'],
      ['DOM Size', domLbl, domCls],
      ['External Scripts', `${P.scriptsCount} ${P.scriptsCount<=10?'✓':P.scriptsCount<=20?'⚠ Many':'✗ Too many'}`, P.scriptsCount<=10?'pass':P.scriptsCount<=20?'warn':'fail'],
      ['Render-Blocking', `${P.renderBlockingScripts} ${P.renderBlockingScripts===0?'✓':'✗'}`, P.renderBlockingScripts===0?'pass':'fail'],
      ['Lazy Images', `${P.lazyImages} / ${P.totalImages} ${P.totalImages>0&&P.lazyImages/P.totalImages>=0.7?'✓':'⚠'}`, P.totalImages===0||P.lazyImages/P.totalImages>=0.7?'pass':'warn'],
      ['Large Images >200KB', `${P.largeImagesCount} ${P.largeImagesCount===0?'✓':'⚠'}`, P.largeImagesCount===0?'pass':'warn'],
      ['WebP / Next-Gen', P.hasWebP?'✓ Detected':'⚠ None found', P.hasWebP?'pass':'warn'],
    ]) +
    sec('♿','Accessibility',scores.a11yScore,[
      ['Language (lang="")', A.langAttribute?`✓ "${A.langAttribute}"`:' ✗ Missing', A.langAttribute?'pass':'fail'],
      ['Images Without Alt', A.totalImages>0?`${A.imagesWithoutAlt} of ${A.totalImages}`:'N/A', A.imagesWithoutAlt===0?'pass':'fail'],
      ['Broken Images', `${brokenCount} ${brokenCount===0?'✓':'✗ Broken'}`, brokenCount===0?'pass':'fail'],
      ['Poor Alt Text', `${A.poorAltCount} ${A.poorAltCount===0?'✓':'⚠'}`, A.poorAltCount===0?'pass':'warn'],
      ['Form Inputs', A.hasForms?`${A.inputsWithoutLabels} unlabeled`:'No forms ✓', (!A.hasForms||A.inputsWithoutLabels===0)?'pass':'fail'],
      ['Buttons Without Text', `${A.buttonsWithoutText} ${A.buttonsWithoutText===0?'✓':'✗'}`, A.buttonsWithoutText===0?'pass':'fail'],
      ['Skip Navigation', A.hasSkipNav?'✓ Found':'⚠ Missing', A.hasSkipNav?'pass':'warn'],
      ['ARIA Landmarks', `${A.ariaLandmarks} ${A.ariaLandmarks>=3?'✓':A.ariaLandmarks>0?'⚠':'✗'}`, A.ariaLandmarks>=3?'pass':A.ariaLandmarks>0?'warn':'fail'],
      ['Focus Visibility', (A.focusCssKilled||A.focusKilledInline>0)?'✗ Suppressed':'✓ OK', (A.focusCssKilled||A.focusKilledInline>0)?'fail':'pass'],
    ]) +
    sec('🛡️','Best Practices',scores.bpScore,[
      ['HTTPS', B.isHttps?'✓ Secure':'✗ Insecure', B.isHttps?'pass':'fail'],
      ['Mixed Content', B.mixedContent?'✗ Detected':'✓ Clean', B.mixedContent?'fail':'pass'],
      ['Viewport Meta', B.hasViewportMeta?'✓ Present':'✗ Missing', B.hasViewportMeta?'pass':'fail'],
      ['DOCTYPE', B.doctypePresent?'✓ HTML5':'✗ Missing', B.doctypePresent?'pass':'fail'],
      ['Charset Meta', B.charsetMeta?'✓ UTF-8':'⚠ Missing', B.charsetMeta?'pass':'warn'],
      ['Semantic HTML', `${B.semanticTagsCount} type(s) ${B.hasSemanticHTML?'✓':'⚠'}`, B.hasSemanticHTML?'pass':'warn'],
      ['Deprecated Tags', B.deprecatedTags.length===0?'✓ None':B.deprecatedTags.slice(0,3).join(', '), B.deprecatedTags.length===0?'pass':'warn'],
      ['Unsafe Ext. Links', `${B.externalLinksUnsafe} ${B.externalLinksUnsafe===0?'✓':'⚠'}`, B.externalLinksUnsafe===0?'pass':'warn'],
      ['Inline Event Handlers', `${B.inlineEventHandlers} ${B.inlineEventHandlers===0?'✓':'⚠'}`, B.inlineEventHandlers===0?'pass':'warn'],
    ]);
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
}

// ── Page Summary ──────────────────────────────────────────────────────────────
function renderOvSummary(S, OV) {
  const el  = document.getElementById('ovSummaryContent');
  const row = (key, val, cls='') => `<div class="ov-meta-row"><span class="ov-meta-key">${key}</span><span class="ov-meta-val ${cls}">${val}</span></div>`;

  const titleVal = S.title ? `${esc(S.title.slice(0,80))} <span style="color:var(--t4);font-size:10px;font-weight:400;">(${S.titleLength} chars)</span>` : 'Missing title tag!';
  const descVal  = S.metaDescription ? `${esc(S.metaDescription.slice(0,120))}${S.metaDescription.length>120?'…':''} <span style="color:var(--t4);font-size:10px;font-weight:400;">(${S.metaDescriptionLength} chars)</span>` : 'Description is missing!';
  const totalLinks = OV.totalLinks || (S.internalLinks + S.externalLinks + S.emptyLinks);

  const statCell = (label, num, cls='') => `<div class="ov-stat-cell"><span class="ov-stat-label">${label}</span><span class="ov-stat-num ${num===0?'zero':''} ${cls}">${num}</span></div>`;

  el.innerHTML = `
    <div class="ov-meta-table">
      ${row('Title',      titleVal,  S.title?(S.titleLength>=30&&S.titleLength<=60?'good':'warn'):'missing')}
      ${row('Description',descVal,   S.metaDescription?(S.metaDescriptionLength>=140&&S.metaDescriptionLength<=160?'good':'warn'):'missing')}
      ${row('Keywords',   OV.keywords?esc(OV.keywords.slice(0,100)):'Keywords are missing!', OV.keywords?'':'missing')}
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

// ── Images (with Broken section) ──────────────────────────────────────────────
function renderOvImages(OV) {
  const el   = document.getElementById('ovImagesContent');
  const imgs = OV.imagesList || [];
  const broken    = imgs.filter(i => i.broken);
  const toFix     = imgs.filter(i => !i.broken && !i.complete);
  const completed = imgs.filter(i => !i.broken && i.complete);
  const MAX = 30;

  const attrVal = (val, present) => {
    if (!present && val === null) return `<span class="ov-img-attr-val miss">/ (missing)</span>`;
    if (!present && val === '')   return `<span class="ov-img-attr-val empty">/ (empty)</span>`;
    return `<span class="ov-img-attr-val ok">${esc((val||'').slice(0,60))}</span>`;
  };

  const imgCard = (img) => `
    <div class="ov-img-card ${img.broken?'is-broken':''}">
      <div class="ov-img-thumb ${img.broken?'broken-thumb':''}">
        ${img.broken ? '💔' : img.src ? `<img src="${esc(img.src)}" alt="" onerror="this.style.display='none';this.parentNode.textContent='🖼️'">` : '🖼️'}
      </div>
      <div class="ov-img-info">
        ${img.broken ? '<span class="ov-img-broken-badge">⚠ 404 / Broken</span>' : ''}
        <div class="ov-img-filename" title="${esc(img.src)}">${esc(img.filename)}</div>
        <div class="ov-img-attrs">
          <span class="ov-img-attr"><span class="ov-img-attr-key">ALT:</span>${attrVal(img.alt, img.hasAlt)}</span>
          <span class="ov-img-attr"><span class="ov-img-attr-key">Title:</span>${attrVal(img.title||null, img.hasTitle)}</span>
        </div>
      </div>
    </div>`;

  el.innerHTML = `
    <div class="ov-img-stats">
      <div class="ov-img-stat"><span class="ov-img-stat-label">Images</span><span class="ov-img-stat-num neutral">${OV.imagesTotal}</span></div>
      <div class="ov-img-stat"><span class="ov-img-stat-label">Broken 💔</span><span class="ov-img-stat-num ${OV.imagesBroken>0?'broken':'ok'}">${OV.imagesBroken}</span></div>
      <div class="ov-img-stat"><span class="ov-img-stat-label">Without ALT</span><span class="ov-img-stat-num ${OV.imagesWithoutAlt>0?'problem':'ok'}">${OV.imagesWithoutAlt}</span></div>
      <div class="ov-img-stat"><span class="ov-img-stat-label">Without Title</span><span class="ov-img-stat-num ${OV.imagesWithoutTitle>0?'problem':'ok'}">${OV.imagesWithoutTitle}</span></div>
    </div>
    ${broken.length ? `<div class="ov-img-section broken-section">💔 Broken Images (${broken.length})</div>${broken.slice(0,MAX).map(imgCard).join('')}${broken.length>MAX?`<div class="ov-truncate-note">… and ${broken.length-MAX} more broken images</div>`:''}` : ''}
    ${toFix.length  ? `<div class="ov-img-section">⚠ Images to Complete (${toFix.length})</div>${toFix.slice(0,MAX).map(imgCard).join('')}${toFix.length>MAX?`<div class="ov-truncate-note">… and ${toFix.length-MAX} more need attention</div>`:''}` : ''}
    ${completed.length ? `<div class="ov-img-section">✓ Completed (${completed.length})</div>${completed.slice(0,MAX).map(imgCard).join('')}${completed.length>MAX?`<div class="ov-truncate-note">… and ${completed.length-MAX} more completed</div>`:''}` : ''}
    ${!imgs.length ? `<div class="ov-empty"><div class="ov-empty-icon">🖼️</div><div class="ov-empty-text">No images found</div><div class="ov-empty-sub">This page contains no &lt;img&gt; elements.</div></div>` : ''}`;
}

// ── Links ─────────────────────────────────────────────────────────────────────
function renderOvLinks(OV) {
  const el    = document.getElementById('ovLinksContent');
  const links = OV.linksList || [];
  const sorted = [...links].sort((a, b) => {
    const o = l => l.isAnchor?0:l.isInternal?1:2;
    return o(a) - o(b) || b.count - a.count;
  });
  const MAX = 60;
  const badge = l => l.isAnchor?`<span class="ov-link-badge badge-anchor">Anchor</span>`:l.isInternal?`<span class="ov-link-badge badge-internal">Internal</span>`:`<span class="ov-link-badge badge-external">External</span>`;
  const linkItem = l => `<div class="ov-link-item">
    <div class="ov-link-row1">${badge(l)}<span class="ov-link-href" title="${esc(l.href)}">${esc(l.href.length>55?l.href.slice(0,52)+'…':l.href)}</span></div>
    <div class="ov-link-title">Title: ${l.title?`<span class="ov-link-title-val">${esc(l.title)}</span>`:`<span class="ov-link-title-miss">not defined</span>`}</div>
    ${l.count>1?`<div class="ov-link-occ">↩ Found ${l.count-1} more occurrence${l.count>2?'s':''} of this link</div>`:''}
  </div>`;

  el.innerHTML = `
    <div class="ov-link-stats">
      <div class="ov-link-stat"><span class="ov-link-stat-label">Links</span><span class="ov-link-stat-num blue">${OV.totalLinks||0}</span></div>
      <div class="ov-link-stat"><span class="ov-link-stat-label">Unique</span><span class="ov-link-stat-num blue">${OV.uniqueLinks||0}</span></div>
      <div class="ov-link-stat"><span class="ov-link-stat-label">Internal Unique</span><span class="ov-link-stat-num blue">${OV.internalUniqueLinks||0}</span></div>
      <div class="ov-link-stat"><span class="ov-link-stat-label">Without Title</span><span class="ov-link-stat-num ${OV.linksWithoutTitle>0?'warn':'blue'}">${OV.linksWithoutTitle||0}</span></div>
    </div>
    <div class="ov-links-label">Links &lt;A /&gt;</div>
    ${sorted.slice(0,MAX).map(linkItem).join('')}
    ${sorted.length>MAX?`<div class="ov-truncate-note">Showing ${MAX} of ${sorted.length} unique links</div>`:''}
    ${!sorted.length?`<div class="ov-empty"><div class="ov-empty-icon">🔗</div><div class="ov-empty-text">No links found</div><div class="ov-empty-sub">This page contains no anchor elements.</div></div>`:''}`;
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

  const blocksHTML = schemas.map((schema, i) => {
    const hasError = !!schema.error;
    const pretty   = !hasError ? JSON.stringify(schema.parsed, null, 2) : null;
    return `<div class="ov-schema-block">
      <div class="ov-schema-block-head">
        <div class="ov-schema-block-left">
          <span class="ov-schema-idx">#${i+1}</span>
          <span class="ov-schema-type">${esc(hasError?'Parse Error':schema.type)}</span>
          <span class="ov-schema-type-tag ${hasError?'error':''}">${hasError?'⚠ Invalid JSON':'JSON-LD'}</span>
        </div>
        ${!hasError ? `<button class="ov-schema-export-btn" data-schema-idx="${i}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>` : ''}
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
  const expAll = el.querySelector('#exportAllSchemas');
  if (expAll) expAll.addEventListener('click', () => {
    const valid = schemas.map(s=>s.parsed).filter(Boolean);
    downloadJSON(valid.length===1?valid[0]:valid, 'schema-all.json');
  });
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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
