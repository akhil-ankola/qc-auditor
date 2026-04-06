// content.js — QC Auditor v2.0  |  Phase 3: Broken Images + full audit
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

    const kwMap    = new Map(); // word → {count, bold, italic}
    let totalWords = 0;

    // Collect prominence signals
    const titleWords    = new Set((document.title || '').toLowerCase().match(/[a-z]{3,}/g) || []);
    const h1Words       = new Set([...document.querySelectorAll('h1')].join(' ').toLowerCase().match(/[a-z]{3,}/g) || []);
    const h2Words       = new Set([...document.querySelectorAll('h2')].map(h => h.textContent).join(' ').toLowerCase().match(/[a-z]{3,}/g) || []);
    const metaDescWords = new Set((document.querySelector('meta[name="description"]')?.getAttribute('content') || '').toLowerCase().match(/[a-z]{3,}/g) || []);

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

      // Check if this text node is inside bold / italic
      let el = node.parentElement;
      let isBold   = false;
      let isItalic = false;
      while (el && el !== document.body) {
        const tag = el.tagName?.toLowerCase();
        if (tag === 'strong' || tag === 'b') isBold = true;
        if (tag === 'em' || tag === 'i')     isItalic = true;
        el = el.parentElement;
      }

      words.forEach(word => {
        if (STOP_WORDS.has(word) || word.length < 3) return;
        if (!kwMap.has(word)) kwMap.set(word, { count: 0, bold: false, italic: false });
        const kw = kwMap.get(word);
        kw.count++;
        if (isBold)   kw.bold   = true;
        if (isItalic) kw.italic = true;
      });
    }

    // Build keyword list with prominence
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

    ov.totalWordCount = totalWords;

    // ── Technology Detection — extract actual IDs/values ─────────
    const scripts    = [...document.querySelectorAll('script[src]')].map(s => s.src || '');
    const allSrcText = scripts.join(' ');
    const inlineText = [...document.querySelectorAll('script:not([src])')].map(s => s.textContent || '').join(' ');
    const fullText   = allSrcText + ' ' + inlineText;

    // Helper: extract first regex match from all script content
    const extract = (regex) => { const m = fullText.match(regex); return m ? m[1] || m[0] : null; };
    const hasSrc  = (str) => scripts.some(s => s.includes(str));
    const hasGlobal = (g) => { try { return typeof eval(`window.${g}`) !== 'undefined'; } catch(e) { return false; } };

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
    return true;
  });
}
