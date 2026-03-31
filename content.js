// content.js — QC Auditor data collection script
// Guard against multiple injections
if (!window.__qcAuditorLoaded) {
  window.__qcAuditorLoaded = true;

  function collectAuditData() {
    const data = {
      url: window.location.href,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      timestamp: Date.now(),
      seo: {},
      performance: {},
      accessibility: {},
      bestPractices: {}
    };

    // ═══════════════════ SEO ═════════════════════════════════════
    const seo = data.seo;
    seo.title           = document.title || '';
    seo.titleLength     = seo.title.length;
    seo.metaDescription = '';
    seo.metaKeywords    = '';
    seo.metaRobots      = '';
    seo.metaViewport    = '';
    seo.ogTitle         = '';
    seo.ogDescription   = '';
    seo.ogImage         = '';
    seo.ogType          = '';
    seo.ogUrl           = '';
    seo.twitterCard     = '';
    seo.twitterTitle    = '';
    seo.canonical       = '';
    seo.lang            = document.documentElement.lang || '';
    seo.h1Count         = document.querySelectorAll('h1').length;
    seo.h2Count         = document.querySelectorAll('h2').length;
    seo.h3Count         = document.querySelectorAll('h3').length;
    seo.h1Texts         = [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 80)).slice(0, 3);
    seo.jsonLD          = document.querySelectorAll('script[type="application/ld+json"]').length > 0;
    seo.totalImages     = document.querySelectorAll('img').length;
    seo.imagesWithoutAlt = 0;
    seo.internalLinks   = 0;
    seo.externalLinks   = 0;
    seo.favicon         = false;

    // Meta tags
    document.querySelectorAll('meta').forEach(m => {
      const name     = (m.getAttribute('name')     || '').toLowerCase();
      const prop     = (m.getAttribute('property') || '').toLowerCase();
      const httpEquiv= (m.getAttribute('http-equiv') || '').toLowerCase();
      const content  = m.getAttribute('content') || '';
      const charset  = m.getAttribute('charset');

      if (charset || httpEquiv === 'content-type') data.bestPractices.charsetMeta = true;

      switch (name) {
        case 'description': seo.metaDescription = content; break;
        case 'keywords':    seo.metaKeywords    = content; break;
        case 'robots':      seo.metaRobots      = content; break;
        case 'viewport':    seo.metaViewport    = content; data.bestPractices.hasViewportMeta = true; break;
      }
      switch (prop) {
        case 'og:title':       seo.ogTitle       = content; break;
        case 'og:description': seo.ogDescription = content; break;
        case 'og:image':       seo.ogImage       = content; break;
        case 'og:type':        seo.ogType        = content; break;
        case 'og:url':         seo.ogUrl         = content; break;
      }
      if (name === 'twitter:card')  seo.twitterCard  = content;
      if (name === 'twitter:title') seo.twitterTitle = content;
    });

    seo.metaDescriptionLength = seo.metaDescription.length;

    // Canonical
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) seo.canonical = canonicalEl.getAttribute('href') || '';

    // Favicon
    seo.favicon = !!(document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'));

    // Images
    document.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('alt')) seo.imagesWithoutAlt++;
    });

    // Links
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        seo.externalLinks++;
      } else if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
        seo.internalLinks++;
      }
    });

    // ═══════════════════ PERFORMANCE ══════════════════════════════
    const perf = data.performance;
    perf.loadTime            = 0;
    perf.domContentLoaded    = 0;
    perf.scriptsCount        = document.querySelectorAll('script[src]').length;
    perf.inlineScripts       = document.querySelectorAll('script:not([src])').length;
    perf.stylesheetsCount    = document.querySelectorAll('link[rel="stylesheet"]').length;
    perf.totalImages         = seo.totalImages;
    perf.lazyImages          = document.querySelectorAll('img[loading="lazy"]').length;
    perf.domSize             = document.querySelectorAll('*').length;
    perf.inlineStyles        = document.querySelectorAll('[style]').length;
    perf.renderBlockingScripts = document.querySelectorAll('script[src]:not([async]):not([defer])').length;
    perf.renderBlockingStyles  = document.querySelectorAll('link[rel="stylesheet"]:not([media="print"]):not([media="(prefers-color-scheme: dark)"])').length;

    // Navigation timing (new API)
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        perf.loadTime         = Math.round(nav.loadEventEnd);
        perf.domContentLoaded = Math.round(nav.domContentLoadedEventEnd);
        perf.ttfb             = Math.round(nav.responseStart - nav.requestStart);
        perf.fcp              = 0;
      }
    } catch(e) {}

    // Paint timing
    try {
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) perf.fcp = Math.round(fcpEntry.startTime);
    } catch(e) {}

    // Resource count
    try {
      const resources = performance.getEntriesByType('resource');
      perf.totalResources = resources.length;
      perf.totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      perf.imageResources = resources.filter(r => r.initiatorType === 'img').length;
    } catch(e) {
      perf.totalResources = 0;
      perf.totalTransferSize = 0;
    }

    // ═══════════════════ ACCESSIBILITY ════════════════════════════
    const a11y = data.accessibility;
    a11y.langAttribute     = seo.lang;
    a11y.imagesWithoutAlt  = seo.imagesWithoutAlt;
    a11y.inputsWithoutLabels  = 0;
    a11y.buttonsWithoutText   = 0;
    a11y.linksWithoutText     = 0;
    a11y.hasSkipNav           = false;
    a11y.ariaLandmarks        = 0;
    a11y.tabindexAbuse        = 0;

    // Inputs without labels
    document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])').forEach(input => {
      const id           = input.id;
      const hasLabel     = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
      const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
      const hasTitle     = input.getAttribute('title');
      const inLabel      = !!input.closest('label');
      const hasPlaceholderOnly = input.getAttribute('placeholder') && !hasLabel && !hasAriaLabel && !hasTitle && !inLabel;
      if (!hasLabel && !hasAriaLabel && !hasTitle && !inLabel) {
        a11y.inputsWithoutLabels++;
      }
    });

    // Buttons without text
    document.querySelectorAll('button').forEach(btn => {
      const text      = btn.textContent.trim();
      const ariaLabel = btn.getAttribute('aria-label');
      const title     = btn.getAttribute('title');
      const ariaLabelledby = btn.getAttribute('aria-labelledby');
      const hasImg    = btn.querySelector('img[alt]');
      const hasSvgTitle = btn.querySelector('title');
      if (!text && !ariaLabel && !title && !ariaLabelledby && !hasImg && !hasSvgTitle) {
        a11y.buttonsWithoutText++;
      }
    });

    // Links without text
    document.querySelectorAll('a[href]').forEach(link => {
      const text      = link.textContent.trim();
      const ariaLabel = link.getAttribute('aria-label');
      const title     = link.getAttribute('title');
      const hasImg    = link.querySelector('img[alt]');
      if (!text && !ariaLabel && !title && !hasImg) {
        a11y.linksWithoutText++;
      }
    });

    // Skip nav
    const skipSelectors = 'a[href="#main"],a[href="#content"],a[href="#main-content"],a[href="#maincontent"],.skip-nav,.skip-link,.skip-to-content,[class*="skip-nav"],[class*="skip-link"]';
    a11y.hasSkipNav = document.querySelectorAll(skipSelectors).length > 0;

    // ARIA Landmarks
    a11y.ariaLandmarks = document.querySelectorAll(
      'main,[role="main"],nav,[role="navigation"],header:not([role]),footer:not([role]),[role="banner"],[role="contentinfo"],[role="complementary"],aside,[role="search"]'
    ).length;

    // tabindex abuse (positive tabindex)
    a11y.tabindexAbuse = document.querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])').length;

    // ═══════════════════ BEST PRACTICES ═══════════════════════════
    const bp = data.bestPractices;
    bp.isHttps            = window.location.protocol === 'https:';
    bp.hasViewportMeta    = bp.hasViewportMeta || false;
    bp.hasFavicon         = seo.favicon;
    bp.charsetMeta        = bp.charsetMeta || false;
    bp.doctypePresent     = !!document.doctype;
    bp.deprecatedTags     = [];
    bp.externalLinksUnsafe = 0;
    bp.inlineEventHandlers = document.querySelectorAll('[onclick],[onload],[onerror],[onmouseover],[onmouseout],[onkeypress],[onkeydown],[onkeyup],[onsubmit]').length;
    bp.mixedContent       = false;
    bp.passwordInputsNoAutocomplete = 0;

    // Deprecated tags
    ['center','font','strike','big','tt','frame','frameset','noframes','applet','basefont','blink','marquee','s','u'].forEach(tag => {
      if (document.querySelectorAll(tag).length > 0) bp.deprecatedTags.push(tag);
    });

    // Unsafe external links
    document.querySelectorAll('a[href^="http"]').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!href.includes(window.location.hostname)) {
        const rel = (link.getAttribute('rel') || '').split(' ');
        if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
          bp.externalLinksUnsafe++;
        }
      }
    });

    // Mixed content check
    if (bp.isHttps) {
      const httpResources = [...document.querySelectorAll('img[src],script[src],link[href],source[src],iframe[src]')]
        .filter(el => {
          const src = el.getAttribute('src') || el.getAttribute('href') || '';
          return src.startsWith('http:');
        });
      bp.mixedContent = httpResources.length > 0;
    }

    // Password inputs without autocomplete="off"
    document.querySelectorAll('input[type="password"]').forEach(inp => {
      if (!inp.getAttribute('autocomplete')) bp.passwordInputsNoAutocomplete++;
    });

    // Viewport meta detail
    if (seo.metaViewport) bp.hasViewportMeta = true;

    return data;
  }

  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'collectData') {
      try {
        const auditData = collectAuditData();
        sendResponse({ success: true, data: auditData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // keep port open for async
  });
}
