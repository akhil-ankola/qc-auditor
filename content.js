// content.js — PagePulse v2.5.3  |  Phase 3: Broken Images + full audit
if (!window.__qcAuditorLoaded) {
  window.__qcAuditorLoaded = true;

  function collectAuditData() {
    const hostname = window.location.hostname;
    const data = {
      url: window.location.href,
      protocol: window.location.protocol,
      hostname,
      timestamp: Date.now(),
      seo: {}, performance: {}, accessibility: {}, bestPractices: {}, overview: {}
    };

    // ══════════════════════════════════════════════════════════════════
    //  SEO
    // ══════════════════════════════════════════════════════════════════
    const seo = data.seo;
    seo.title       = document.title || '';
    seo.titleLength = seo.title.length;

    seo.metaDescription = '';
    seo.ogTitle = ''; seo.ogDescription = ''; seo.ogImage = '';
    seo.ogType  = ''; seo.ogUrl = '';

    document.querySelectorAll('meta').forEach(m => {
      const name      = (m.getAttribute('name')     || '').toLowerCase();
      const prop      = (m.getAttribute('property') || '').toLowerCase();
      const httpEquiv = (m.getAttribute('http-equiv') || '').toLowerCase();
      const content   = m.getAttribute('content') || '';
      const charset   = m.getAttribute('charset');

      if (charset || httpEquiv === 'content-type') data.bestPractices.charsetMeta = true;
      if (name === 'description') seo.metaDescription = content;
      if (name === 'keywords')    data.overview.metaKeywords = content;
      if (name === 'robots')      data.overview.robots   = content;
      if (name === 'viewport') {
        seo.metaViewport = content;
        data.bestPractices.hasViewportMeta = true;
      }
      if (prop === 'og:title')       seo.ogTitle       = content;
      if (prop === 'og:description') seo.ogDescription = content;
      if (prop === 'og:image')       seo.ogImage       = content;
      if (prop === 'og:type')        seo.ogType        = content;
      if (prop === 'og:url')         seo.ogUrl         = content;
    });

    seo.metaDescriptionLength = seo.metaDescription.length;

    const canonEl = document.querySelector('link[rel="canonical"]');
    seo.canonical = canonEl ? (canonEl.getAttribute('href') || '') : '';

    seo.favicon = !!(document.querySelector(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    ));

    seo.h1Count = document.querySelectorAll('h1').length;
    seo.h2Count = document.querySelectorAll('h2').length;
    seo.h3Count = document.querySelectorAll('h3').length;
    seo.h4Count = document.querySelectorAll('h4').length;
    seo.h5Count = document.querySelectorAll('h5').length;
    seo.h6Count = document.querySelectorAll('h6').length;
    seo.h1Texts = [...document.querySelectorAll('h1')]
      .map(h => h.textContent.trim().slice(0, 80)).slice(0, 3);

    seo.headingHierarchyOk = true;
    let lastLevel = 0;
    for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const lvl = parseInt(h.tagName[1]);
      if (lastLevel > 0 && lvl > lastLevel + 1) { seo.headingHierarchyOk = false; break; }
      lastLevel = lvl;
    }

    // JSON-LD schemas (full content for Schema tab)
    const schemaScripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    seo.jsonLD = schemaScripts.length > 0;
    data.overview.schemas = schemaScripts.map((script, idx) => {
      const raw = (script.textContent || '').trim();
      let parsed = null, error = null;
      try { parsed = JSON.parse(raw); } catch (e) { error = e.message; }
      return {
        index: idx, raw, parsed, error,
        type: parsed
          ? (Array.isArray(parsed)
              ? parsed.map(p => p['@type']).filter(Boolean).join(', ')
              : (parsed['@type'] || 'Unknown'))
          : 'Parse Error'
      };
    });

    seo.totalImages = document.querySelectorAll('img').length;

    // Links
    seo.internalLinks = 0; seo.externalLinks = 0;
    seo.nonDescriptiveLinks = 0; seo.emptyLinks = 0; seo.linksWithTitle = 0;
    const VAGUE = new Set(['click here','here','read more','more','learn more','link','click','go','this','this link','details','info']);
    document.querySelectorAll('a').forEach(link => {
      const href  = link.getAttribute('href') || '';
      const text  = link.textContent.trim().toLowerCase();
      const title = link.getAttribute('title');
      if (title) seo.linksWithTitle++;
      if (!href || href === '#' || href.startsWith('javascript:')) { seo.emptyLinks++; return; }
      if (href.startsWith('http') && !href.includes(hostname)) { seo.externalLinks++; }
      else if (!href.startsWith('mailto:') && !href.startsWith('tel:')) { seo.internalLinks++; }
      if (text && VAGUE.has(text)) seo.nonDescriptiveLinks++;
    });

    // ══════════════════════════════════════════════════════════════════
    //  PERFORMANCE
    // ══════════════════════════════════════════════════════════════════
    const perf = data.performance;
    perf.scriptsCount          = document.querySelectorAll('script[src]').length;
    perf.stylesheetsCount      = document.querySelectorAll('link[rel="stylesheet"]').length;
    perf.totalImages           = seo.totalImages;
    perf.lazyImages            = document.querySelectorAll('img[loading="lazy"]').length;
    perf.domSize               = document.querySelectorAll('*').length;
    perf.inlineStyles          = document.querySelectorAll('[style]').length;
    perf.renderBlockingScripts = document.querySelectorAll('script[src]:not([async]):not([defer])').length;

    const webpSrc     = [...document.querySelectorAll('img[src]')]
      .filter(img => /\.webp(\?.*)?$/i.test(img.getAttribute('src') || '')).length;
    const webpSources = document.querySelectorAll('source[type="image/webp"]').length;
    perf.webpImagesCount = webpSrc + webpSources;
    perf.hasWebP = seo.totalImages === 0 || (perf.webpImagesCount / seo.totalImages) >= 0.3;

    perf.loadTime = 0; perf.domContentLoaded = 0; perf.ttfb = 0; perf.fcp = 0;
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        perf.loadTime         = Math.round(nav.loadEventEnd);
        perf.domContentLoaded = Math.round(nav.domContentLoadedEventEnd);
        perf.ttfb             = Math.round(nav.responseStart - nav.requestStart);
      }
    } catch (e) {}
    try {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcp) perf.fcp = Math.round(fcp.startTime);
    } catch (e) {}

    perf.totalResources = 0; perf.totalTransferSize = 0; perf.largeImagesCount = 0;
    try {
      const resources = performance.getEntriesByType('resource');
      perf.totalResources    = resources.length;
      perf.totalTransferSize = resources.reduce((s, r) => s + (r.transferSize || 0), 0);
      perf.largeImagesCount  = resources.filter(r => r.initiatorType === 'img' && (r.transferSize || 0) > 204800).length;
    } catch (e) {}

    // ══════════════════════════════════════════════════════════════════
    //  ACCESSIBILITY
    // ══════════════════════════════════════════════════════════════════
    const a11y = data.accessibility;
    a11y.langAttribute = document.documentElement.lang || '';
    a11y.totalImages   = seo.totalImages;
    a11y.imagesWithoutAlt = 0;
    if (seo.totalImages > 0) {
      document.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('alt')) a11y.imagesWithoutAlt++;
      });
    }

    const POOR_ALTS = new Set(['image','photo','picture','img','graphic','icon','logo','banner','thumbnail']);
    a11y.poorAltCount = 0;
    document.querySelectorAll('img[alt]').forEach(img => {
      const alt = (img.getAttribute('alt') || '').toLowerCase().trim();
      if (alt && POOR_ALTS.has(alt)) a11y.poorAltCount++;
    });

    a11y.hasForms = document.querySelector('form') !== null;
    a11y.inputsWithoutLabels = 0;
    if (a11y.hasForms) {
      const SKIP = new Set(['hidden','submit','button','reset','image']);
      document.querySelectorAll('input').forEach(input => {
        if (SKIP.has((input.type || '').toLowerCase())) return;
        const id = input.id;
        if (!( (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
               input.getAttribute('aria-label') || input.getAttribute('aria-labelledby') ||
               input.getAttribute('title') || input.closest('label') )) {
          a11y.inputsWithoutLabels++;
        }
      });
    }

    a11y.buttonsWithoutText = 0;
    document.querySelectorAll('button').forEach(btn => {
      if (!btn.textContent.trim() && !btn.getAttribute('aria-label') &&
          !btn.getAttribute('aria-labelledby') && !btn.getAttribute('title') &&
          !btn.querySelector('img[alt]') && !btn.querySelector('title')) {
        a11y.buttonsWithoutText++;
      }
    });

    a11y.linksWithoutText = 0;
    document.querySelectorAll('a[href]').forEach(link => {
      if (!link.textContent.trim() && !link.getAttribute('aria-label') &&
          !link.getAttribute('title') && !link.querySelector('img[alt]')) {
        a11y.linksWithoutText++;
      }
    });

    a11y.hasSkipNav = document.querySelectorAll([
      'a[href="#main"]','a[href="#content"]','a[href="#main-content"]',
      'a[href="#maincontent"]','.skip-nav','.skip-link',
      '.skip-to-content','[class*="skip-nav"]','[class*="skip-link"]'
    ].join(',')).length > 0;

    a11y.ariaLandmarks = document.querySelectorAll(
      'main,[role="main"],nav,[role="navigation"],header,[role="banner"],' +
      'footer,[role="contentinfo"],[role="complementary"],aside,[role="search"]'
    ).length;

    a11y.tabindexAbuse     = document.querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])').length;
    a11y.focusKilledInline = document.querySelectorAll('[style*="outline:none"],[style*="outline: none"],[style*="outline:0"],[style*="outline: 0"]').length;

    a11y.focusCssKilled = false;
    try {
      for (const sheet of document.styleSheets) {
        if (a11y.focusCssKilled) break;
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule.selectorText && rule.selectorText.includes(':focus') &&
                rule.style && (rule.style.outline === 'none' || rule.style.outline === '0')) {
              a11y.focusCssKilled = true; break;
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // ══════════════════════════════════════════════════════════════════
    //  BEST PRACTICES
    // ══════════════════════════════════════════════════════════════════
    const bp = data.bestPractices;
    bp.isHttps         = window.location.protocol === 'https:';
    bp.hasViewportMeta = bp.hasViewportMeta || !!seo.metaViewport;
    bp.hasFavicon      = seo.favicon;
    bp.charsetMeta     = bp.charsetMeta || false;
    bp.doctypePresent  = !!document.doctype;

    const SEMANTIC = ['article','section','aside','main','nav','header','footer','figure','figcaption','time','mark','details','summary','address'];
    bp.semanticTagsUsed  = SEMANTIC.filter(t => document.querySelectorAll(t).length > 0);
    bp.semanticTagsCount = bp.semanticTagsUsed.length;
    bp.hasSemanticHTML   = bp.semanticTagsCount >= 3;

    bp.deprecatedTags = [];
    ['center','font','strike','big','tt','frame','frameset','noframes','applet','basefont','blink','marquee'].forEach(tag => {
      if (document.querySelectorAll(tag).length > 0) bp.deprecatedTags.push(tag);
    });

    bp.externalLinksUnsafe = 0;
    document.querySelectorAll('a[href^="http"]').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!href.includes(hostname)) {
        const rel = (link.getAttribute('rel') || '').split(/\s+/);
        if (!rel.includes('noopener') && !rel.includes('noreferrer')) bp.externalLinksUnsafe++;
      }
    });

    bp.inlineEventHandlers = document.querySelectorAll(
      '[onclick],[onload],[onerror],[onmouseover],[onmouseout],[onkeypress],[onkeydown],[onkeyup],[onsubmit]'
    ).length;

    bp.mixedContent = false;
    if (bp.isHttps) {
      const httpRes = [...document.querySelectorAll('img[src],script[src],link[href],source[src],iframe[src]')]
        .filter(el => (el.getAttribute('src') || el.getAttribute('href') || '').startsWith('http:'));
      bp.mixedContent = httpRes.length > 0;
    }

    // ══════════════════════════════════════════════════════════════════
    //  OVERVIEW  (Summary, Headers, Images with Broken, Links, Schema)
    // ══════════════════════════════════════════════════════════════════
    const ov = data.overview;
    ov.metaKeywords = ov.metaKeywords || '';
    ov.robots       = ov.robots   || '';
    ov.lang         = a11y.langAttribute || '';

    // Heading tree
    ov.headingsTree = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({
      level: parseInt(h.tagName[1]),
      text:  h.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)
    })).slice(0, 400);

    ov.h1Count = seo.h1Count; ov.h2Count = seo.h2Count; ov.h3Count = seo.h3Count;
    ov.h4Count = seo.h4Count; ov.h5Count = seo.h5Count; ov.h6Count = seo.h6Count;

    // ── Images list — with broken detection ────────────────────────
    const POOR_ALTS_SET = new Set(['image','photo','picture','img','graphic','icon','logo','banner','thumbnail']);

    ov.imagesList = [...document.querySelectorAll('img')].map(img => {
      const rawSrc   = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      const src      = rawSrc.slice(0, 300);
      const filename = rawSrc.split('?')[0].split('/').filter(Boolean).pop() || rawSrc.slice(-40) || '(no src)';
      const altAttr  = img.getAttribute('alt');
      const titleAttr = img.getAttribute('title') || '';
      const hasAlt   = altAttr !== null && altAttr.trim().length > 0;
      const hasTitle = titleAttr.trim().length > 0;
      const poorAlt  = hasAlt && POOR_ALTS_SET.has((altAttr || '').toLowerCase().trim());

      // Format detection from src
      const cleanSrc = rawSrc.split('?')[0].toLowerCase();
      let format = 'OTHER';
      if      (cleanSrc.endsWith('.webp'))         format = 'WEBP';
      else if (cleanSrc.endsWith('.svg'))           format = 'SVG';
      else if (cleanSrc.endsWith('.avif'))          format = 'AVIF';
      else if (cleanSrc.endsWith('.png'))           format = 'PNG';
      else if (cleanSrc.endsWith('.jpg') || cleanSrc.endsWith('.jpeg')) format = 'JPG';
      else if (cleanSrc.endsWith('.gif'))           format = 'GIF';
      else if (cleanSrc.endsWith('.bmp'))           format = 'BMP';
      else if (cleanSrc.startsWith('data:image/webp'))  format = 'WEBP';
      else if (cleanSrc.startsWith('data:image/svg'))   format = 'SVG';
      else if (cleanSrc.startsWith('data:image/avif'))  format = 'AVIF';
      else if (cleanSrc.startsWith('data:image/png'))   format = 'PNG';
      else if (cleanSrc.startsWith('data:image/jpeg'))  format = 'JPG';

      // Broken image detection
      const isBroken = img.complete && img.naturalWidth === 0 && rawSrc.length > 0;

      return {
        src, filename: filename.slice(0, 80),
        alt: altAttr, title: titleAttr || '',
        hasAlt, hasTitle, poorAlt, format,
        complete: hasAlt && hasTitle && !isBroken,
        broken: isBroken,
        width:  img.naturalWidth  || img.getAttribute('width')  || 0,
        height: img.naturalHeight || img.getAttribute('height') || 0
      };
    }).slice(0, 250);

    ov.imagesTotal        = ov.imagesList.length;
    ov.imagesWithoutAlt   = ov.imagesList.filter(i => !i.hasAlt).length;
    ov.imagesWithoutTitle = ov.imagesList.filter(i => !i.hasTitle).length;
    ov.imagesBroken       = ov.imagesList.filter(i => i.broken).length;

    // Image format breakdown
    const fmtCount = {};
    ov.imagesList.forEach(img => { fmtCount[img.format] = (fmtCount[img.format] || 0) + 1; });
    ov.imageFormats = fmtCount;

    // ── Links list ────────────────────────────────────────────────
    const linksMap = new Map();
    let totalLinks = 0;
    document.querySelectorAll('a').forEach(link => {
      totalLinks++;
      const rawHref = (link.getAttribute('href') || '').trim();
      if (!rawHref) return;
      const title      = (link.getAttribute('title') || '').trim();
      const text       = link.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
      const isAnchor   = rawHref.startsWith('#');
      const isExternal = rawHref.startsWith('http') && !rawHref.includes(hostname);
      const isInternal = !isExternal && !isAnchor && !rawHref.startsWith('mailto:') && !rawHref.startsWith('tel:') && !rawHref.startsWith('javascript:');
      const href       = rawHref.slice(0, 200);
      if (linksMap.has(href)) {
        linksMap.get(href).count++;
        if (!linksMap.get(href).title && title) linksMap.get(href).title = title;
        if (!linksMap.get(href).text  && text)  linksMap.get(href).text  = text;
      } else {
        linksMap.set(href, { href, title, text, isInternal, isExternal, isAnchor, count: 1 });
      }
    });

    ov.linksList           = [...linksMap.values()].slice(0, 300);
    ov.totalLinks          = totalLinks;
    ov.uniqueLinks         = linksMap.size;
    ov.internalUniqueLinks = [...linksMap.values()].filter(l => l.isInternal).length;
    ov.linksWithoutTitle   = [...linksMap.values()].filter(l => !l.title).length;

    // ── Keywords extraction ────────────────────────────────────────
    const STOP_WORDS = new Set([
      'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
      'from','is','was','are','were','be','been','being','have','has','had','do',
      'does','did','will','would','could','should','may','might','must','can',
      'this','that','these','those','i','we','you','he','she','it','they','me',
      'us','him','her','them','my','our','your','his','its','their','what','which',
      'who','when','where','why','how','all','each','every','both','few','more',
      'most','some','such','no','not','only','same','so','than','too','very',
      'just','as','if','then','because','while','after','before','since','until',
      'into','through','over','any','also','about','up','out','there','here',
      'get','got','use','using','used','new','one','two','three','www','com',
      'http','https','nbsp','amp','quot','lt','gt','amp','copy','reg'
    ]);

    const kwMap     = new Map(); // word → {count, bold, italic}
    const biMap     = new Map(); // "w1 w2" → count
    const triMap    = new Map(); // "w1 w2 w3" → count
    let totalWords  = 0;

    // Prominence phrase sets (for bigram/trigram prominence)
    const titleText    = (document.title || '').toLowerCase();
    const h1Text       = [...document.querySelectorAll('h1')].map(h => h.textContent).join(' ').toLowerCase();
    const h2Text       = [...document.querySelectorAll('h2')].map(h => h.textContent).join(' ').toLowerCase();
    const metaDescText = (document.querySelector('meta[name="description"]')?.getAttribute('content') || '').toLowerCase();

    // Collect prominence signals (for unigrams)
    const titleWords    = new Set(titleText.match(/[a-z]{3,}/g) || []);
    const h1Words       = new Set(h1Text.match(/[a-z]{3,}/g) || []);
    const h2Words       = new Set(h2Text.match(/[a-z]{3,}/g) || []);
    const metaDescWords = new Set(metaDescText.match(/[a-z]{3,}/g) || []);

    // Walk visible text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const tag = node.parentElement?.tagName?.toLowerCase() || '';
          if (['script','style','noscript','code','pre'].includes(tag)) return NodeFilter.FILTER_REJECT;
          const style = node.parentElement ? window.getComputedStyle(node.parentElement) : null;
          if (style && style.display === 'none') return NodeFilter.FILTER_REJECT;
          if (style && style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const words = (node.textContent || '').toLowerCase().match(/[a-z]{3,}/g) || [];
      if (!words.length) continue;
      totalWords += words.length;

      // Check bold / italic context
      let el = node.parentElement;
      let isBold = false, isItalic = false;
      while (el && el !== document.body) {
        const tag = el.tagName?.toLowerCase();
        if (tag === 'strong' || tag === 'b') isBold   = true;
        if (tag === 'em'     || tag === 'i') isItalic = true;
        el = el.parentElement;
      }

      // ── Unigrams ──────────────────────────────────────────────────
      words.forEach(word => {
        if (STOP_WORDS.has(word) || word.length < 3) return;
        if (!kwMap.has(word)) kwMap.set(word, { count: 0, bold: false, italic: false });
        const kw = kwMap.get(word);
        kw.count++;
        if (isBold)   kw.bold   = true;
        if (isItalic) kw.italic = true;
      });

      // ── Bigrams — sliding window, skip all-stopword pairs ─────────
      for (let i = 0; i < words.length - 1; i++) {
        const w1 = words[i], w2 = words[i + 1];
        if (STOP_WORDS.has(w1) && STOP_WORDS.has(w2)) continue;
        if (w1.length < 3 || w2.length < 3) continue;
        const phrase = w1 + ' ' + w2;
        biMap.set(phrase, (biMap.get(phrase) || 0) + 1);
      }

      // ── Trigrams — sliding window, skip all-stopword triples ──────
      for (let i = 0; i < words.length - 2; i++) {
        const w1 = words[i], w2 = words[i + 1], w3 = words[i + 2];
        if (STOP_WORDS.has(w1) && STOP_WORDS.has(w2) && STOP_WORDS.has(w3)) continue;
        if (w1.length < 3 || w2.length < 3 || w3.length < 3) continue;
        const phrase = w1 + ' ' + w2 + ' ' + w3;
        triMap.set(phrase, (triMap.get(phrase) || 0) + 1);
      }
    }

    // ── Build unigram list ─────────────────────────────────────────
    ov.keywords = [...kwMap.entries()]
      .filter(([, v]) => v.count >= 2)
      .map(([word, v]) => {
        let prominence = 0;
        if (titleWords.has(word))    prominence += 5;
        if (h1Words.has(word))       prominence += 4;
        if (h2Words.has(word))       prominence += 3;
        if (metaDescWords.has(word)) prominence += 2;
        return {
          word,
          count:      v.count,
          density:    totalWords > 0 ? +((v.count / totalWords) * 100).toFixed(2) : 0,
          bold:       v.bold,
          italic:     v.italic,
          prominence
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 200);

    // ── Build bigram list ──────────────────────────────────────────
    const biProminence = phrase => {
      let p = 0;
      if (titleText.includes(phrase))    p += 5;
      if (h1Text.includes(phrase))       p += 4;
      if (h2Text.includes(phrase))       p += 3;
      if (metaDescText.includes(phrase)) p += 2;
      return p;
    };

    ov.bigrams = [...biMap.entries()]
      .filter(([, c]) => c >= 2)
      .map(([phrase, count]) => ({
        word: phrase, count,
        density:    totalWords > 0 ? +((count / (totalWords - 1)) * 100).toFixed(2) : 0,
        prominence: biProminence(phrase)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 150);

    // ── Build trigram list ─────────────────────────────────────────
    ov.trigrams = [...triMap.entries()]
      .filter(([, c]) => c >= 2)
      .map(([phrase, count]) => ({
        word: phrase, count,
        density:    totalWords > 0 ? +((count / (totalWords - 2)) * 100).toFixed(2) : 0,
        prominence: biProminence(phrase)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    ov.totalWordCount = totalWords;

    // ── Technology Detection — extract actual IDs/values ─────────
    const scripts    = [...document.querySelectorAll('script[src]')].map(s => s.src || '');
    const allSrcText = scripts.join(' ');
    const inlineText = [...document.querySelectorAll('script:not([src])')].map(s => s.textContent || '').join(' ');
    const fullText   = allSrcText + ' ' + inlineText;

    // Helper: extract first regex match from all script content
    const extract = (regex) => { const m = fullText.match(regex); return m ? m[1] || m[0] : null; };
    const hasSrc  = (str) => scripts.some(s => s.includes(str));
    const hasGlobal = (g) => { try { return typeof window[g] !== 'undefined'; } catch(e) { return false; } };

    // GTM — extract container ID (GTM-XXXXX)
    const gtmId = extract(/GTM-[A-Z0-9]+/) ||
                  (hasSrc('googletagmanager.com/gtm') ? 'Detected' : null) ||
                  (hasGlobal('google_tag_manager') ? Object.keys(window.google_tag_manager||{}).find(k=>k.startsWith('GTM-')) || 'Detected' : null);

    // GA4 — extract measurement ID (G-XXXXXXX)
    const ga4Id = extract(/['"](G-[A-Z0-9]+)['"]/) ||
                  (hasSrc('googletagmanager.com/gtag') ? extract(/G-[A-Z0-9]+/) : null);

    // Universal Analytics — extract UA-XXXXX-X
    const uaId = extract(/['"](UA-\d+-\d+)['"]/);

    // Google Analytics 4 via analytics.js
    const ga4OrUa = ga4Id || uaId || (hasSrc('google-analytics.com') ? 'Detected' : null);

    // Clarity — extract project ID
    const clarityId = extract(/clarity\s*\(\s*['"]init['"]\s*,\s*['"]([^'"]+)['"]/) ||
                      extract(/clarity\.ms\/tag\/([A-Za-z0-9]+)/) ||
                      (hasSrc('clarity.ms') || hasGlobal('clarity') ? 'Detected' : null);

    // Hotjar — extract site ID (hjid)
    const hotjarId = extract(/hjid['":\s]+(\d{5,})/) ||
                     extract(/hotjar\.com\/c\/(\d+)/) ||
                     (hasSrc('static.hotjar.com') || hasGlobal('hj') ? 'Detected' : null);

    // Google Ads — extract conversion ID (AW-XXXXXXXXX)
    const gadsId = extract(/['"](AW-\d+)['"]/) ||
                   (hasSrc('googleadservices.com') || hasSrc('googlesyndication.com') ? 'Detected' : null);

    // Meta Pixel — extract pixel ID
    const metaId = extract(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{10,})['"]/) ||
                   (hasSrc('connect.facebook.net') || hasGlobal('fbq') ? 'Detected' : null);

    // TikTok Pixel — extract pixel ID
    const tiktokId = extract(/ttq\.load\s*\(\s*['"]([A-Z0-9]{15,})['"]/) ||
                     (hasSrc('analytics.tiktok.com') || hasGlobal('ttq') ? 'Detected' : null);

    // LinkedIn Insight
    const linkedinId = extract(/_linkedin_partner_id\s*=\s*['"](\d+)['"]/) ||
                       (hasSrc('snap.licdn.com') ? 'Detected' : null);

    // WordPress — extract version
    const wpMeta = document.querySelector('meta[name="generator"][content*="WordPress"]');
    const wpVer  = wpMeta ? (wpMeta.getAttribute('content') || 'WordPress') :
                  (document.querySelector('link[rel="https://api.w.org/"]') ? 'WordPress' : null);

    // Shopify
    const shopifyVal = (window.Shopify?.shop || window.Shopify?.theme?.name) ||
                       (hasSrc('cdn.shopify.com') ? 'Detected' : null);

    // Wix
    const wixVal = hasSrc('static.wixstatic.com') ? 'Detected' : null;

    // Webflow
    const webflowVal = (hasSrc('webflow.com') || !!document.querySelector('[data-wf-site]'))
      ? (document.querySelector('[data-wf-site]')?.getAttribute('data-wf-site') || 'Detected') : null;

    // Next.js / React / Vue (framework hints)
    const nextVal   = hasSrc('/_next/') ? 'Detected' : null;
    const nuxtVal   = hasSrc('/_nuxt/') ? 'Detected' : null;

    ov.tech = [
      // Tag Managers
      { group: 'Tag Manager',         name: 'Google Tag Manager',  value: gtmId },
      // Analytics
      { group: 'Analytics',           name: 'Google Analytics',    value: ga4Id || uaId },
      { group: 'Analytics',           name: 'Microsoft Clarity',   value: clarityId },
      { group: 'Analytics',           name: 'Hotjar',              value: hotjarId },
      // Advertising & Pixels
      { group: 'Advertising & Pixels',name: 'Google Ads',          value: gadsId },
      { group: 'Advertising & Pixels',name: 'Meta Pixel',          value: metaId },
      { group: 'Advertising & Pixels',name: 'TikTok Pixel',        value: tiktokId },
      { group: 'Advertising & Pixels',name: 'LinkedIn Insight',    value: linkedinId },
      // CMS / Platform
      { group: 'CMS / Platform',      name: 'WordPress',           value: wpVer },
      { group: 'CMS / Platform',      name: 'Shopify',             value: shopifyVal },
      { group: 'CMS / Platform',      name: 'Wix',                 value: wixVal },
      { group: 'CMS / Platform',      name: 'Webflow',             value: webflowVal },
      // Frameworks
      { group: 'Framework',           name: 'Next.js',             value: nextVal },
      { group: 'Framework',           name: 'Nuxt.js',             value: nuxtVal },
    ];

    return data;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'collectData') {
      try { sendResponse({ success: true, data: collectAuditData() }); }
      catch (err) { sendResponse({ success: false, error: err.message }); }
    }
    if (request.action === 'activateFontInspector') {
      try {
        window.FontInspector.activate(request.property, request.showAllOnHover, request.showHex, request.hoverOnlyMode || false);
        sendResponse({ success: true });
      } catch (err) { sendResponse({ success: false, error: err.message }); }
    }
    if (request.action === 'removeFontLayers') {
      try { window.FontInspector.remove(); sendResponse({ success: true }); }
      catch (err) { sendResponse({ success: false, error: err.message }); }
    }
    if (request.action === 'toggleImageDownloader') {
      try {
        if (request.enabled) window.ImageDownloader.activate();
        else window.ImageDownloader.remove();
        sendResponse({ success: true });
      } catch (err) { sendResponse({ success: false, error: err.message }); }
    }
    if (request.action === 'getImageDownloaderState') {
      sendResponse({ active: !!window.__idActive__ });
    }
    return true;
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  FONT INSPECTOR ENGINE  (runs in the page context)
// ══════════════════════════════════════════════════════════════════════════════
if (!window.__FontInspectorLoaded) {
  window.__FontInspectorLoaded = true;

window.FontInspector = (() => {
  let styleEl        = null;
  let tooltip        = null;
  let currentProp    = null;
  let showAllOnHover = false;
  let showHex        = false;
  let boundMouseMove = null;
  let boundMouseLeave= null;
  let layers         = []; // { el, span, origPosition }

  // ─── Property config ──────────────────────────────────────────────────────
  const PROP_LABELS = {
    fontWeight:'Weight', fontSize:'Size', fontFamily:'Family',
    fontStyle:'Style', color:'Color', lineHeight:'Line H',
    letterSpacing:'Sp', textTransform:'TT', textDecoration:'TD'
  };

  const PROP_COLORS = {
    fontWeight:    ['#1A73E8','#E8F0FE'],
    fontSize:      ['#1E8E3E','#E6F4EA'],
    fontFamily:    ['#7B2FBE','#F3E8FD'],
    fontStyle:     ['#E37400','#FEF3E2'],
    color:         ['#D93025','#FCE8E6'],
    lineHeight:    ['#2E7D32','#E8F5E9'],
    letterSpacing: ['#E65100','#FFF3E0'],
    textTransform: ['#512DA8','#EDE7F6'],
    textDecoration:['#C2185B','#FCE4EC']
  };

  // ─── Value helpers ────────────────────────────────────────────────────────
  function getVal(el, prop) {
    const cs  = window.getComputedStyle(el);
    const key = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
    let raw   = cs.getPropertyValue(key) || cs[prop] || '';
    if (prop === 'textDecoration') raw = raw.split(' ')[0];
    if (prop === 'fontFamily')     raw = raw.split(',')[0].replace(/['"]/g,'').trim();
    if (prop === 'color' && showHex) return rgbToHex(raw);
    return raw || '—';
  }

  function rgbToHex(rgb) {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return rgb;
    return '#' + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('').toUpperCase();
  }

  function getAllVals(el) {
    const cs    = window.getComputedStyle(el);
    const color = showHex ? rgbToHex(cs.color) : cs.color;
    return [
      { label:'Weight',   val: cs.fontWeight },
      { label:'Size',     val: cs.fontSize },
      { label:'Family',   val: (cs.fontFamily||'').split(',')[0].replace(/['"]/g,'').trim() },
      { label:'Style',    val: cs.fontStyle },
      { label:'Color',    val: color },
      { label:'Line H',   val: cs.lineHeight },
      { label:'Sp',       val: cs.letterSpacing },
      { label:'TT',       val: cs.textTransform },
      { label:'TD',       val: cs.textDecoration.split(' ')[0] }
    ];
  }

  // ─── Inject shared styles ─────────────────────────────────────────────────
  function injectStyles() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = '__fi_styles__';
    styleEl.textContent = `
      .__fi_host__ {
        position: relative !important;
      }
      .__fi_div__ {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 1 !important;
        display: inline-flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 2px 7px !important;
        border-radius: 4px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
        text-decoration: none !important;
        box-shadow: 0 2px 6px rgba(0,0,0,.22) !important;
        border: 1px solid rgba(0,0,0,.08) !important;
        cursor: default !important;
        max-width: 200px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .__fi_div__ .__fi_lbl__ {
        display: inline-block !important;
        opacity: .7 !important;
        font-size: 9px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: .04em !important;
        flex-shrink: 0 !important;
      }
      .__fi_outline__ {
        outline: 1.5px dashed var(--fi-outline-color, #1A73E8) !important;
        outline-offset: 1px !important;
      }
      .__fi_color_swatch__ {
        display: inline-block !important;
        width: 10px !important;
        height: 10px !important;
        border-radius: 2px !important;
        border: 1px solid rgba(0,0,0,0.25) !important;
        flex-shrink: 0 !important;
        vertical-align: middle !important;
      }
      .__fi_tooltip__ .__fi_tt_swatch__ {
        display: inline-block !important;
        width: 11px !important;
        height: 11px !important;
        border-radius: 2px !important;
        border: 1px solid rgba(255,255,255,0.2) !important;
        flex-shrink: 0 !important;
        vertical-align: middle !important;
        margin-right: 4px !important;
      }
      .__fi_tooltip__ {
        position: fixed !important;
        z-index: 2147483647 !important;
        background: #1e1e2e !important;
        color: #e8eaed !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-size: 11px !important;
        font-weight: 400 !important;
        line-height: 1.6 !important;
        padding: 9px 12px !important;
        border-radius: 9px !important;
        box-shadow: 0 6px 24px rgba(0,0,0,.5) !important;
        pointer-events: none !important;
        max-width: 240px !important;
        white-space: nowrap !important;
        border: 1px solid #3a3a5c !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
        text-decoration: none !important;
        display: none !important;
      }
      .__fi_tooltip__.__fi_tt_visible__ { display: block !important; }
      .__fi_tooltip__ .__fi_tt_head__ {
        color: #8ab4f8 !important;
        font-weight: 700 !important;
        display: block !important;
        margin-bottom: 5px !important;
        font-size: 9.5px !important;
        text-transform: uppercase !important;
        letter-spacing: .07em !important;
      }
      .__fi_tooltip__ .__fi_tt_row__ {
        display: flex !important;
        justify-content: space-between !important;
        gap: 14px !important;
        margin-top: 2px !important;
      }
      .__fi_tooltip__ .__fi_tt_lbl__ {
        color: #9aa0a6 !important;
        font-size: 10px !important;
      }
      .__fi_tooltip__ .__fi_tt_val__ {
        color: #e8eaed !important;
        font-weight: 600 !important;
        font-size: 10.5px !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────
  function ensureTooltip() {
    if (tooltip && document.body.contains(tooltip)) return;
    tooltip = document.createElement('div');
    tooltip.className = '__fi_tooltip__';
    document.body.appendChild(tooltip);
  }

  function showTooltip(el, x, y) {
    ensureTooltip();
    const rows = showAllOnHover
      ? getAllVals(el)
      : [{ label: PROP_LABELS[currentProp] || currentProp, val: getVal(el, currentProp) }];
    let html = `<span class="__fi_tt_head__">Font Inspector</span>`;
    rows.forEach(r => {
      const isColorRow = r.label === 'Color' || (currentProp === 'color' && !showAllOnHover);
      const swatch = (isColorRow && r.val !== '—')
        ? `<span class="__fi_tt_swatch__" style="background:${r.val};"></span>`
        : '';
      html += `<div class="__fi_tt_row__">
        <span class="__fi_tt_lbl__">${r.label}</span>
        <span class="__fi_tt_val__">${swatch}${r.val}</span>
      </div>`;
    });
    tooltip.innerHTML = html;
    tooltip.classList.add('__fi_tt_visible__');
    requestAnimationFrame(() => {
      const tw = tooltip.offsetWidth  || 220;
      const th = tooltip.offsetHeight || 90;
      let left = x + 14, top = y + 14;
      if (left + tw > window.innerWidth  - 8) left = x - tw - 8;
      if (top  + th > window.innerHeight - 8) top  = y - th - 8;
      tooltip.style.left = left + 'px';
      tooltip.style.top  = top  + 'px';
    });
  }

  function hideTooltip() {
    if (tooltip) tooltip.classList.remove('__fi_tt_visible__');
  }

  // ─── Draw layers — viewport-only via IntersectionObserver ────────────────
  const TEXT_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, a, li, button, td, th, label, blockquote, figcaption, dt, dd, caption, div, span';

  let _fiObserver  = null;  // IntersectionObserver instance
  let _fiProp      = null;  // current active property
  let _fiFg        = '#333';
  let _fiBg        = '#eee';
  // Map from element → { origPosition, computedPos } for cleanup
  const _fiMeta    = new Map();

  function makeBadge(el) {
    const val = getVal(el, _fiProp);
    if (!val || val === '—') return null;

    const span = document.createElement('div');
    span.className = '__fi_div__';
    span.style.cssText = `color:${_fiFg} !important; background:${_fiBg} !important;`;
    const labelText  = PROP_LABELS[_fiProp] || _fiProp;
    const valText    = val.length > 26 ? val.slice(0, 24) + '…' : val;
    const swatchHtml = (_fiProp === 'color' && val !== '—')
      ? `<span class="__fi_color_swatch__" style="background:${val} !important;"></span>` : '';
    span.innerHTML = `<div class="__fi_lbl__">${labelText}</div>${swatchHtml}${valText}`;
    return span;
  }

  function showBadge(el) {
    // Already has a badge
    if (el.querySelector(':scope > .__fi_div__')) return;
    const span = makeBadge(el);
    if (!span) return;
    el.insertBefore(span, el.firstChild);
  }

  function hideBadge(el) {
    const span = el.querySelector(':scope > .__fi_div__');
    if (span) el.removeChild(span);
  }

  function drawLayers(prop) {
    clearLayers();
    _fiProp = prop;
    [_fiFg, _fiBg] = PROP_COLORS[prop] || ['#333', '#eee'];

    // Collect candidate elements and prepare them (outline + position)
    const candidates = [];
    document.querySelectorAll(TEXT_SELECTOR).forEach(el => {
      if (el.closest('.__fi_div__') || !el.textContent.trim()) return;
      // Only apply to elements that directly contain text (have at least one non-empty text node child)
      const hasDirectText = Array.from(el.childNodes).some(
        n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
      );
      if (!hasDirectText) return;
      const val = getVal(el, prop);
      if (!val || val === '—') return;

      const origPosition = el.style.position || '';
      const computedPos  = window.getComputedStyle(el).position;
      if (computedPos === 'static') {
        el.style.setProperty('position', 'relative', 'important');
      }
      el.classList.add('__fi_outline__');
      el.style.setProperty('--fi-outline-color', _fiFg);
      _fiMeta.set(el, { origPosition, computedPos });
      candidates.push(el);
      layers.push({ el });
    });

    if (!candidates.length) return;

    // IntersectionObserver: show badge when in viewport, hide when out
    _fiObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) showBadge(entry.target);
        else                      hideBadge(entry.target);
      });
    }, {
      rootMargin: '100px 0px 100px 0px', // 100px lookahead above/below
      threshold:  0
    });

    candidates.forEach(el => _fiObserver.observe(el));
  }

  function clearLayers() {
    // Stop observing
    if (_fiObserver) { _fiObserver.disconnect(); _fiObserver = null; }

    layers.forEach(({ el }) => {
      hideBadge(el);
      el.classList.remove('__fi_outline__');
      el.style.removeProperty('--fi-outline-color');
      const meta = _fiMeta.get(el);
      if (meta) {
        if (meta.computedPos === 'static') {
          if (meta.origPosition) el.style.position = meta.origPosition;
          else el.style.removeProperty('position');
        }
        _fiMeta.delete(el);
      }
    });
    layers  = [];
    _fiProp = null;
  }

  // ─── Hover listeners ──────────────────────────────────────────────────────
  function attachHover() {
    boundMouseMove = (e) => {
      const el = e.target;
      if (!el || el === tooltip || el.closest('.__fi_div__')) return;
      let target = el.matches(TEXT_SELECTOR) ? el : el.closest(TEXT_SELECTOR);
      // Only show tooltip on elements that directly contain text
      if (target) {
        const hasDirectText = Array.from(target.childNodes).some(
          n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
        );
        if (!hasDirectText) target = null;
      }
      if (target && !target.closest('.__fi_div__')) {
        showTooltip(target, e.clientX, e.clientY);
      } else {
        hideTooltip();
      }
    };
    boundMouseLeave = () => hideTooltip();
    document.addEventListener('mousemove',  boundMouseMove,  true);
    document.addEventListener('mouseleave', boundMouseLeave, true);
  }

  function detachHover() {
    if (boundMouseMove)  document.removeEventListener('mousemove',  boundMouseMove,  true);
    if (boundMouseLeave) document.removeEventListener('mouseleave', boundMouseLeave, true);
    boundMouseMove = boundMouseLeave = null;
    hideTooltip();
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  function activate(prop, allOnHover, hexColor, hoverOnlyMode) {
    currentProp    = prop;
    showAllOnHover = allOnHover;
    showHex        = hexColor;
    injectStyles();
    ensureTooltip();
    detachHover();
    if (hoverOnlyMode) {
      // Hover-only mode: no overlay labels on elements, just tooltip on hover
      clearLayers();
    } else {
      drawLayers(prop);
    }
    attachHover();
  }

  function remove() {
    detachHover();
    clearLayers();
    if (tooltip  && tooltip.parentNode)  { tooltip.remove();  tooltip  = null; }
    if (styleEl  && styleEl.parentNode)  { styleEl.remove();  styleEl  = null; }
    currentProp = null;
  }

  return { activate, remove };
})();

} // end __FontInspectorLoaded guard

// ══════════════════════════════════════════════════════════════════════════════
//  IMAGE DOWNLOADER ENGINE  (runs in the page context)
// ══════════════════════════════════════════════════════════════════════════════
if (!window.__ImageDownloaderLoaded) {
  window.__ImageDownloaderLoaded = true;

window.ImageDownloader = (() => {
  let styleEl    = null;
  let popup      = null;
  let hideTimer  = null;
  let currentEl  = null;
  let mutObs     = null;
  let imgListeners = [];
  let bgListeners  = [];
  let svgListeners = [];
  let currentSvgEl = null;

  // ── Inject popup styles into the page ────────────────────────────────────────
  function injectStyles() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = '__id_styles__';
    styleEl.textContent = `
      .__id_popup__ {
        position: fixed !important;
        z-index: 2147483647 !important;
        background: #1e1e2e !important;
        color: #e8eaed !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,.65) !important;
        border: 1px solid #3a3a5c !important;
        padding: 10px !important;
        width: 230px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-size: 12px !important;
        font-weight: 400 !important;
        line-height: 1.4 !important;
        pointer-events: auto !important;
        display: none !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
      }
      .__id_popup__.__id_visible__ {
        display: block !important;
        animation: __id_fadein__ .13s ease !important;
      }
      @keyframes __id_fadein__ {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .__id_thumb_wrap__ {
        width: 100% !important;
        height: 96px !important;
        border-radius: 7px !important;
        overflow: hidden !important;
        background: #12121e !important;
        margin-bottom: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .__id_thumb__ {
        max-width: 100% !important;
        max-height: 96px !important;
        object-fit: contain !important;
        display: block !important;
        border-radius: 4px !important;
      }
      .__id_preview_unavail__ {
        color: #6b7280 !important;
        font-size: 11px !important;
        font-family: inherit !important;
        text-align: center !important;
      }
      .__id_row__ {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 7px !important;
      }
      .__id_resolution__ {
        font-size: 13px !important;
        font-weight: 800 !important;
        color: #8ab4f8 !important;
        flex: 1 !important;
        font-family: inherit !important;
      }
      .__id_badge_hd__ {
        font-size: 9px !important;
        font-weight: 800 !important;
        background: #81c995 !important;
        color: #061006 !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        letter-spacing: .03em !important;
      }
      .__id_badge_bg__ {
        font-size: 9px !important;
        font-weight: 800 !important;
        background: #ffa94d !important;
        color: #1a0800 !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        letter-spacing: .03em !important;
      }
      .__id_sep__ {
        border: none !important;
        border-top: 1px solid #3a3a5c !important;
        margin: 7px 0 !important;
      }
      .__id_label__ {
        font-size: 9px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: .06em !important;
        color: #6b7280 !important;
        margin-bottom: 5px !important;
        display: block !important;
        font-family: inherit !important;
      }
      .__id_fmt_row__ {
        display: flex !important;
        gap: 4px !important;
      }
      .__id_btn__ {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        padding: 5px 9px !important;
        border-radius: 6px !important;
        border: 1px solid #3a3a5c !important;
        background: #28283e !important;
        color: #e8eaed !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        transition: background .12s, border-color .12s !important;
        white-space: nowrap !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
      }
      .__id_btn__:hover { background: #1A73E8 !important; border-color: #1A73E8 !important; color: #fff !important; }
      .__id_btn_primary__ { background: #1A73E8 !important; border-color: #1A73E8 !important; color: #fff !important; flex: 1 !important; }
      .__id_btn_primary__:hover { opacity: .85 !important; background: #1A73E8 !important; }
      .__id_btn_preview__ { background: #7B2FBE !important; border-color: #7B2FBE !important; color: #fff !important; flex: 1 !important; }
      .__id_btn_preview__:hover { opacity: .85 !important; background: #7B2FBE !important; }
      /* Hover outline on images */
      .__id_hover__ { outline: 2px solid #1A73E8 !important; outline-offset: 2px !important; }
      /* Preview modal */
      .__id_modal__ {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        background: rgba(0,0,0,.88) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-direction: column !important;
        gap: 14px !important;
        padding: 24px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        cursor: zoom-out !important;
      }
      .__id_modal_img__ {
        max-width: 90vw !important;
        max-height: 80vh !important;
        object-fit: contain !important;
        border-radius: 10px !important;
        box-shadow: 0 20px 60px rgba(0,0,0,.8) !important;
        cursor: default !important;
        display: block !important;
      }
      .__id_modal_info__ {
        color: #9aa0a6 !important;
        font-size: 12px !important;
        font-family: inherit !important;
        text-align: center !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
      }
      .__id_modal_bar__ {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
      }
      .__id_modal_btn__ {
        padding: 8px 20px !important;
        border-radius: 8px !important;
        border: none !important;
        font-family: inherit !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        transition: opacity .15s !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
      }
      .__id_modal_btn__:hover { opacity: .82 !important; }
      .__id_modal_dl__    { background: #1A73E8 !important; color: #fff !important; }
      .__id_modal_close__ { background: #3a3a5c !important; color: #e8eaed !important; }
    `;
    document.head.appendChild(styleEl);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function escAttr(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function filenameFrom(src) {
    return src.split('?')[0].split('/').filter(Boolean).pop() || 'image';
  }

  function parseBgUrl(el) {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') return null;
    const m = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    return m ? m[1] : null;
  }

  function detectHD(imgEl) {
    const srcset = imgEl.getAttribute('srcset') || imgEl.getAttribute('data-srcset') || '';
    if (!srcset) return null;
    let best = { url: null, w: 0 };
    srcset.split(',').forEach(part => {
      const [url, desc] = part.trim().split(/\s+/);
      if (!url) return;
      const w = desc ? (parseFloat(desc) || 0) : 1;
      if (w > best.w) best = { url: url.trim(), w };
    });
    return best.url && best.w > 1 ? best.url : null;
  }

  function getResolution(src, cb) {
    const img = new Image();
    img.onload  = () => cb(img.naturalWidth, img.naturalHeight);
    img.onerror = () => cb(null, null);
    img.src = src;
  }

  function downloadOriginal(src, filename) {
    fetch(src, { mode: 'cors' })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click();
        document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 2000);
      })
      .catch(() => {
        const a = document.createElement('a');
        a.href = src; a.download = filename; a.target = '_blank';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      });
  }

  function downloadConverted(src, fmt, filename) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || 300;
        canvas.height = img.naturalHeight || 300;
        const ctx = canvas.getContext('2d');
        if (fmt === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0);
        const mimes = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
        canvas.toBlob(blob => {
          if (!blob) { downloadOriginal(src, filename); return; }
          const url  = URL.createObjectURL(blob);
          const ext  = fmt === 'jpeg' ? 'jpg' : fmt;
          const base = filename.replace(/\.[^.]+$/, '');
          const a    = document.createElement('a');
          a.href = url; a.download = `${base}.${ext}`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }, mimes[fmt] || 'image/png', 0.95);
      } catch (_) { downloadOriginal(src, filename); }
    };
    img.onerror = () => downloadOriginal(src, filename);
    img.src = src;
  }

  // ── Inline SVG helpers ────────────────────────────────────────────────────────
  function serializeSVG(svgEl) {
    const clone = svgEl.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(clone);
  }

  function svgToDataURI(svgEl) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serializeSVG(svgEl));
  }

  function svgIntrinsicSize(svgEl) {
    const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
    const w  = (vb && vb.width)  || parseFloat(svgEl.getAttribute('width'))  || 0;
    const h  = (vb && vb.height) || parseFloat(svgEl.getAttribute('height')) || 0;
    if (w && h) return { w: Math.round(w), h: Math.round(h) };
    const rect = svgEl.getBoundingClientRect();
    return { w: Math.round(rect.width) || 64, h: Math.round(rect.height) || 64 };
  }

  function downloadSVGDirect(svgEl, filename) {
    const blob = new Blob([serializeSVG(svgEl)], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const name = filename.replace(/\.[^.]+$/, '') + '.svg';
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadSVGConverted(svgEl, fmt, filename) {
    const { w, h } = svgIntrinsicSize(svgEl);
    const dataUri  = svgToDataURI(svgEl);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (fmt === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        const mimes = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
        canvas.toBlob(blob => {
          if (!blob) return;
          const url  = URL.createObjectURL(blob);
          const ext  = fmt === 'jpeg' ? 'jpg' : fmt;
          const base = filename.replace(/\.[^.]+$/, '');
          const a    = document.createElement('a');
          a.href = url; a.download = `${base}.${ext}`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }, mimes[fmt] || 'image/png', 0.95);
      } catch (_) {}
    };
    img.src = dataUri;
  }

  // ── Popup ─────────────────────────────────────────────────────────────────────
  function buildPopup() {
    popup = document.createElement('div');
    popup.className = '__id_popup__';
    popup.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    popup.addEventListener('mouseleave', scheduleHide);
    // Delegated click handler — handles both URL images and inline SVGs
    popup.addEventListener('click', e => {
      const btn = e.target.closest('[data-id-action]');
      if (!btn) return;
      const action   = btn.dataset.idAction;
      const filename = popup.dataset.filename;
      if (popup.dataset.mode === 'svg' && currentSvgEl) {
        if      (action === 'dl-orig')  downloadSVGDirect(currentSvgEl, filename);
        else if (action === 'dl-png')   downloadSVGConverted(currentSvgEl, 'png',  filename);
        else if (action === 'dl-jpeg')  downloadSVGConverted(currentSvgEl, 'jpeg', filename);
        else if (action === 'dl-webp')  downloadSVGConverted(currentSvgEl, 'webp', filename);
        else if (action === 'preview')  openPreviewSVG(currentSvgEl, filename);
      } else {
        const src = popup.dataset.src;
        if (!src) return;
        if      (action === 'dl-orig')  downloadOriginal(src, filename);
        else if (action === 'dl-svg')   downloadOriginal(src, filename); // SVG original
        else if (action === 'dl-png')   downloadConverted(src, 'png',  filename);
        else if (action === 'dl-jpeg')  downloadConverted(src, 'jpeg', filename);
        else if (action === 'dl-webp')  downloadConverted(src, 'webp', filename);
        else if (action === 'preview')  openPreview(src, filename);
      }
    });
    document.body.appendChild(popup);
  }

  function showFor(el, src, isBg) {
    if (!popup) buildPopup();
    currentEl = el;

    const isSvgSrc = /\.svg(\?|$)/i.test(src) || src.startsWith('data:image/svg');
    const filename  = filenameFrom(src);
    popup.dataset.src      = src;
    popup.dataset.filename = filename;
    popup.dataset.mode     = '';

    // Position flush against the element — no gap so mouse can reach popup
    const rect = el.getBoundingClientRect();
    const pw = 230, ph = 290;
    let top  = rect.bottom;
    let left = rect.left;
    if (left + pw > window.innerWidth  - 8) left = window.innerWidth  - pw - 8;
    if (top  + ph > window.innerHeight - 4) top  = rect.top - ph;
    if (left < 8) left = 8;
    if (top  < 4) top  = 4;
    popup.style.top  = `${top}px`;
    popup.style.left = `${left}px`;

    popup.innerHTML = `
      <div class="__id_thumb_wrap__" id="__id_tw__">
        <img class="__id_thumb__" src="${escAttr(src)}" alt="" id="__id_timg__">
      </div>
      <div class="__id_row__">
        <span class="__id_resolution__" id="__id_res__">Detecting…</span>
        ${isBg ? '<span class="__id_badge_bg__">BG Image</span>' : ''}
      </div>
      <hr class="__id_sep__">
      <div class="__id_row__">
        <button class="__id_btn__ __id_btn_primary__" data-id-action="dl-orig">↓ Download Original</button>
        <button class="__id_btn__ __id_btn_preview__" data-id-action="preview">🔍 Preview</button>
      </div>
      <hr class="__id_sep__">
      <span class="__id_label__">${isSvgSrc ? 'Download / convert:' : 'Download as format:'}</span>
      <div class="__id_fmt_row__">
        ${isSvgSrc ? '<button class="__id_btn__" data-id-action="dl-svg">SVG</button>' : ''}
        <button class="__id_btn__" data-id-action="dl-png">PNG</button>
        <button class="__id_btn__" data-id-action="dl-jpeg">JPG</button>
        <button class="__id_btn__" data-id-action="dl-webp">WEBP</button>
      </div>`;

    popup.classList.add('__id_visible__');

    // Thumbnail error → fallback text
    const timg = popup.querySelector('#__id_timg__');
    const tw   = popup.querySelector('#__id_tw__');
    if (timg) timg.addEventListener('error', () => {
      if (tw) tw.innerHTML = '<span class="__id_preview_unavail__">Preview unavailable</span>';
    });

    // Load resolution
    getResolution(src, (w, h) => {
      const resEl = popup.querySelector('#__id_res__');
      if (!resEl) return;
      if (w && h) {
        resEl.textContent = `${w} × ${h} px`;
        // HD badge for <img> with srcset
        if (!isBg) {
          const hdUrl = detectHD(el);
          if (hdUrl) resEl.insertAdjacentHTML('afterend', ' <span class="__id_badge_hd__">HD Available</span>');
        }
      } else {
        resEl.textContent = 'Size unknown';
      }
    });
  }

  function scheduleHide() {
    hideTimer = setTimeout(() => {
      if (popup) { popup.classList.remove('__id_visible__'); popup.dataset.mode = ''; }
      if (currentEl)    { currentEl.classList.remove('__id_hover__');    currentEl    = null; }
      if (currentSvgEl) { currentSvgEl.classList.remove('__id_hover__'); currentSvgEl = null; }
    }, 400);
  }

  // ── Preview modal ─────────────────────────────────────────────────────────────
  function openPreview(src, filename) {
    let modal = document.querySelector('.__id_modal__');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.className = '__id_modal__';
    modal.innerHTML = `
      <img class="__id_modal_img__" src="${escAttr(src)}" alt="" id="__id_mimg__">
      <div class="__id_modal_info__" id="__id_minfo__">Loading…</div>
      <div class="__id_modal_bar__">
        <button class="__id_modal_btn__ __id_modal_dl__"    id="__id_mdl__">↓ Download</button>
        <button class="__id_modal_btn__ __id_modal_close__" id="__id_mclose__">✕ Close</button>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#__id_mclose__').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#__id_mdl__').addEventListener('click', () => downloadOriginal(src, filename));
    modal.querySelector('#__id_mimg__').addEventListener('load', e => {
      const info = modal.querySelector('#__id_minfo__');
      if (info) info.textContent = `${e.target.naturalWidth} × ${e.target.naturalHeight} px  ·  ${filename}`;
    });
    const escHandler = e => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  // ── Inline SVG popup and modal ────────────────────────────────────────────────
  function showForSVG(svgEl) {
    if (!popup) buildPopup();
    currentSvgEl        = svgEl;
    currentEl           = svgEl;
    popup.dataset.mode  = 'svg';
    const { w, h }      = svgIntrinsicSize(svgEl);
    const svgId         = svgEl.getAttribute('id') || svgEl.getAttribute('aria-label') || '';
    const filename      = (svgId ? svgId.replace(/[^a-z0-9_-]/gi, '-') : 'svg-icon') + '.svg';
    popup.dataset.filename = filename;
    const thumbSrc      = svgToDataURI(svgEl);

    const rect = svgEl.getBoundingClientRect();
    const pw   = 230, ph = 290;
    let top  = rect.bottom, left = rect.left;
    if (left + pw > window.innerWidth  - 8) left = window.innerWidth  - pw - 8;
    if (top  + ph > window.innerHeight - 4) top  = rect.top - ph;
    if (left < 8) left = 8; if (top < 4) top = 4;
    popup.style.top = `${top}px`; popup.style.left = `${left}px`;

    popup.innerHTML = `
      <div class="__id_thumb_wrap__">
        <img class="__id_thumb__" src="${escAttr(thumbSrc)}" alt="">
      </div>
      <div class="__id_row__">
        <span class="__id_resolution__">${w && h ? `${w} × ${h} px` : 'SVG (scalable)'}</span>
        <span class="__id_badge_bg__">SVG</span>
      </div>
      <hr class="__id_sep__">
      <div class="__id_row__">
        <button class="__id_btn__ __id_btn_primary__" data-id-action="dl-orig">↓ Download SVG</button>
        <button class="__id_btn__ __id_btn_preview__" data-id-action="preview">🔍 Preview</button>
      </div>
      <hr class="__id_sep__">
      <span class="__id_label__">Rasterize &amp; download:</span>
      <div class="__id_fmt_row__">
        <button class="__id_btn__" data-id-action="dl-png">PNG</button>
        <button class="__id_btn__" data-id-action="dl-jpeg">JPG</button>
        <button class="__id_btn__" data-id-action="dl-webp">WEBP</button>
      </div>`;
    popup.classList.add('__id_visible__');
  }

  function openPreviewSVG(svgEl, filename) {
    let modal = document.querySelector('.__id_modal__');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.className = '__id_modal__';
    const { w, h } = svgIntrinsicSize(svgEl);
    const thumbSrc = svgToDataURI(svgEl);
    modal.innerHTML = `
      <img class="__id_modal_img__" src="${escAttr(thumbSrc)}" alt="">
      <div class="__id_modal_info__">${w && h ? `${w} × ${h} px  ·  ` : ''}${filename}</div>
      <div class="__id_modal_bar__">
        <button class="__id_modal_btn__ __id_modal_dl__"    id="__id_mdl__">↓ Download SVG</button>
        <button class="__id_modal_btn__ __id_modal_close__" id="__id_mclose__">✕ Close</button>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#__id_mclose__').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#__id_mdl__').addEventListener('click', () => downloadSVGDirect(svgEl, filename));
    const escH = e => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escH); } };
    document.addEventListener('keydown', escH);
  }

  // ── Attach / detach listeners ─────────────────────────────────────────────────
  function attachImg(img) {
    if (img.__idAttached__) return;
    img.__idAttached__ = true;
    const onEnter = () => {
      clearTimeout(hideTimer);
      const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
      if (!src) return;
      img.classList.add('__id_hover__');
      showFor(img, src, false);
    };
    const onLeave = () => { img.classList.remove('__id_hover__'); scheduleHide(); };
    img.addEventListener('mouseenter', onEnter);
    img.addEventListener('mouseleave', onLeave);
    imgListeners.push({ el: img, onEnter, onLeave });
  }

  function attachBg(el) {
    if (el.__idBgAttached__) return;
    const src = parseBgUrl(el);
    if (!src) return;
    el.__idBgAttached__ = true;
    const onEnter = () => {
      clearTimeout(hideTimer);
      el.classList.add('__id_hover__');
      showFor(el, src, true);
    };
    const onLeave = () => { el.classList.remove('__id_hover__'); scheduleHide(); };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    bgListeners.push({ el, src, onEnter, onLeave });
  }

  function attachSVG(svgEl) {
    if (svgEl.__idSvgAttached__) return;
    // Skip SVGs inside our own UI or those that are tiny decorative marks (<4px)
    if (svgEl.closest('.__id_popup__') || svgEl.closest('.__id_modal__')) return;
    const rect = svgEl.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    svgEl.__idSvgAttached__ = true;
    const onEnter = () => { clearTimeout(hideTimer); svgEl.classList.add('__id_hover__'); showForSVG(svgEl); };
    const onLeave = () => { svgEl.classList.remove('__id_hover__'); scheduleHide(); };
    svgEl.addEventListener('mouseenter', onEnter);
    svgEl.addEventListener('mouseleave', onLeave);
    svgListeners.push({ el: svgEl, onEnter, onLeave });
  }

  const BG_CANDIDATES = 'div,section,figure,article,aside,header,footer,main,span,a,li,td,th';

  function scanAll() {
    document.querySelectorAll('img').forEach(attachImg);
    document.querySelectorAll(BG_CANDIDATES).forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) attachBg(el);
    });
    // Inline <svg> elements (icons, illustrations)
    document.querySelectorAll('svg').forEach(attachSVG);
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  function activate() {
    window.__idActive__ = true;
    injectStyles();
    if (!popup) buildPopup();
    scanAll();
    mutObs = new MutationObserver(() => scanAll());
    mutObs.observe(document.body, { childList: true, subtree: true });
  }

  function remove() {
    window.__idActive__ = false;
    if (mutObs) { mutObs.disconnect(); mutObs = null; }
    clearTimeout(hideTimer);
    if (popup) { popup.remove(); popup = null; }
    const modal = document.querySelector('.__id_modal__');
    if (modal) modal.remove();
    imgListeners.forEach(({ el, onEnter, onLeave }) => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.__idAttached__ = false;
      el.classList.remove('__id_hover__');
    });
    bgListeners.forEach(({ el, onEnter, onLeave }) => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.__idBgAttached__ = false;
      el.classList.remove('__id_hover__');
    });
    svgListeners.forEach(({ el, onEnter, onLeave }) => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.__idSvgAttached__ = false;
      el.classList.remove('__id_hover__');
    });
    imgListeners = [];
    bgListeners  = [];
    svgListeners = [];
    if (styleEl) { styleEl.remove(); styleEl = null; }
    currentEl = null; currentSvgEl = null;
  }

  return { activate, remove };
})();

} // end __ImageDownloaderLoaded guard
