// popup.js — QC Auditor Phase 2
// Severity-based scoring | Quick Wins | Smart Interpretation | Overview Tab
'use strict';

const CIRC    = 2 * Math.PI * 62;
const SEV_PTS = { high: 5, medium: 3, low: 1 };

// ─── Phase 2 CSS (injected at runtime) ───────────────────────────────────────
(function injectCSS() {
  const s = document.createElement('style');
  s.textContent = `
    /* ── Quick Wins ─────────────────────────────────────────── */
    .quick-wins {
      background: linear-gradient(135deg,#fff8e1 0%,#fff3e0 100%);
      border: 1.5px solid #E37400;
      border-radius: 10px;
      margin: 10px;
      overflow: hidden;
    }
    .qw-header {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px 5px;
      font-size: 10.5px; font-weight: 700; color: #b05a00;
      letter-spacing: .4px; text-transform: uppercase;
    }
    .qw-item {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 5px 12px; border-top: 1px solid #ffe0b2;
      font-size: 11px; color: #5a3e00; line-height: 1.4;
    }
    .qw-pts {
      background: #1E8E3E; color: #fff; border-radius: 4px;
      padding: 1px 5px; font-size: 10px; font-weight: 700;
      white-space: nowrap; flex-shrink: 0; margin-top: 1px;
    }
    /* ── Severity pills on issue cards ─────────────────────── */
    .issue-sev-pill {
      border-radius: 4px; padding: 1px 6px;
      font-size: 9.5px; font-weight: 700;
      white-space: nowrap; margin-left: 4px;
    }
    .sev-high   { background: #fce8e6; color: #c5221f; }
    .sev-medium { background: #fef3e0; color: #b06000; }
    .sev-low    { background: #e8f0fe; color: #1557b0; }
    /* ── Smart hint text in details ─────────────────────────── */
    .sv-hint { font-size: 9.5px; color: #80868b; margin-left: 3px; font-weight: 400; }

    /* ════════════════════════════════════════════════════════
       OVERVIEW TAB
    ════════════════════════════════════════════════════════ */
    /* ── Inner tab bar ──────────────────────────────────────── */
    .ov-tabs-bar {
      display: flex; gap: 4px; padding: 8px 12px 0;
      background: #fff;
      border-bottom: 1px solid #E8EAED;
      position: sticky; top: 0; z-index: 10;
    }
    .ov-tab-btn {
      padding: 5px 11px 7px;
      border: none; background: none;
      cursor: pointer; font-family: inherit;
      font-size: 11px; font-weight: 600; color: #5F6368;
      position: relative; transition: color .15s; border-radius: 4px 4px 0 0;
    }
    .ov-tab-btn::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 2px; background: #1A73E8; border-radius: 2px 2px 0 0;
      transform: scaleX(0); transition: transform .2s;
    }
    .ov-tab-btn.active { color: #1A73E8; }
    .ov-tab-btn.active::after { transform: scaleX(1); }
    .ov-tab-btn:hover:not(.active) { color: #3C4043; background: #F8F9FA; }

    /* ── Inner panels ──────────────────────────────────────── */
    .ov-panel { display: none; }
    .ov-panel.active { display: block; }

    /* ── Page Summary ────────────────────────────────────────── */
    .ov-meta-table { background: #fff; }
    .ov-meta-row {
      display: flex; align-items: flex-start;
      padding: 8px 15px; border-bottom: 1px solid #F1F3F4; gap: 10px;
    }
    .ov-meta-row:last-child { border-bottom: none; }
    .ov-meta-key {
      font-size: 11px; font-weight: 700; color: #5F6368;
      min-width: 110px; flex-shrink: 0; padding-top: 1px;
    }
    .ov-meta-val {
      font-size: 11px; color: #202124; line-height: 1.5; word-break: break-word; flex: 1;
    }
    .ov-meta-val.missing { color: #D93025; font-style: italic; }
    .ov-meta-val.warn    { color: #E37400; }
    .ov-meta-val.good    { color: #1E8E3E; }

    /* Stats row */
    .ov-stats-grid {
      display: flex; background: #fff;
      border-top: 2px solid #E8EAED; border-bottom: 1px solid #E8EAED;
      margin-top: 6px;
    }
    .ov-stat-cell {
      flex: 1; text-align: center; padding: 10px 4px 8px;
      border-right: 1px solid #F1F3F4;
    }
    .ov-stat-cell:last-child { border-right: none; }
    .ov-stat-label {
      font-size: 9.5px; font-weight: 700; color: #80868B;
      text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px;
    }
    .ov-stat-num {
      font-size: 17px; font-weight: 800; color: #202124; display: block; line-height: 1;
    }
    .ov-stat-num.zero { color: #BDC1C6; }
    .ov-stat-num.warn { color: #E37400; }
    .ov-stat-num.fail { color: #D93025; }

    /* ── Headers Tree ──────────────────────────────────────── */
    .ov-tree-wrap { background: #fff; padding: 10px 0 4px; }
    .ov-tree-item {
      display: flex; align-items: baseline; gap: 7px;
      padding: 3px 15px 3px calc(15px + var(--indent) * 18px);
      line-height: 1.45;
    }
    .ov-tree-item:hover { background: #F8F9FA; }
    .ov-h-tag {
      font-size: 9px; font-weight: 800; padding: 1px 5px;
      border-radius: 4px; white-space: nowrap; flex-shrink: 0;
      letter-spacing: .3px; text-transform: uppercase;
    }
    .ov-h1 { background: #1A73E8; color: #fff; }
    .ov-h2 { background: #E8F0FE; color: #1557B0; }
    .ov-h3 { background: #F1F3F4; color: #3C4043; }
    .ov-h4 { background: #FEF3E2; color: #B06000; }
    .ov-h5 { background: #E6F4EA; color: #1E8E3E; }
    .ov-h6 { background: #F3E8FD; color: #7B2FBE; }
    .ov-tree-text { font-size: 11.5px; color: #202124; }

    .ov-h-counts {
      display: flex; background: #F8F9FA;
      border-top: 1px solid #E8EAED; border-bottom: 1px solid #E8EAED;
      margin-top: 6px;
    }
    .ov-h-count-cell {
      flex: 1; text-align: center; padding: 8px 2px;
      border-right: 1px solid #E8EAED;
    }
    .ov-h-count-cell:last-child { border-right: none; }
    .ov-h-count-lbl { font-size: 9.5px; font-weight: 700; color: #80868B; display: block; }
    .ov-h-count-num { font-size: 14px; font-weight: 800; color: #3C4043; display: block; }
    .ov-h-count-num.none { color: #BDC1C6; }

    /* ── Schema Tab ─────────────────────────────────────────── */
    .ov-schema-stats {
      display: flex; background: #fff;
      border-bottom: 2px solid #E8EAED;
    }
    .ov-schema-stat {
      flex: 1; text-align: center; padding: 10px 4px 8px;
      border-right: 1px solid #F1F3F4;
    }
    .ov-schema-stat:last-child { border-right: none; }
    .ov-schema-stat-label {
      font-size: 9px; font-weight: 700; color: #80868B;
      text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px;
    }
    .ov-schema-stat-num {
      font-size: 20px; font-weight: 800; display: block; line-height: 1;
    }
    .ov-schema-stat-num.found { color: #1E8E3E; }
    .ov-schema-stat-num.none  { color: #D93025; }

    .ov-schema-block {
      margin: 8px 12px; border-radius: 10px; overflow: hidden;
      border: 1.5px solid #E8EAED; background: #fff;
    }
    .ov-schema-block-head {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 13px;
      background: #F8F9FA; border-bottom: 1px solid #E8EAED;
      justify-content: space-between;
    }
    .ov-schema-block-left { display: flex; align-items: center; gap: 8px; }
    .ov-schema-idx {
      font-size: 9.5px; font-weight: 800; color: #fff;
      background: #1A73E8; border-radius: 4px;
      padding: 1px 6px; flex-shrink: 0;
    }
    .ov-schema-type {
      font-size: 12px; font-weight: 700; color: #202124;
    }
    .ov-schema-type-tag {
      font-size: 9.5px; font-weight: 700; padding: 1px 7px;
      border-radius: 5px; background: #E8F0FE; color: #1557B0;
      white-space: nowrap;
    }
    .ov-schema-type-tag.error { background: #FCE8E6; color: #C5221F; }

    .ov-schema-export-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px;
      background: #1A73E8; color: #fff; border: none;
      font-size: 10px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: background .15s; white-space: nowrap;
    }
    .ov-schema-export-btn:hover { background: #1557B0; }
    .ov-schema-export-btn svg  { flex-shrink: 0; }

    .ov-schema-code {
      font-family: 'Menlo','Consolas','Monaco',monospace;
      font-size: 10.5px; line-height: 1.6; color: #202124;
      background: #FAFAFA; padding: 10px 13px;
      overflow-x: auto; white-space: pre; max-height: 220px;
      overflow-y: auto;
    }
    .ov-schema-code::-webkit-scrollbar { width: 4px; height: 4px; }
    .ov-schema-code::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 4px; }

    /* JSON syntax colors */
    .json-key     { color: #1557B0; font-weight: 600; }
    .json-str     { color: #188038; }
    .json-num     { color: #D93025; }
    .json-bool    { color: #7B2FBE; font-weight: 700; }
    .json-null    { color: #80868B; font-weight: 700; }

    .ov-schema-error {
      padding: 10px 13px; color: #C5221F;
      font-size: 11px; font-family: 'Menlo','Consolas',monospace; background: #FFF8F7;
    }

    .ov-export-all-wrap {
      padding: 10px 12px 12px;
      display: flex; justify-content: flex-end;
    }
    .ov-export-all-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 16px; border-radius: 8px;
      background: #1E8E3E; color: #fff; border: none;
      font-size: 11px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: background .15s;
    }
    .ov-export-all-btn:hover { background: #157330; }
    .ov-img-stats {
      display: flex; background: #fff;
      border-bottom: 2px solid #E8EAED;
    }
    .ov-img-stat {
      flex: 1; text-align: center; padding: 12px 4px 10px;
      border-right: 1px solid #F1F3F4;
    }
    .ov-img-stat:last-child { border-right: none; }
    .ov-img-stat-label {
      font-size: 9px; font-weight: 700; color: #80868B;
      text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 5px;
    }
    .ov-img-stat-num {
      font-size: 22px; font-weight: 800; line-height: 1; display: block;
    }
    .ov-img-stat-num.neutral { color: #1A73E8; }
    .ov-img-stat-num.problem { color: #D93025; }
    .ov-img-stat-num.ok      { color: #1E8E3E; }

    .ov-img-section {
      padding: 8px 15px 4px;
      font-size: 10px; font-weight: 800; color: #80868B;
      text-transform: uppercase; letter-spacing: .6px; background: #F8F9FA;
      border-bottom: 1px solid #E8EAED;
    }
    .ov-img-card {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 15px; border-bottom: 1px solid #F1F3F4;
      background: #fff;
    }
    .ov-img-card:last-of-type { border-bottom: none; }
    .ov-img-thumb {
      width: 38px; height: 38px; border-radius: 6px;
      background: #F1F3F4; border: 1px solid #E8EAED;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 16px; overflow: hidden;
    }
    .ov-img-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 5px; }
    .ov-img-info { flex: 1; min-width: 0; }
    .ov-img-filename {
      font-size: 11.5px; font-weight: 700; color: #202124;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-bottom: 3px;
    }
    .ov-img-attrs { display: flex; gap: 8px; flex-wrap: wrap; }
    .ov-img-attr {
      font-size: 10px; display: flex; align-items: center; gap: 3px;
    }
    .ov-img-attr-key { color: #80868B; font-weight: 600; }
    .ov-img-attr-val { font-weight: 700; }
    .ov-img-attr-val.miss { color: #D93025; }
    .ov-img-attr-val.ok   { color: #1E8E3E; }
    .ov-img-attr-val.empty { color: #E37400; }

    /* ── Links ──────────────────────────────────────────────── */
    .ov-link-stats {
      display: flex; background: #fff;
      border-bottom: 2px solid #E8EAED;
    }
    .ov-link-stat {
      flex: 1; text-align: center; padding: 10px 4px 8px;
      border-right: 1px solid #F1F3F4;
    }
    .ov-link-stat:last-child { border-right: none; }
    .ov-link-stat-label {
      font-size: 9px; font-weight: 700; color: #80868B;
      text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px;
    }
    .ov-link-stat-num {
      font-size: 18px; font-weight: 800; display: block; line-height: 1;
    }
    .ov-link-stat-num.blue { color: #1A73E8; }
    .ov-link-stat-num.warn { color: #E37400; }

    .ov-links-label {
      padding: 7px 15px 4px;
      font-size: 10px; font-weight: 800; color: #80868B;
      text-transform: uppercase; letter-spacing: .6px; background: #F8F9FA;
      border-bottom: 1px solid #E8EAED; border-top: 1px solid #E8EAED;
    }
    .ov-link-item {
      padding: 8px 15px; background: #fff;
      border-bottom: 1px solid #F1F3F4;
    }
    .ov-link-item:last-child { border-bottom: none; }
    .ov-link-row1 { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
    .ov-link-badge {
      font-size: 8.5px; font-weight: 700; padding: 1px 5px;
      border-radius: 4px; white-space: nowrap; flex-shrink: 0;
    }
    .badge-anchor   { background: #E8F0FE; color: #1557B0; }
    .badge-internal { background: #E6F4EA; color: #1E8E3E; }
    .badge-external { background: #FCE8E6; color: #C5221F; }
    .ov-link-href {
      font-size: 11px; font-weight: 700; color: #202124;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
    }
    .ov-link-title {
      font-size: 10.5px; color: #5F6368; margin-bottom: 2px;
    }
    .ov-link-title .ov-link-title-val { font-weight: 600; color: #3C4043; }
    .ov-link-title .ov-link-title-miss { color: #D93025; font-style: italic; }
    .ov-link-occ {
      font-size: 10px; color: #1A73E8; font-weight: 600;
    }

    /* Empty / truncate notice */
    .ov-truncate-note {
      text-align: center; padding: 8px 15px;
      font-size: 10.5px; color: #80868B; background: #F8F9FA;
      border-top: 1px solid #E8EAED;
    }
    .ov-empty {
      display: flex; flex-direction: column; align-items: center;
      padding: 24px; gap: 6px; text-align: center;
    }
    .ov-empty-icon { font-size: 24px; }
    .ov-empty-text { font-size: 12px; font-weight: 700; color: #3C4043; }
    .ov-empty-sub  { font-size: 11px; color: #80868B; }
  `;
  document.head.appendChild(s);
})();

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupOverviewTabs();
  document.getElementById('btnReanalyze').addEventListener('click', runAudit);
  document.getElementById('btnRetry').addEventListener('click', runAudit);
  runAudit();
});

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

// ─── Main Audit Flow ──────────────────────────────────────────────────────────
async function runAudit() {
  showState('loading');
  animateLoadingSteps();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return showError('Cannot determine the current tab URL.');

    const blocked = ['chrome://','chrome-extension://','about:','edge://','brave://','moz-extension://'];
    if (blocked.some(p => tab.url.startsWith(p)))
      return showError('Browser internal pages cannot be audited. Navigate to any website and try again.');

    try {
      const u = new URL(tab.url);
      document.getElementById('siteName').textContent = u.hostname.replace(/^www\./, '');
      document.getElementById('siteDot').className =
        'site-dot' + (u.protocol === 'https:' ? '' : ' insecure');
    } catch (_) {
      document.getElementById('siteName').textContent = tab.url.slice(0, 35);
    }

    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await delay(120);

    const resp = await chrome.tabs.sendMessage(tab.id, { action: 'collectData' });
    if (!resp?.success) throw new Error(resp?.error || 'Failed to collect page data.');

    const scores = calculateScores(resp.data);
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

// ─── Score Calculation ────────────────────────────────────────────────────────
function calculateScores(data) {
  const issues = [];
  const deduct  = { seo: 0, perf: 0, a11y: 0, bp: 0 };

  const fail = (catKey, cat, sev, title, detail) => {
    const pts = SEV_PTS[sev] || 1;
    issues.push({ cat, sev, title, detail, pts });
    deduct[catKey] = Math.min(deduct[catKey] + pts, 25);
  };

  const S = data.seo, P = data.performance,
        A = data.accessibility, B = data.bestPractices;

  // ── SEO ────────────────────────────────────────────────────────────────────
  if (!S.title) {
    fail('seo','SEO','high','Missing <title> tag',
      'Every page needs a unique, descriptive title. It\'s the #1 on-page SEO signal and appears as the clickable headline in search results. Without it, Google auto-generates one from random page content.');
  } else if (S.titleLength < 30) {
    fail('seo','SEO','medium',`Title too short — ${S.titleLength} chars (target: 50–60)`,
      `Short titles miss keyword opportunities and look sparse in SERPs. Expand to 50–60 chars, leading with your primary keyword. You have ${60 - S.titleLength} characters of unused space.`);
  } else if (S.titleLength > 60) {
    fail('seo','SEO','low',`Title too long — ${S.titleLength} chars (Google truncates at 60)`,
      'Titles above ~60 chars get cut with "…" in search results. Trim to fit the key message. Every word should justify its place — remove filler like "| Home" or "Welcome to".');
  }

  if (!S.metaDescription) {
    fail('seo','SEO','high','Missing meta description',
      'Without a meta description, Google auto-generates a random excerpt — often a navigation item or footer text. Write a compelling 140–160 char description with a clear CTA. Good descriptions directly improve organic CTR.');
  } else if (S.metaDescriptionLength < 140) {
    fail('seo','SEO','medium',`Meta description too short — ${S.metaDescriptionLength} chars (target: 140–160)`,
      `You have ${160 - S.metaDescriptionLength} chars of unused SERP snippet space. Expand with: a benefit statement, a keyword, and a call-to-action like "Learn how" or "Get started". Under 140 chars leaves CTR on the table.`);
  } else if (S.metaDescriptionLength > 160) {
    fail('seo','SEO','low',`Meta description too long — ${S.metaDescriptionLength} chars (truncated at 160)`,
      'Google cuts descriptions at ~160 chars on desktop, ~120 on mobile. Put the critical message first; trim filler from the end.');
  }

  if (S.h1Count === 0) {
    fail('seo','SEO','high','No H1 heading found',
      'Every page needs exactly one H1 containing your primary keyword. H1 is the strongest on-page SEO signal after the title tag.');
  } else if (S.h1Count > 1) {
    fail('seo','SEO','medium',`${S.h1Count} H1 tags detected — should be exactly 1`,
      'Multiple H1s dilute keyword signals. Keep one H1 as your primary headline; use H2–H6 for sub-sections.');
  }

  if (S.h2Count === 0 && S.h1Count > 0) {
    fail('seo','SEO','low','No H2 headings found',
      'H2 headings define page sections and help Google index sub-topics. Add H2s to break content into logical sections.');
  }

  if (!S.headingHierarchyOk) {
    fail('seo','SEO','medium','Broken heading hierarchy (levels skipped)',
      'Heading levels must not skip (e.g., H1 → H3 without H2). This confuses both screen readers and crawlers about content structure.');
  }

  const hasOGFull = S.ogTitle && S.ogDescription && S.ogImage;
  const hasOGAny  = S.ogTitle || S.ogDescription || S.ogImage;
  if (!hasOGAny) {
    fail('seo','SEO','medium','No Open Graph meta tags found',
      'Without OG tags, social platforms auto-generate previews — wrong image, truncated text. Add og:title, og:description, og:image (1200×630px), og:url, og:type.');
  } else if (!hasOGFull) {
    const missing = [!S.ogTitle&&'og:title',!S.ogDescription&&'og:description',!S.ogImage&&'og:image'].filter(Boolean).join(', ');
    fail('seo','SEO','low',`Incomplete Open Graph tags — missing: ${missing}`,
      'Partial OG tags produce broken or inconsistent social cards. Use Facebook\'s Sharing Debugger to preview and validate.');
  }

  if (!S.canonical)
    fail('seo','SEO','low','No canonical tag',
      'Add <link rel="canonical"> to prevent duplicate content issues when the same page is accessible via multiple URLs.');

  if (!S.jsonLD)
    fail('seo','SEO','medium','No structured data (JSON-LD) found',
      'Structured data unlocks Rich Results — star ratings, FAQs, breadcrumbs. Start with Organization or Article schema. Validate at search.google.com/rich-results-test.');

  if (S.nonDescriptiveLinks > 0)
    fail('seo','SEO','low',`${S.nonDescriptiveLinks} non-descriptive link(s) ("click here", "here", "read more")`,
      'Vague anchor text misses SEO signals and harms screen reader users who navigate by link lists. Replace with descriptive text like "View pricing plans".');

  // ── Performance ───────────────────────────────────────────────────────────
  if (P.loadTime > 0) {
    if      (P.loadTime >= 4000) fail('perf','Performance','high',`Very slow page load: ${(P.loadTime/1000).toFixed(2)}s — target: <2s`,'Critically slow. 53% of mobile users abandon pages over 3s. Priority fixes: server caching, CDN, image compression, eliminate render-blocking resources.');
    else if (P.loadTime >= 2000) fail('perf','Performance','medium',`Slow page load: ${(P.loadTime/1000).toFixed(2)}s — target: <2s`,'Above the 2s recommended threshold. Quick wins: lazy-load images, code-split JS bundles, compress images (WebP/AVIF), enable gzip/Brotli, add a CDN.');
    else if (P.loadTime >= 1000) fail('perf','Performance','low',`Page load: ${(P.loadTime/1000).toFixed(2)}s — good, room to improve`,'Acceptable but not optimal. Target <1s. Improvements: preload critical fonts/CSS, preconnect to third-party origins, defer non-critical JS.');
  }

  if (P.ttfb > 0) {
    if      (P.ttfb >= 600) fail('perf','Performance','high',`High TTFB: ${P.ttfb}ms — target: <200ms`,'Server takes over 600ms before sending any data. Fix: server-side caching (Redis/Memcached), CDN, database query optimization, upgrade hosting tier.');
    else if (P.ttfb >= 200) fail('perf','Performance','medium',`TTFB: ${P.ttfb}ms — target: <200ms`,'Slow server response. Add HTTP cache headers (Cache-Control), use a reverse proxy (Nginx/Cloudflare), optimize slow server-side code.');
  }

  if      (P.renderBlockingScripts >= 4) fail('perf','Performance','high',`${P.renderBlockingScripts} render-blocking scripts — critical`,'Add defer to DOM-dependent scripts; async to independent ones. Move non-critical scripts after </body>. Each sync script costs full download time before any pixel paints.');
  else if (P.renderBlockingScripts >= 1) fail('perf','Performance','medium',`${P.renderBlockingScripts} render-blocking script(s)`,'Add async or defer. Use "defer" for scripts needing the DOM; "async" for truly independent scripts. Eliminating blocking scripts is often the highest-impact performance change.');

  if      (P.domSize >= 3000) fail('perf','Performance','high',`Excessive DOM: ${P.domSize.toLocaleString()} nodes — Google limit: 1,500`,'Solutions: virtual scrolling for lists, lazy-render below-fold sections via Intersection Observer, remove empty wrapper divs.');
  else if (P.domSize >= 1500) fail('perf','Performance','medium',`Large DOM: ${P.domSize.toLocaleString()} nodes — Google limit: 1,500`,'Consider pagination, infinite scroll with DOM recycling, or rendering off-screen content only when it enters the viewport.');

  if (P.totalImages >= 3) {
    const ratio = P.lazyImages / P.totalImages;
    if      (ratio < 0.3) fail('perf','Performance','medium',`Only ${P.lazyImages}/${P.totalImages} images use lazy loading`,`Add loading="lazy" to all below-fold images. Can reduce initial page weight by 40–70%.`);
    else if (ratio < 0.7) fail('perf','Performance','low',`${P.lazyImages}/${P.totalImages} images lazy loaded — could be higher`,`${P.totalImages - P.lazyImages} images still load eagerly. Add loading="lazy" to any non-hero image.`);
  }

  if (P.largeImagesCount > 0)
    fail('perf','Performance','medium',`${P.largeImagesCount} large image(s) detected (>200KB each)`,'Compress to WebP or AVIF (50–80% smaller). Serve correct dimensions. Tools: Squoosh.app, Cloudinary, or build-time optimization with sharp.');

  if (P.totalImages >= 3 && !P.hasWebP)
    fail('perf','Performance','low',`No WebP or next-gen images detected (${P.totalImages} images use legacy formats)`,'WebP is 25–34% smaller than JPEG at equivalent quality; AVIF up to 50% smaller. Use <picture> for format negotiation.');

  if      (P.scriptsCount > 20) fail('perf','Performance','medium',`${P.scriptsCount} external scripts — too many`,`Bundle with Vite/Webpack, audit third-party scripts, and load non-critical scripts on user interaction rather than page load.`);
  else if (P.scriptsCount > 12) fail('perf','Performance','low',`${P.scriptsCount} external scripts loaded`,'Consider bundling related scripts. Audit third-party scripts with a tag manager audit to find unused ones.');

  // ── Accessibility ─────────────────────────────────────────────────────────
  if (!A.langAttribute)
    fail('a11y','Accessibility','high','Missing lang attribute on <html>','Screen readers switch pronunciation engines based on lang. Without it, text-to-speech may be completely unintelligible. Required for WCAG 3.1.1 (Level A).');

  if (A.totalImages > 0 && A.imagesWithoutAlt > 0)
    fail('a11y','Accessibility','high',`${A.imagesWithoutAlt} of ${A.totalImages} image(s) missing alt attribute`,'For meaningful images: write descriptive alt text. For decorative images: use alt="" (empty string). Violates WCAG 1.1.1 (Level A).');

  if (A.poorAltCount > 0)
    fail('a11y','Accessibility','low',`${A.poorAltCount} image(s) with meaningless alt text (e.g., "image", "photo")`,'Generic alt text is worse than no alt — screen readers already announce "image". Write what the image conveys.');

  if (A.hasForms && A.inputsWithoutLabels > 0)
    fail('a11y','Accessibility','high',`${A.inputsWithoutLabels} form input(s) without proper labels`,'Unlabeled inputs are announced as "edit text" with zero context. Placeholder is NOT a label. Fix: <label for="inputId">, aria-label, or wrap in <label>. Violates WCAG 1.3.1 and 4.1.2.');

  if (A.buttonsWithoutText > 0)
    fail('a11y','Accessibility','high',`${A.buttonsWithoutText} button(s) without accessible text`,'Icon-only buttons are announced as "button" with no context. Add aria-label="Close dialog" to every icon button. Violates WCAG 4.1.2.');

  if (A.linksWithoutText > 0)
    fail('a11y','Accessibility','medium',`${A.linksWithoutText} link(s) without accessible text`,'Links with no text, no aria-label, and no linked image alt are announced as the URL. Add descriptive text or aria-label.');

  if (!A.hasSkipNav)
    fail('a11y','Accessibility','medium','No skip navigation link','Keyboard users must tab through every nav item on every page. Add <a href="#main-content">Skip to main content</a> as the first element. Required by WCAG 2.4.1.');

  if      (A.ariaLandmarks === 0) fail('a11y','Accessibility','medium','No semantic landmark regions found','Add <main>, <nav>, <header>, and <footer> to create navigable regions for screen reader users.');
  else if (A.ariaLandmarks < 3)   fail('a11y','Accessibility','low',`Limited landmarks — ${A.ariaLandmarks} found (recommend 3+)`,`Add more semantic regions: <main>, <nav>, <header>, <footer>, <aside>.`);

  if (A.tabindexAbuse > 0)
    fail('a11y','Accessibility','low',`${A.tabindexAbuse} element(s) with positive tabindex`,'Positive tabindex values create a custom tab order that breaks every time the page changes. Remove all tabindex="1+". Use tabindex="0" or "-1" only.');

  if (A.focusCssKilled || A.focusKilledInline > 0)
    fail('a11y','Accessibility','medium','Focus outline appears to be suppressed (outline: none detected)','Never remove focus indicators without replacing with a custom :focus-visible style. Violates WCAG 2.4.7 (Level AA).');

  // ── Best Practices ────────────────────────────────────────────────────────
  if (!B.isHttps)
    fail('bp','Best Practices','high','Site is not using HTTPS','HTTP is unencrypted and carries a Google ranking penalty. Get a free SSL certificate from Let\'s Encrypt. Set up HTTP→HTTPS 301 redirects and add the HSTS header.');

  if (B.mixedContent)
    fail('bp','Best Practices','high','Mixed content: HTTP resources on HTTPS page','Your HTTPS page loads HTTP resources — browsers block or warn about these, breaking your UI. Open Chrome DevTools Console to find the exact blocked URLs.');

  if (!B.hasViewportMeta)
    fail('bp','Best Practices','high','Missing viewport meta tag','Without <meta name="viewport" content="width=device-width, initial-scale=1">, your site renders as zoomed-out on mobile. This is the first step for responsive design.');

  if (!B.hasSemanticHTML)
    fail('bp','Best Practices','medium',`Low semantic HTML usage — only ${B.semanticTagsCount} semantic element type(s) found`,'Replace generic <div> containers: use <article>, <section>, <figure>/<figcaption>, <time>, <address>. Free accessibility and SEO upgrade.');

  if (B.deprecatedTags.length > 0)
    fail('bp','Best Practices','medium',`Deprecated HTML tags used: ${B.deprecatedTags.slice(0,5).join(', ')}`,`Replacements: <font> → CSS; <center> → CSS text-align; <b> → <strong>; <strike>/<s> → <del>; <marquee>/<blink> → CSS animations.`);

  if (B.externalLinksUnsafe > 0)
    fail('bp','Best Practices','medium',`${B.externalLinksUnsafe} external link(s) missing rel="noopener noreferrer"`,'External target="_blank" links without noopener allow the opened page to redirect yours (reverse tabnapping). Add rel="noopener noreferrer" to all external links.');

  if (!B.doctypePresent)
    fail('bp','Best Practices','medium','Missing DOCTYPE declaration','<!DOCTYPE html> must be the first line. Without it, browsers enter "quirks mode" — layout and JS behavior become unpredictable.');

  if (B.inlineEventHandlers > 0)
    fail('bp','Best Practices','low',`${B.inlineEventHandlers} inline event handler(s) found (onclick, onload, etc.)`,'Inline event handlers mix behavior with structure and violate CSP. Migrate to external JS using addEventListener().');

  if (!B.charsetMeta)
    fail('bp','Best Practices','low','Missing charset meta tag','Add <meta charset="UTF-8"> as the very first tag inside <head>. Without it, international characters may render as garbled text (mojibake).');

  if (!B.hasFavicon)
    fail('bp','Best Practices','low','No favicon found','Favicons appear in browser tabs, bookmarks, and mobile home screens. Minimum: <link rel="icon" href="/favicon.ico" sizes="32x32">.');

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

// ─── Suggestions ──────────────────────────────────────────────────────────────
function generateSuggestions(data, scores) {
  const S = data.seo, P = data.performance,
        A = data.accessibility, B = data.bestPractices;
  const sugs = [];
  const add = (pri, cat, title, detail, impact) => sugs.push({ pri, cat, title, detail, impact });

  if (!S.ogTitle || !S.ogImage)
    add('high','SEO','Implement Full Open Graph Protocol','Add og:title, og:description, og:image (1200×630px), og:url, og:type, og:site_name. This controls exactly how your page appears when shared on Facebook, LinkedIn, Slack, Discord, and WhatsApp. Complete OG tags increase social CTR by up to 40%. Use the Facebook Sharing Debugger to validate.','High');

  if (!S.jsonLD)
    add('high','SEO','Add JSON-LD Structured Data Markup','Add Schema.org JSON-LD in a <script type="application/ld+json"> tag. Choose your content type: Article, Product, LocalBusiness, FAQPage, HowTo, BreadcrumbList, or Organization. Rich Results can increase click-through rate by 20–30%. Validate at search.google.com/rich-results-test.','High');

  if (P.renderBlockingScripts > 0)
    add('high','Performance','Eliminate All Render-Blocking Scripts',`${P.renderBlockingScripts} script(s) are blocking page render. Rule: add defer to DOM-dependent scripts; async to independent ones (analytics, ads). Load third-party scripts on user interaction when possible. Use Chrome DevTools "Coverage" to find unused JS. One eliminated blocking script can improve FCP by 300–800ms.`,'High');

  if (P.totalImages >= 3 && (P.lazyImages / P.totalImages) < 0.5)
    add('high','Performance','Implement Lazy Loading + Modern Image Formats',`Add loading="lazy" to all ${P.totalImages - P.lazyImages} non-above-fold images. Also convert to WebP (25–34% smaller than JPEG) or AVIF (50% smaller). Use <picture> with srcset for responsive images. Tools: Squoosh.app (free), Cloudinary/Imgix, or Vite/Next.js built-in image optimization.`,'High');

  if (A.hasForms && A.inputsWithoutLabels > 0)
    add('high','Accessibility','Fix Form Accessibility to Meet WCAG 2.1 AA',`${A.inputsWithoutLabels} inputs have no programmatic labels — a critical WCAG failure. Three valid approaches: (1) <label for="inputId">, (2) aria-label="Email address", (3) wrap input inside <label>. Placeholder alone is NOT a label. Link error messages via aria-describedby for full compliance.`,'High');

  if (!B.isHttps)
    add('high','Security','Migrate to HTTPS Immediately','Use Let\'s Encrypt (free) via Certbot for auto-renewing SSL. After installing: update all internal links to HTTPS; add 301 redirects from HTTP; add HSTS header (Strict-Transport-Security: max-age=31536000; includeSubDomains).','High');

  if (!A.hasSkipNav)
    add('medium','Accessibility','Add Skip Navigation Link','Add <a href="#main-content" class="skip-link">Skip to main content</a> as the first element in <body>. Style it visually hidden until focused: .skip-link { position:absolute; transform:translateY(-100%); } .skip-link:focus { transform:translateY(0); } Required for WCAG 2.4.1 (Level A).','Medium');

  if (B.externalLinksUnsafe > 0)
    add('medium','Security','Secure All External Links',`${B.externalLinksUnsafe} external link(s) are vulnerable to reverse tabnapping. Add rel="noopener noreferrer" to every external link. "noopener" prevents window.opener access; "noreferrer" also hides your referrer from destination analytics.`,'Medium');

  if (!S.canonical)
    add('medium','SEO','Implement Canonical URLs Site-Wide','Add <link rel="canonical" href="https://example.com/exact-url"> to every page. Critical for e-commerce with faceted navigation (filters, sort, pagination all create duplicate URLs). Without canonicals, Google splits PageRank across URL variants.','Medium');

  if (!B.hasSemanticHTML)
    add('medium','Best Practices','Adopt Semantic HTML Elements',`Replace generic <div> and <span> containers with meaningful elements: <article> for blog posts/products, <section> for page regions, <figure>/<figcaption> for captioned images, <time datetime="..."> for dates. Semantic HTML is a free accessibility and SEO upgrade with zero performance cost.`,'Medium');

  if (P.domSize > 1500)
    add('medium','Performance','Reduce DOM Complexity',`Your DOM has ${P.domSize.toLocaleString()} elements. For long lists/tables: implement virtual scrolling (TanStack Virtual). For below-fold content: use Intersection Observer. Each 1,000 DOM nodes adds ~1.5ms to style recalculation — this compounds with every user interaction.`,'Medium');

  if (P.inlineStyles > 30)
    add('low','Performance','Extract Inline Styles to CSS Classes',`${P.inlineStyles} elements use inline styles — adding un-cacheable bytes to HTML. Move to CSS classes or a utility framework (Tailwind, UnoCSS). Benefits: CSS files are cached separately, styles become reusable, HTML is cleaner.`,'Low');

  if (A.tabindexAbuse > 0)
    add('low','Accessibility','Remove Positive tabindex Values','Positive tabindex values create a custom tab order that breaks every time the page evolves. Remove all tabindex="1+". Use tabindex="0" for natural tab order; tabindex="-1" for programmatic focus only.','Low');

  return sugs;
}

// ─── Render Results ───────────────────────────────────────────────────────────
function renderResults(scores, data) {
  document.getElementById('chipIssues').textContent = scores.issues.length;
  document.getElementById('chipSugg').textContent   = scores.suggestions.length;
  document.getElementById('footerInfo').textContent =
    `${scores.issues.length} issue${scores.issues.length !== 1 ? 's' : ''} found`;

  // Issues
  const issuesList = document.getElementById('issuesList');
  if (!scores.issues.length) {
    issuesList.innerHTML = emptyState('🎉', 'No issues detected!',
      'This page is in great shape across all audit categories.');
  } else {
    const sorted = [...scores.issues].sort((a, b) => {
      const o = { high: 0, medium: 1, low: 2 };
      return o[a.sev] - o[b.sev];
    });
    issuesList.innerHTML = quickWinsHTML(scores.quickWins) +
      sorted.map(issueCard).join('');
  }

  // Suggestions
  const suggestionsList = document.getElementById('suggestionsList');
  if (!scores.suggestions.length) {
    suggestionsList.innerHTML = emptyState('✨', 'No additional suggestions',
      'Your site is following web best practices well.');
  } else {
    suggestionsList.innerHTML = scores.suggestions.map(suggCard).join('');
  }

  renderDetails(data, scores);
  renderOverview(data);
}

// ─── Quick Wins ───────────────────────────────────────────────────────────────
function quickWinsHTML(wins) {
  if (!wins.length) return '';
  return `<div class="quick-wins">
    <div class="qw-header">🔥 Fix These First — Biggest Point Gains</div>
    ${wins.map(w => `
      <div class="qw-item">
        <span class="qw-pts">+${w.pts} pts</span>
        <span>${esc(w.title)}</span>
      </div>`).join('')}
  </div>`;
}

function issueCard(issue) {
  const icons    = { high: '🔴', medium: '🟡', low: '🔵' };
  const sevLabel = { high: 'High', medium: 'Medium', low: 'Low' };
  const bdgClass = { high: 'badge-critical', medium: 'badge-warning', low: 'badge-info' };
  return `
    <div class="issue-card">
      <div class="issue-badge ${bdgClass[issue.sev]}">${icons[issue.sev]}</div>
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
  return `
    <div class="suggestion-card">
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
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${esc(title)}</div>
    <div class="empty-sub">${esc(sub)}</div>
  </div>`;
}

// ─── Details Tab ──────────────────────────────────────────────────────────────
function renderDetails(data, scores) {
  const S = data.seo, P = data.performance,
        A = data.accessibility, B = data.bestPractices;
  const el = document.getElementById('detailsContent');

  const sec = (icon, label, scoreVal, rows) => `
    <div class="details-section">
      <div class="details-head">
        <span class="details-head-icon">${icon}</span>
        <span class="details-head-label">${label}</span>
        <span class="details-head-score" style="color:${scoreColor(scoreVal,25)}">${scoreVal}/25</span>
      </div>
      ${rows.map(([k, v, cls]) => `
        <div class="detail-row">
          <span class="detail-key">${esc(k)}</span>
          <span class="detail-val val-${cls}">${v}</span>
        </div>`).join('')}
    </div>`;

  const ltLabel = P.loadTime<=0?'N/A':P.loadTime<1000?`${(P.loadTime/1000).toFixed(2)}s — Fast ✓`:P.loadTime<2000?`${(P.loadTime/1000).toFixed(2)}s — OK`:P.loadTime<4000?`${(P.loadTime/1000).toFixed(2)}s — Slow ⚠`:`${(P.loadTime/1000).toFixed(2)}s — Critical ✗`;
  const ltCls   = P.loadTime<=0?'neu':P.loadTime<2000?'pass':P.loadTime<4000?'warn':'fail';
  const ttfbLabel = P.ttfb<=0?'N/A':P.ttfb<200?`${P.ttfb}ms — Excellent ✓`:P.ttfb<600?`${P.ttfb}ms — Slow ⚠ (target: <200ms)`:`${P.ttfb}ms — Critical ✗`;
  const ttfbCls   = P.ttfb<=0?'neu':P.ttfb<200?'pass':P.ttfb<600?'warn':'fail';
  const domLabel  = P.domSize<1500?`${P.domSize.toLocaleString()} — OK ✓`:P.domSize<3000?`${P.domSize.toLocaleString()} — Large ⚠ (limit: 1,500)`:`${P.domSize.toLocaleString()} — Excessive ✗`;
  const domCls    = P.domSize<1500?'pass':P.domSize<3000?'warn':'fail';

  el.innerHTML =
    sec('🔍','SEO',scores.seoScore,[
      ['Page Title', S.title?`"${S.title.slice(0,26)}${S.title.length>26?'…':''}"`:' ✗ Missing', S.title?(S.titleLength>=30&&S.titleLength<=60?'pass':'warn'):'fail'],
      ['Title Length', S.titleLength?`${S.titleLength} chars ${S.titleLength>=50&&S.titleLength<=60?'✓':S.titleLength>=30?'⚠ (50–60 ideal)':'✗ (too short)'}`:'N/A', S.titleLength>=50&&S.titleLength<=60?'pass':S.titleLength>=30?'warn':'fail'],
      ['Meta Description', S.metaDescription?`${S.metaDescriptionLength} chars ${S.metaDescriptionLength>=140&&S.metaDescriptionLength<=160?'✓':'⚠ (140–160 ideal)'}`:'✗ Missing', S.metaDescriptionLength>=140&&S.metaDescriptionLength<=160?'pass':S.metaDescriptionLength>0?'warn':'fail'],
      ['H1 / H2 / H3', `${S.h1Count} / ${S.h2Count} / ${S.h3Count}`, S.h1Count===1?'pass':S.h1Count===0?'fail':'warn'],
      ['Heading Hierarchy', S.headingHierarchyOk?'✓ Correct':'✗ Broken (levels skipped)', S.headingHierarchyOk?'pass':'fail'],
      ['Open Graph', (S.ogTitle&&S.ogDescription&&S.ogImage)?'✓ Complete':(S.ogTitle||S.ogDescription)?'⚠ Partial':'✗ Missing', (S.ogTitle&&S.ogDescription&&S.ogImage)?'pass':(S.ogTitle||S.ogDescription)?'warn':'fail'],
      ['Canonical Tag', S.canonical?'✓ Present':'⚠ Missing', S.canonical?'pass':'warn'],
      ['JSON-LD / Schema', S.jsonLD?'✓ Found':'⚠ Not found', S.jsonLD?'pass':'warn'],
      ['Internal / External', `${S.internalLinks} / ${S.externalLinks}`, 'neu'],
      ['Vague Link Text', `${S.nonDescriptiveLinks} ${S.nonDescriptiveLinks===0?'✓':'⚠'}`, S.nonDescriptiveLinks===0?'pass':'warn'],
    ]) +
    sec('⚡','Performance',scores.perfScore,[
      ['Page Load Time', ltLabel, ltCls],
      ['TTFB', ttfbLabel, ttfbCls],
      ['DOM Content Loaded', P.domContentLoaded>0?`${(P.domContentLoaded/1000).toFixed(2)}s`:'N/A', 'neu'],
      ['FCP', P.fcp>0?`${P.fcp}ms ${P.fcp<1800?'✓':P.fcp<3000?'⚠':'✗'}`:'N/A', P.fcp>0?(P.fcp<1800?'pass':P.fcp<3000?'warn':'fail'):'neu'],
      ['DOM Size', domLabel, domCls],
      ['External Scripts', `${P.scriptsCount} ${P.scriptsCount<=10?'✓':P.scriptsCount<=20?'⚠ Many':'✗ Too many'}`, P.scriptsCount<=10?'pass':P.scriptsCount<=20?'warn':'fail'],
      ['Render-Blocking', `${P.renderBlockingScripts} ${P.renderBlockingScripts===0?'✓':'✗'}`, P.renderBlockingScripts===0?'pass':'fail'],
      ['Lazy Images', `${P.lazyImages} / ${P.totalImages} ${P.totalImages>0&&P.lazyImages/P.totalImages>=0.7?'✓':'⚠'}`, P.totalImages===0||P.lazyImages/P.totalImages>=0.7?'pass':'warn'],
      ['Large Images >200KB', `${P.largeImagesCount} ${P.largeImagesCount===0?'✓':'⚠'}`, P.largeImagesCount===0?'pass':'warn'],
      ['WebP / Next-Gen', P.hasWebP?'✓ Detected':'⚠ None found', P.hasWebP?'pass':'warn'],
      ['Inline Styles', `${P.inlineStyles} ${P.inlineStyles<20?'✓':P.inlineStyles<80?'⚠':'✗'}`, P.inlineStyles<20?'pass':P.inlineStyles<80?'warn':'fail'],
    ]) +
    sec('♿','Accessibility',scores.a11yScore,[
      ['Language (lang="")', A.langAttribute?`✓ "${A.langAttribute}"`:' ✗ Missing', A.langAttribute?'pass':'fail'],
      ['Images Without Alt', A.totalImages>0?`${A.imagesWithoutAlt} of ${A.totalImages}`:'N/A (no images)', A.imagesWithoutAlt===0?'pass':'fail'],
      ['Poor Alt Text', `${A.poorAltCount} ${A.poorAltCount===0?'✓':'⚠'}`, A.poorAltCount===0?'pass':'warn'],
      ['Form Inputs', A.hasForms?`${A.inputsWithoutLabels} unlabeled`:'No forms found ✓', (!A.hasForms||A.inputsWithoutLabels===0)?'pass':'fail'],
      ['Buttons Without Text', `${A.buttonsWithoutText} ${A.buttonsWithoutText===0?'✓':'✗'}`, A.buttonsWithoutText===0?'pass':'fail'],
      ['Links Without Text', `${A.linksWithoutText} ${A.linksWithoutText===0?'✓':'⚠'}`, A.linksWithoutText===0?'pass':'warn'],
      ['Skip Navigation', A.hasSkipNav?'✓ Found':'⚠ Missing', A.hasSkipNav?'pass':'warn'],
      ['ARIA Landmarks', `${A.ariaLandmarks} ${A.ariaLandmarks>=3?'✓':A.ariaLandmarks>0?'⚠':'✗'}`, A.ariaLandmarks>=3?'pass':A.ariaLandmarks>0?'warn':'fail'],
      ['Positive tabindex', `${A.tabindexAbuse||0} ${(A.tabindexAbuse||0)===0?'✓':'⚠'}`, (A.tabindexAbuse||0)===0?'pass':'warn'],
      ['Focus Visibility', (A.focusCssKilled||A.focusKilledInline>0)?'✗ Suppressed':'✓ Appears intact', (A.focusCssKilled||A.focusKilledInline>0)?'fail':'pass'],
    ]) +
    sec('🛡️','Best Practices',scores.bpScore,[
      ['HTTPS', B.isHttps?'✓ Secure':'✗ Insecure', B.isHttps?'pass':'fail'],
      ['Mixed Content', B.mixedContent?'✗ Detected':'✓ Clean', B.mixedContent?'fail':'pass'],
      ['Viewport Meta', B.hasViewportMeta?'✓ Present':'✗ Missing', B.hasViewportMeta?'pass':'fail'],
      ['DOCTYPE', B.doctypePresent?'✓ HTML5':'✗ Missing', B.doctypePresent?'pass':'fail'],
      ['Charset Meta', B.charsetMeta?'✓ UTF-8':'⚠ Missing', B.charsetMeta?'pass':'warn'],
      ['Favicon', B.hasFavicon?'✓ Found':'⚠ Missing', B.hasFavicon?'pass':'warn'],
      ['Semantic HTML', `${B.semanticTagsCount} type(s) ${B.hasSemanticHTML?'✓':'⚠'}`, B.hasSemanticHTML?'pass':'warn'],
      ['Deprecated Tags', B.deprecatedTags.length===0?'✓ None':B.deprecatedTags.slice(0,3).join(', '), B.deprecatedTags.length===0?'pass':'warn'],
      ['Unsafe External Links', `${B.externalLinksUnsafe} ${B.externalLinksUnsafe===0?'✓':'⚠'}`, B.externalLinksUnsafe===0?'pass':'warn'],
      ['Inline Event Handlers', `${B.inlineEventHandlers} ${B.inlineEventHandlers===0?'✓':'⚠'}`, B.inlineEventHandlers===0?'pass':'warn'],
    ]);
}

// ─── OVERVIEW TAB RENDERER ────────────────────────────────────────────────────
function renderOverview(data) {
  const S  = data.seo;
  const OV = data.overview;

  renderOvSummary(S, OV);
  renderOvHeaders(OV);
  renderOvImages(OV);
  renderOvLinks(OV);
  renderOvSchema(OV);
}

// ── 1) Page Summary ────────────────────────────────────────────────────────────
function renderOvSummary(S, OV) {
  const el = document.getElementById('ovSummaryContent');

  const row = (key, val, cls = '') => `
    <div class="ov-meta-row">
      <span class="ov-meta-key">${key}</span>
      <span class="ov-meta-val ${cls}">${val}</span>
    </div>`;

  const titleVal = S.title
    ? `${esc(S.title)} <span style="color:#80868B;font-size:10px;font-weight:400;">(${S.titleLength} chars)</span>`
    : '<em>Missing title tag!</em>';
  const titleCls = S.title ? (S.titleLength >= 30 && S.titleLength <= 60 ? 'good' : 'warn') : 'missing';

  const descVal = S.metaDescription
    ? `${esc(S.metaDescription.slice(0, 120))}${S.metaDescription.length > 120 ? '…' : ''} <span style="color:#80868B;font-size:10px;font-weight:400;">(${S.metaDescriptionLength} chars)</span>`
    : 'Description is missing!';
  const descCls = S.metaDescription ? (S.metaDescriptionLength >= 140 && S.metaDescriptionLength <= 160 ? 'good' : 'warn') : 'missing';

  const kwVal  = OV.keywords  ? esc(OV.keywords.slice(0, 100)) : 'Keywords are missing!';
  const kwCls  = OV.keywords  ? '' : 'missing';
  const canVal = S.canonical  ? esc(S.canonical) : 'Canonical URL is not defined.';
  const canCls = S.canonical  ? 'good' : 'missing';
  const robVal = OV.robots    ? esc(OV.robots.toUpperCase()) : 'Not defined (defaults to index, follow)';
  const robCls = OV.robots    ? (OV.robots.toLowerCase().includes('noindex') ? 'warn' : '') : 'warn';
  const langVal= OV.lang      ? esc(OV.lang) : 'Not defined!';
  const langCls= OV.lang      ? 'good' : 'missing';

  // Stats row
  const statCell = (label, num, cls='') => `
    <div class="ov-stat-cell">
      <span class="ov-stat-label">${label}</span>
      <span class="ov-stat-num ${num === 0 ? 'zero' : ''} ${cls}">${num}</span>
    </div>`;

  const totalLinks = OV.totalLinks || (S.internalLinks + S.externalLinks + S.emptyLinks);

  el.innerHTML = `
    <div class="ov-meta-table">
      ${row('Title', titleVal, titleCls)}
      ${row('Description', descVal, descCls)}
      ${row('Keywords', kwVal, kwCls)}
      ${row('Canonical', canVal, canCls)}
      ${row('Robots Tag', robVal, robCls)}
      ${row('Language', langVal, langCls)}
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

// ── 2) Headers Tree ────────────────────────────────────────────────────────────
function renderOvHeaders(OV) {
  const el = document.getElementById('ovHeadersContent');
  const tree = OV.headingsTree || [];

  if (!tree.length) {
    el.innerHTML = `<div class="ov-empty">
      <div class="ov-empty-icon">📋</div>
      <div class="ov-empty-text">No headings found</div>
      <div class="ov-empty-sub">This page has no H1–H6 heading elements.</div>
    </div>`;
    return;
  }

  const tagColors = ['ov-h1','ov-h2','ov-h3','ov-h4','ov-h5','ov-h6'];

  const treeItems = tree.map(item => {
    const cls   = tagColors[item.level - 1] || 'ov-h6';
    const indent = item.level - 1;
    return `<div class="ov-tree-item" style="--indent:${indent}">
      <span class="ov-h-tag ${cls}">H${item.level}</span>
      <span class="ov-tree-text">${esc(item.text)}</span>
    </div>`;
  }).join('');

  const countCell = (lbl, num) => `
    <div class="ov-h-count-cell">
      <span class="ov-h-count-lbl">${lbl}</span>
      <span class="ov-h-count-num ${num===0?'none':''}">${num}</span>
    </div>`;

  el.innerHTML = `
    <div class="ov-tree-wrap">${treeItems}</div>
    <div class="ov-h-counts">
      ${countCell('H1', OV.h1Count)}
      ${countCell('H2', OV.h2Count)}
      ${countCell('H3', OV.h3Count)}
      ${countCell('H4', OV.h4Count)}
      ${countCell('H5', OV.h5Count)}
      ${countCell('H6', OV.h6Count)}
    </div>`;
}

// ── 3) Images ──────────────────────────────────────────────────────────────────
function renderOvImages(OV) {
  const el   = document.getElementById('ovImagesContent');
  const imgs = OV.imagesList || [];

  const toComplete = imgs.filter(i => !i.complete);
  const completed  = imgs.filter(i => i.complete);

  const attrVal = (val, present) => {
    if (!present && val === null) return `<span class="ov-img-attr-val miss">/ (missing)</span>`;
    if (!present && val === '')   return `<span class="ov-img-attr-val empty">/ (empty)</span>`;
    return `<span class="ov-img-attr-val ok">${esc((val || '').slice(0, 60))}</span>`;
  };

  const imgCard = (img) => `
    <div class="ov-img-card">
      <div class="ov-img-thumb">
        ${img.src ? `<img src="${esc(img.src)}" alt="" onerror="this.style.display='none';this.parentNode.textContent='🖼️'">` : '🖼️'}
      </div>
      <div class="ov-img-info">
        <div class="ov-img-filename" title="${esc(img.src)}">${esc(img.filename)}</div>
        <div class="ov-img-attrs">
          <span class="ov-img-attr">
            <span class="ov-img-attr-key">ALT:</span>
            ${attrVal(img.alt, img.hasAlt)}
          </span>
          <span class="ov-img-attr">
            <span class="ov-img-attr-key">Title:</span>
            ${attrVal(img.title || null, img.hasTitle)}
          </span>
        </div>
      </div>
    </div>`;

  const MAX_DISPLAY = 40;

  el.innerHTML = `
    <div class="ov-img-stats">
      <div class="ov-img-stat">
        <span class="ov-img-stat-label">Images</span>
        <span class="ov-img-stat-num neutral">${OV.imagesTotal}</span>
      </div>
      <div class="ov-img-stat">
        <span class="ov-img-stat-label">Without ALT</span>
        <span class="ov-img-stat-num ${OV.imagesWithoutAlt > 0 ? 'problem' : 'ok'}">${OV.imagesWithoutAlt}</span>
      </div>
      <div class="ov-img-stat">
        <span class="ov-img-stat-label">Without TITLE</span>
        <span class="ov-img-stat-num ${OV.imagesWithoutTitle > 0 ? 'problem' : 'ok'}">${OV.imagesWithoutTitle}</span>
      </div>
    </div>
    ${toComplete.length ? `
      <div class="ov-img-section">⚠ Images to Complete (${toComplete.length})</div>
      ${toComplete.slice(0, MAX_DISPLAY).map(imgCard).join('')}
      ${toComplete.length > MAX_DISPLAY ? `<div class="ov-truncate-note">… and ${toComplete.length - MAX_DISPLAY} more images need attention</div>` : ''}
    ` : ''}
    ${completed.length ? `
      <div class="ov-img-section">✓ Completed (${completed.length})</div>
      ${completed.slice(0, MAX_DISPLAY).map(imgCard).join('')}
      ${completed.length > MAX_DISPLAY ? `<div class="ov-truncate-note">… and ${completed.length - MAX_DISPLAY} more completed images</div>` : ''}
    ` : ''}
    ${!imgs.length ? `<div class="ov-empty">
      <div class="ov-empty-icon">🖼️</div>
      <div class="ov-empty-text">No images found</div>
      <div class="ov-empty-sub">This page contains no &lt;img&gt; elements.</div>
    </div>` : ''}`;
}

// ── 4) Links ───────────────────────────────────────────────────────────────────
function renderOvLinks(OV) {
  const el    = document.getElementById('ovLinksContent');
  const links = OV.linksList || [];

  // Sort: anchors first, then internal, then external
  const sorted = [...links].sort((a, b) => {
    const order = l => l.isAnchor ? 0 : l.isInternal ? 1 : 2;
    return order(a) - order(b) || b.count - a.count;
  });

  const badge = (link) => {
    if (link.isAnchor)   return `<span class="ov-link-badge badge-anchor">Anchor</span>`;
    if (link.isInternal) return `<span class="ov-link-badge badge-internal">Internal</span>`;
    return                      `<span class="ov-link-badge badge-external">External</span>`;
  };

  const MAX_DISPLAY = 60;

  const linkItem = (link) => {
    const displayHref = link.href.length > 55
      ? link.href.slice(0, 52) + '…'
      : link.href;
    return `<div class="ov-link-item">
      <div class="ov-link-row1">
        ${badge(link)}
        <span class="ov-link-href" title="${esc(link.href)}">${esc(displayHref)}</span>
      </div>
      <div class="ov-link-title">Title:
        ${link.title
          ? `<span class="ov-link-title-val">${esc(link.title)}</span>`
          : `<span class="ov-link-title-miss">not defined</span>`}
      </div>
      ${link.count > 1 ? `<div class="ov-link-occ">↩ Found ${link.count - 1} more occurrence${link.count > 2 ? 's' : ''} of this link</div>` : ''}
    </div>`;
  };

  el.innerHTML = `
    <div class="ov-link-stats">
      <div class="ov-link-stat">
        <span class="ov-link-stat-label">Links</span>
        <span class="ov-link-stat-num blue">${OV.totalLinks || 0}</span>
      </div>
      <div class="ov-link-stat">
        <span class="ov-link-stat-label">Unique</span>
        <span class="ov-link-stat-num blue">${OV.uniqueLinks || 0}</span>
      </div>
      <div class="ov-link-stat">
        <span class="ov-link-stat-label">Internal Unique</span>
        <span class="ov-link-stat-num blue">${OV.internalUniqueLinks || 0}</span>
      </div>
      <div class="ov-link-stat">
        <span class="ov-link-stat-label">Without Title</span>
        <span class="ov-link-stat-num ${OV.linksWithoutTitle > 0 ? 'warn' : 'blue'}">${OV.linksWithoutTitle || 0}</span>
      </div>
    </div>
    <div class="ov-links-label">Links &lt;A /&gt;</div>
    ${sorted.slice(0, MAX_DISPLAY).map(linkItem).join('')}
    ${sorted.length > MAX_DISPLAY ? `<div class="ov-truncate-note">Showing ${MAX_DISPLAY} of ${sorted.length} unique links</div>` : ''}
    ${!sorted.length ? `<div class="ov-empty">
      <div class="ov-empty-icon">🔗</div>
      <div class="ov-empty-text">No links found</div>
      <div class="ov-empty-sub">This page contains no anchor elements.</div>
    </div>` : ''}`;
}

// ── 5) Schema ──────────────────────────────────────────────────────────────────
function renderOvSchema(OV) {
  const el      = document.getElementById('ovSchemaContent');
  const schemas = OV.schemas || [];

  if (!schemas.length) {
    el.innerHTML = `
      <div class="ov-schema-stats">
        <div class="ov-schema-stat">
          <span class="ov-schema-stat-label">Schemas Found</span>
          <span class="ov-schema-stat-num none">0</span>
        </div>
        <div class="ov-schema-stat">
          <span class="ov-schema-stat-label">Types</span>
          <span class="ov-schema-stat-num none">—</span>
        </div>
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

  // JSON syntax highlighter
  function highlight(json) {
    return json
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        match => {
          if (/^"/.test(match)) {
            return /:$/.test(match)
              ? `<span class="json-key">${match}</span>`
              : `<span class="json-str">${match}</span>`;
          }
          if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
          if (/null/.test(match))       return `<span class="json-null">${match}</span>`;
          return `<span class="json-num">${match}</span>`;
        }
      );
  }

  // Export all schemas as one combined JSON file
  function exportAll() {
    const combined = schemas.map(s => s.parsed).filter(Boolean);
    const blob = new Blob(
      [JSON.stringify(combined.length === 1 ? combined[0] : combined, null, 2)],
      { type: 'application/json' }
    );
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `schema-all.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export single schema
  function exportSingle(schema) {
    const blob = new Blob(
      [JSON.stringify(schema.parsed, null, 2)],
      { type: 'application/json' }
    );
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `schema-${schema.type.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'data'}-${schema.index + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build schema blocks HTML
  const blocksHTML = schemas.map((schema, i) => {
    const hasError  = !!schema.error;
    const typeLabel = hasError ? 'Parse Error' : schema.type;
    const pretty    = !hasError ? JSON.stringify(schema.parsed, null, 2) : null;

    return `<div class="ov-schema-block">
      <div class="ov-schema-block-head">
        <div class="ov-schema-block-left">
          <span class="ov-schema-idx">#${i + 1}</span>
          <span class="ov-schema-type">${esc(typeLabel)}</span>
          <span class="ov-schema-type-tag ${hasError ? 'error' : ''}">
            ${hasError ? '⚠ Invalid JSON' : 'JSON-LD'}
          </span>
        </div>
        ${!hasError ? `<button class="ov-schema-export-btn" data-schema-idx="${i}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>` : ''}
      </div>
      ${hasError
        ? `<div class="ov-schema-error">⚠ JSON Parse Error: ${esc(schema.error)}<br><br><code>${esc(schema.raw.slice(0, 200))}${schema.raw.length > 200 ? '…' : ''}</code></div>`
        : `<div class="ov-schema-code" id="schema-code-${i}">${highlight(pretty)}</div>`
      }
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="ov-schema-stats">
      <div class="ov-schema-stat">
        <span class="ov-schema-stat-label">Schemas Found</span>
        <span class="ov-schema-stat-num found">${schemas.length}</span>
      </div>
      <div class="ov-schema-stat">
        <span class="ov-schema-stat-label">Valid</span>
        <span class="ov-schema-stat-num ${validCount === schemas.length ? 'found' : 'none'}">${validCount} / ${schemas.length}</span>
      </div>
      <div class="ov-schema-stat">
        <span class="ov-schema-stat-label">Types</span>
        <span class="ov-schema-stat-num found" style="font-size:10px;padding-top:3px">${esc(allTypes.slice(0, 30))}${allTypes.length > 30 ? '…' : ''}</span>
      </div>
    </div>
    ${blocksHTML}
    ${validCount > 1 ? `
      <div class="ov-export-all-wrap">
        <button class="ov-export-all-btn" id="exportAllSchemas">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export All Schemas
        </button>
      </div>` : ''}`;

  // Wire up per-schema export buttons
  el.querySelectorAll('[data-schema-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.schemaIdx);
      if (schemas[idx]) exportSingle(schemas[idx]);
    });
  });

  // Wire up export-all button
  const exportAllBtn = el.querySelector('#exportAllSchemas');
  if (exportAllBtn) exportAllBtn.addEventListener('click', exportAll);
}

// ─── Animations ───────────────────────────────────────────────────────────────
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

  const tick = (now) => {
    const p   = Math.min((now - t0) / dur, 1);
    const e   = 1 - Math.pow(1 - p, 3);
    scoreNum.textContent = Math.round(e * target);
    ringTrack.style.strokeDashoffset = CIRC - (e * target / 100) * CIRC;
    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
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
        document.getElementById(bar).style.width = `${(score / 25) * 100}%`;
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

// ─── Utils ────────────────────────────────────────────────────────────────────
function scoreColor(val, max) {
  const pct = val / max;
  if (pct >= 0.8) return '#1E8E3E';
  if (pct >= 0.6) return '#E37400';
  return '#D93025';
}
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
