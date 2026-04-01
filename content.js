// content.js — QC Auditor Phase 2  |  Smart, conditional, no-duplicate audits
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
    //  SEO  (lang & altText NOT here — source of truth is A11y)
    // ══════════════════════════════════════════════════════════════════
    const seo = data.seo;
    seo.title       = document.title || '';
    seo.titleLength = seo.title.length;

    // Meta tags
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
      if (name === 'keywords')    data.overview.keywords = content;
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

    // Canonical
    const canonEl = document.querySelector('link[rel="canonical"]');
    seo.canonical = canonEl ? (canonEl.getAttribute('href') || '') : '';

    // Favicon
    seo.favicon = !!(document.querySelector(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    ));

    // Headings
    seo.h1Count = document.querySelectorAll('h1').length;
    seo.h2Count = document.querySelectorAll('h2').length;
    seo.h3Count = document.querySelectorAll('h3').length;
    seo.h4Count = document.querySelectorAll('h4').length;
    seo.h5Count = document.querySelectorAll('h5').length;
    seo.h6Count = document.querySelectorAll('h6').length;
    seo.h1Texts = [...document.querySelectorAll('h1')]
      .map(h => h.textContent.trim().slice(0, 80)).slice(0, 3);

    // Heading hierarchy
    seo.headingHierarchyOk = true;
    let lastLevel = 0;
    for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const lvl = parseInt(h.tagName[1]);
      if (lastLevel > 0 && lvl > lastLevel + 1) { seo.headingHierarchyOk = false; break; }
      lastLevel = lvl;
    }

    // Structured data
    // Structured data — collect full content for Schema tab
    const schemaScripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    seo.jsonLD = schemaScripts.length > 0;

    data.overview.schemas = schemaScripts.map((script, idx) => {
      const raw = (script.textContent || '').trim();
      let parsed = null;
      let error  = null;
      try { parsed = JSON.parse(raw); } catch (e) { error = e.message; }
      return {
        index: idx,
        raw,
        parsed,
        error,
        type: parsed ? (Array.isArray(parsed) ? parsed.map(p => p['@type']).filter(Boolean).join(', ') : (parsed['@type'] || 'Unknown')) : 'Parse Error'
      };
    });

    // Image count
    seo.totalImages = document.querySelectorAll('img').length;

    // Links analysis
    seo.internalLinks       = 0;
    seo.externalLinks       = 0;
    seo.nonDescriptiveLinks = 0;
    seo.emptyLinks          = 0;
    seo.linksWithTitle      = 0;

    const VAGUE_TEXTS = new Set([
      'click here','here','read more','more','learn more',
      'link','click','go','this','this link','details','info'
    ]);

    document.querySelectorAll('a').forEach(link => {
      const href  = link.getAttribute('href') || '';
      const text  = link.textContent.trim().toLowerCase();
      const title = link.getAttribute('title');
      if (title) seo.linksWithTitle++;
      if (!href || href === '#' || href.startsWith('javascript:')) {
        seo.emptyLinks++;
        return;
      }
      if (href.startsWith('http') && !href.includes(hostname)) {
        seo.externalLinks++;
      } else if (!href.startsWith('mailto:') && !href.startsWith('tel:')) {
        seo.internalLinks++;
      }
      if (text && VAGUE_TEXTS.has(text)) seo.nonDescriptiveLinks++;
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
    perf.renderBlockingScripts = document.querySelectorAll(
      'script[src]:not([async]):not([defer])'
    ).length;
    perf.scriptsWithoutAsyncDefer = perf.renderBlockingScripts;

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
      perf.largeImagesCount  = resources.filter(
        r => r.initiatorType === 'img' && (r.transferSize || 0) > 204800
      ).length;
    } catch (e) {}

    // ══════════════════════════════════════════════════════════════════
    //  ACCESSIBILITY  (source of truth for lang + alt)
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

    a11y.hasForms            = document.querySelector('form') !== null;
    a11y.inputsWithoutLabels = 0;
    if (a11y.hasForms) {
      const SKIP_TYPES = new Set(['hidden','submit','button','reset','image']);
      document.querySelectorAll('input').forEach(input => {
        if (SKIP_TYPES.has((input.type || '').toLowerCase())) return;
        const id          = input.id;
        const hasLabelFor = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
        const hasAriaLabel = input.getAttribute('aria-label');
        const hasAriaBy    = input.getAttribute('aria-labelledby');
        const hasTitle     = input.getAttribute('title');
        const inLabel      = !!input.closest('label');
        if (!hasLabelFor && !hasAriaLabel && !hasAriaBy && !hasTitle && !inLabel) {
          a11y.inputsWithoutLabels++;
        }
      });
    }

    a11y.buttonsWithoutText = 0;
    document.querySelectorAll('button').forEach(btn => {
      if (!btn.textContent.trim() &&
          !btn.getAttribute('aria-label') && !btn.getAttribute('aria-labelledby') &&
          !btn.getAttribute('title') && !btn.querySelector('img[alt]') && !btn.querySelector('title')) {
        a11y.buttonsWithoutText++;
      }
    });

    a11y.linksWithoutText = 0;
    document.querySelectorAll('a[href]').forEach(link => {
      if (!link.textContent.trim() &&
          !link.getAttribute('aria-label') && !link.getAttribute('title') &&
          !link.querySelector('img[alt]')) {
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
    a11y.focusKilledInline = document.querySelectorAll(
      '[style*="outline:none"],[style*="outline: none"],[style*="outline:0"],[style*="outline: 0"]'
    ).length;

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

    const SEMANTIC_TAGS = [
      'article','section','aside','main','nav','header','footer',
      'figure','figcaption','time','mark','details','summary','address'
    ];
    bp.semanticTagsUsed  = SEMANTIC_TAGS.filter(t => document.querySelectorAll(t).length > 0);
    bp.semanticTagsCount = bp.semanticTagsUsed.length;
    bp.hasSemanticHTML   = bp.semanticTagsCount >= 3;

    bp.deprecatedTags = [];
    ['center','font','strike','big','tt','frame','frameset',
     'noframes','applet','basefont','blink','marquee'].forEach(tag => {
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
      const httpResources = [...document.querySelectorAll(
        'img[src],script[src],link[href],source[src],iframe[src]'
      )].filter(el => {
        const src = el.getAttribute('src') || el.getAttribute('href') || '';
        return src.startsWith('http:');
      });
      bp.mixedContent = httpResources.length > 0;
    }

    // ══════════════════════════════════════════════════════════════════
    //  OVERVIEW  (Page Summary, Headers Tree, Images List, Links List)
    // ══════════════════════════════════════════════════════════════════
    const ov = data.overview;

    // keywords & robots already set in meta loop above
    ov.keywords = ov.keywords || '';
    ov.robots   = ov.robots   || '';
    ov.lang     = a11y.langAttribute || '';

    // Heading tree — full structure for visual display
    ov.headingsTree = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .map(h => ({
        level: parseInt(h.tagName[1]),
        text:  h.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)
      }))
      .slice(0, 400);

    ov.h1Count = seo.h1Count;
    ov.h2Count = seo.h2Count;
    ov.h3Count = seo.h3Count;
    ov.h4Count = seo.h4Count || 0;
    ov.h5Count = seo.h5Count || 0;
    ov.h6Count = seo.h6Count || 0;

    // Images list — for Overview Images tab
    ov.imagesList = [...document.querySelectorAll('img')].map(img => {
      const rawSrc  = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      const src     = rawSrc.slice(0, 300);
      // Extract just the filename from the path
      const filename = rawSrc.split('?')[0].split('/').filter(Boolean).pop() || rawSrc.slice(-40) || '(no src)';
      const altAttr  = img.getAttribute('alt');   // null = attribute missing entirely
      const titleAttr = img.getAttribute('title') || '';
      const hasAlt   = altAttr !== null && altAttr.trim().length > 0;
      const hasTitle = titleAttr.trim().length > 0;
      return {
        src, filename: filename.slice(0, 80),
        alt:   altAttr,          // null = missing, '' = empty, string = value
        title: titleAttr || '',
        hasAlt, hasTitle,
        complete: hasAlt && hasTitle
      };
    }).slice(0, 250);

    ov.imagesTotal        = ov.imagesList.length;
    ov.imagesWithoutAlt   = ov.imagesList.filter(i => !i.hasAlt).length;
    ov.imagesWithoutTitle = ov.imagesList.filter(i => !i.hasTitle).length;

    // Links list — deduplicated with occurrence counts
    const linksMap = new Map();
    let totalLinks = 0;

    document.querySelectorAll('a').forEach(link => {
      totalLinks++;
      const rawHref = (link.getAttribute('href') || '').trim();
      if (!rawHref) return;
      const title    = (link.getAttribute('title') || '').trim();
      const text     = link.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
      const isAnchor = rawHref.startsWith('#');
      const isExternal = rawHref.startsWith('http') && !rawHref.includes(hostname);
      const isInternal = !isExternal && !isAnchor &&
                         !rawHref.startsWith('mailto:') &&
                         !rawHref.startsWith('tel:') &&
                         !rawHref.startsWith('javascript:');
      const href = rawHref.slice(0, 200);

      if (linksMap.has(href)) {
        linksMap.get(href).count++;
        // Update title if we found one
        if (!linksMap.get(href).title && title) linksMap.get(href).title = title;
        if (!linksMap.get(href).text  && text)  linksMap.get(href).text  = text;
      } else {
        linksMap.set(href, { href, title, text, isInternal, isExternal, isAnchor, count: 1 });
      }
    });

    ov.linksList            = [...linksMap.values()].slice(0, 300);
    ov.totalLinks           = totalLinks;
    ov.uniqueLinks          = linksMap.size;
    ov.internalUniqueLinks  = [...linksMap.values()].filter(l => l.isInternal).length;
    ov.linksWithoutTitle    = [...linksMap.values()].filter(l => !l.title).length;

    return data;
  }

  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'collectData') {
      try { sendResponse({ success: true, data: collectAuditData() }); }
      catch (err) { sendResponse({ success: false, error: err.message }); }
    }
    return true;
  });
}
