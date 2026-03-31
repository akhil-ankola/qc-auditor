// popup.js — QC Auditor main logic
'use strict';

const CIRC = 2 * Math.PI * 62; // r=62 → 389.56

// ═══════════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
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

// ═══════════════════════════════════════════════════════════════
//  MAIN AUDIT FLOW
// ═══════════════════════════════════════════════════════════════
async function runAudit() {
  showState('loading');
  animateLoadingSteps();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
      return showError('Cannot determine the current tab URL.');
    }

    const blocked = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'brave://', 'firefox:', 'moz-extension://'];
    if (blocked.some(p => tab.url.startsWith(p))) {
      return showError('Browser internal pages cannot be audited. Navigate to any website and try again.');
    }

    // Update header site pill
    try {
      const u = new URL(tab.url);
      document.getElementById('siteName').textContent = u.hostname.replace(/^www\./, '');
      document.getElementById('siteDot').className = 'site-dot' + (u.protocol === 'https:' ? '' : ' insecure');
    } catch (_) {
      document.getElementById('siteName').textContent = tab.url.slice(0, 35);
    }

    // Inject content script (safe to re-inject — guarded by flag in content.js)
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

function showState(state) {
  ['loading','results','error'].forEach(s => {
    document.getElementById(`state${capitalize(s)}`).classList.toggle('hidden', s !== state);
  });
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showState('error');
}

// ═══════════════════════════════════════════════════════════════
//  SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════
function calculateScores(data) {
  const issues = [];
  const addIssue = (cat, sev, title, detail) => issues.push({ cat, sev, title, detail });

  // ── SEO (max 25) ────────────────────────────────────────────
  let seo = 0;
  const S = data.seo;

  // Title (5)
  if (!S.title) {
    addIssue('SEO', 'critical', 'Missing page <title> tag',
      'Every page must have a unique, descriptive title tag. It\'s the #1 on-page SEO factor and appears as the blue headline in search results.');
  } else if (S.titleLength < 30) {
    seo += 3;
    addIssue('SEO', 'warning', `Page title too short (${S.titleLength} chars)`,
      `Ideal title length is 30–60 chars. Short titles miss keyword opportunities and look sparse in SERPs.`);
  } else if (S.titleLength > 60) {
    seo += 3;
    addIssue('SEO', 'warning', `Page title too long (${S.titleLength} chars)`,
      `Google truncates titles above ~60 chars in SERPs. Rewrite to fit the key message within 60 characters.`);
  } else { seo += 5; }

  // Meta Description (4)
  if (!S.metaDescription) {
    addIssue('SEO', 'critical', 'Missing meta description',
      'Without a meta description, Google auto-generates one — often poorly. Write a compelling 120–160 char description to improve click-through rates.');
  } else if (S.metaDescriptionLength < 120) {
    seo += 2;
    addIssue('SEO', 'warning', `Meta description too short (${S.metaDescriptionLength} chars)`,
      `Aim for 120–160 chars to fill the full SERP snippet. You have ${160 - S.metaDescriptionLength} chars of unused opportunity.`);
  } else if (S.metaDescriptionLength > 160) {
    seo += 2;
    addIssue('SEO', 'warning', `Meta description too long (${S.metaDescriptionLength} chars)`,
      `Google truncates at ~160 chars. The tail of your description will be cut with "…" in search results.`);
  } else { seo += 4; }

  // H1 (3)
  if (S.h1Count === 0) {
    addIssue('SEO', 'critical', 'No H1 heading found',
      'Every page needs exactly one H1 containing your primary keyword. H1 is the strongest on-page SEO signal after the title tag.');
  } else if (S.h1Count > 1) {
    seo += 1;
    addIssue('SEO', 'warning', `Multiple H1 tags found (${S.h1Count})`,
      `Multiple H1s dilute keyword signals and confuse search crawlers. Consolidate to one H1; use H2–H6 for sub-sections.`);
  } else { seo += 3; }

  // Open Graph (3)
  const hasOGFull = S.ogTitle && S.ogDescription && S.ogImage;
  const hasOGPart = S.ogTitle || S.ogDescription;
  if (hasOGFull) { seo += 3; }
  else if (hasOGPart) {
    seo += 1;
    addIssue('SEO', 'info', 'Incomplete Open Graph tags',
      'You\'re missing one or more of: og:title, og:description, og:image. Incomplete OG tags produce broken social cards on Facebook, LinkedIn, and Slack.');
  } else {
    addIssue('SEO', 'warning', 'Missing Open Graph meta tags',
      'Without OG tags, social platforms auto-generate previews — often choosing the wrong image or text. Add og:title, og:description, og:image (1200×630px), and og:url.');
  }

  // Canonical (2)
  if (S.canonical) { seo += 2; }
  else { addIssue('SEO', 'info', 'No canonical tag',
    'Add <link rel="canonical"> to prevent duplicate content penalties when the same page is reachable via multiple URLs (www vs non-www, HTTP vs HTTPS, trailing slashes).'); }

  // Lang (2)
  if (S.lang) { seo += 2; }
  else { addIssue('SEO', 'warning', 'Missing lang attribute on <html>',
    'Add lang="en" (or your language code) to the <html> element. It helps Google serve the right language version and is required for WCAG 3.1.1.'); }

  // Images alt for SEO (3)
  if (S.imagesWithoutAlt === 0) { seo += 3; }
  else {
    seo += Math.max(0, 3 - Math.ceil(S.imagesWithoutAlt / 2));
    addIssue('SEO', 'warning', `${S.imagesWithoutAlt} image(s) missing alt text`,
      'Alt text is how Google indexes images and ranks them in image search. Descriptive alt text also makes images accessible to screen reader users.');
  }

  // JSON-LD (3)
  if (S.jsonLD) { seo += 3; }
  else { addIssue('SEO', 'info', 'No structured data (JSON-LD) found',
    'Structured data unlocks Rich Results in Google Search — star ratings, FAQ dropdowns, breadcrumbs, and site links. These dramatically increase visibility and CTR.'); }

  const seoScore = Math.min(25, seo);

  // ── Performance (max 25) ────────────────────────────────────
  let perf = 0;
  const P = data.performance;

  // Load time (6)
  if (!P.loadTime || P.loadTime <= 0) { perf += 4; }
  else if (P.loadTime < 1000) { perf += 6; }
  else if (P.loadTime < 2000) {
    perf += 4;
    addIssue('Performance', 'info', `Load time: ${(P.loadTime/1000).toFixed(2)}s`,
      'Good but can improve. Target under 1s. Consider a CDN, image compression (WebP/AVIF), and server-side caching.');
  } else if (P.loadTime < 4000) {
    perf += 2;
    addIssue('Performance', 'warning', `Slow page load: ${(P.loadTime/1000).toFixed(2)}s`,
      'Google data shows 53% of mobile users abandon pages that take longer than 3s to load. Optimize your critical rendering path immediately.');
  } else {
    perf += 0;
    addIssue('Performance', 'critical', `Very slow page load: ${(P.loadTime/1000).toFixed(2)}s`,
      'Critically slow. Your Core Web Vitals (LCP, FID, CLS) will fail Google\'s thresholds. Run a Lighthouse audit and focus on LCP and TTFB first.');
  }

  // Render-blocking scripts (5)
  if (P.renderBlockingScripts === 0) { perf += 5; }
  else if (P.renderBlockingScripts <= 2) {
    perf += 3;
    addIssue('Performance', 'warning', `${P.renderBlockingScripts} render-blocking script(s)`,
      'These scripts block the browser from painting the page. Add defer to DOM-dependent scripts, async to independent ones (e.g., analytics).');
  } else {
    perf += 1;
    addIssue('Performance', 'critical', `${P.renderBlockingScripts} render-blocking scripts`,
      'Multiple synchronous scripts are blocking the entire page render. Move scripts before </body> or add defer/async. This is a major performance bottleneck.');
  }

  // DOM size (5)
  if (P.domSize < 800) { perf += 5; }
  else if (P.domSize < 1500) { perf += 4; }
  else if (P.domSize < 3000) {
    perf += 2;
    addIssue('Performance', 'warning', `Large DOM size: ${P.domSize.toLocaleString()} nodes`,
      'Google recommends fewer than 1,500 DOM elements. Large DOMs increase memory, slow style calculations, and cause layout thrashing. Consider pagination or virtual scrolling.');
  } else {
    perf += 0;
    addIssue('Performance', 'critical', `Excessive DOM: ${P.domSize.toLocaleString()} nodes`,
      'Your DOM is critically over-sized. This will fail Core Web Vitals thresholds. Implement virtual rendering, lazy loading sections, or component-level DOM pruning.');
  }

  // Lazy loading (4)
  if (P.totalImages === 0) { perf += 4; }
  else {
    const ratio = P.lazyImages / P.totalImages;
    if (ratio >= 0.7) { perf += 4; }
    else if (ratio >= 0.4) {
      perf += 2;
      addIssue('Performance', 'info', `${P.lazyImages}/${P.totalImages} images use lazy loading`,
        `Add loading="lazy" to all below-fold images. This defers ${P.totalImages - P.lazyImages} image loads, reducing initial page weight.`);
    } else {
      perf += 0;
      addIssue('Performance', 'warning', `Only ${P.lazyImages}/${P.totalImages} images use lazy loading`,
        `${P.totalImages - P.lazyImages} images load eagerly, even if never seen. Add loading="lazy" to all non-above-fold images. Can improve LCP significantly.`);
    }
  }

  // Script count (3)
  if (P.scriptsCount <= 5) { perf += 3; }
  else if (P.scriptsCount <= 12) { perf += 2; }
  else if (P.scriptsCount <= 20) {
    perf += 1;
    addIssue('Performance', 'info', `${P.scriptsCount} external scripts loaded`,
      'Each script is an additional HTTP request with connection overhead. Bundle with webpack/Vite and audit for unused third-party scripts.');
  } else {
    perf += 0;
    addIssue('Performance', 'warning', `${P.scriptsCount} external scripts — too many`,
      'Excessive HTTP requests significantly hurt Time to Interactive (TTI). Aggressively audit, bundle, and remove unused scripts. Each one adds ~14ms of TCP overhead.');
  }

  // Inline styles (2)
  if (P.inlineStyles < 20) { perf += 2; }
  else if (P.inlineStyles < 80) { perf += 1; }
  else {
    addIssue('Performance', 'info', `${P.inlineStyles} elements with inline styles`,
      'Inline styles bloat HTML, bypass the browser cache, and defeat CSS specificity management. Extract to CSS classes.');
  }

  const perfScore = Math.min(25, perf);

  // ── Accessibility (max 25) ──────────────────────────────────
  let a11y = 0;
  const A = data.accessibility;

  // Lang (4)
  if (A.langAttribute) { a11y += 4; }
  else { addIssue('Accessibility', 'critical', 'Missing lang attribute on <html>',
    'Screen readers switch pronunciation engines based on the lang attribute. Without it, text-to-speech may be completely unintelligible. Required for WCAG 3.1.1 (Level A).'); }

  // Images alt (5)
  if (A.imagesWithoutAlt === 0) { a11y += 5; }
  else {
    a11y += Math.max(0, 5 - A.imagesWithoutAlt);
    addIssue('Accessibility', 'critical', `${A.imagesWithoutAlt} image(s) missing alt attribute`,
      'Screen readers skip images without alt. For content images: use descriptive alt text. For decorative images: use alt="" (empty string) to signal "ignore this" to screen readers. Violates WCAG 1.1.1.');
  }

  // Form labels (5)
  if (A.inputsWithoutLabels === 0) { a11y += 5; }
  else {
    a11y += Math.max(0, 5 - A.inputsWithoutLabels * 2);
    addIssue('Accessibility', 'critical', `${A.inputsWithoutLabels} form input(s) without labels`,
      'Screen readers announce unlabeled inputs as "edit text" with no context. Placeholder text is NOT a label substitute. Use <label for="id">, aria-label, or aria-labelledby. Violates WCAG 1.3.1 and 4.1.2.');
  }

  // Buttons (3)
  if (A.buttonsWithoutText === 0) { a11y += 3; }
  else {
    addIssue('Accessibility', 'critical', `${A.buttonsWithoutText} button(s) without accessible text`,
      'Icon-only buttons are announced as "button" by screen readers with zero context. Add aria-label="Close dialog" (or appropriate action) to every icon button. Violates WCAG 4.1.2.');
  }

  // Links (3)
  if (A.linksWithoutText === 0) { a11y += 3; }
  else {
    addIssue('Accessibility', 'warning', `${A.linksWithoutText} link(s) without accessible text`,
      'Empty links or links with only "click here" fail WCAG 2.4.4 (Link Purpose). Screen reader users navigate by listing all links — they must make sense out of context. Add aria-label or descriptive text.');
  }

  // Skip nav (3)
  if (A.hasSkipNav) { a11y += 3; }
  else { addIssue('Accessibility', 'info', 'No skip navigation link',
    'Keyboard users must tab through every nav item on every page without a skip link. Add a visually-hidden "Skip to main content" link as the very first focusable element. Show it on :focus.'); }

  // Landmarks (2)
  if (A.ariaLandmarks >= 3) { a11y += 2; }
  else if (A.ariaLandmarks > 0) {
    a11y += 1;
    addIssue('Accessibility', 'info', 'Limited semantic landmarks',
      'Add <main>, <nav>, <header>, <footer>, and <aside> to help screen reader users jump between major page sections via landmark navigation.');
  } else {
    addIssue('Accessibility', 'warning', 'No semantic landmarks or ARIA roles found',
      'Without landmark regions, screen reader users have no way to navigate the page structure. Use semantic HTML5 elements (main, nav, header, footer) or role attributes.');
  }

  // Tabindex abuse
  if (A.tabindexAbuse > 0) {
    addIssue('Accessibility', 'warning', `${A.tabindexAbuse} element(s) with positive tabindex`,
      'Positive tabindex values (tabindex="1", "2", etc.) create a custom tab order that\'s nearly impossible to predict and maintain. Remove all positive tabindex values; use tabindex="0" or "-1" only.');
  }

  const a11yScore = Math.min(25, a11y);

  // ── Best Practices (max 25) ─────────────────────────────────
  let bp = 0;
  const B = data.bestPractices;

  // HTTPS (6)
  if (B.isHttps) { bp += 6; }
  else { addIssue('Best Practices', 'critical', 'Site is not using HTTPS',
    'HTTP is insecure, unencrypted, and a Google ranking penalty since 2014. Get a free SSL certificate from Let\'s Encrypt. Set up HTTP→HTTPS 301 redirects. Modern APIs (Service Workers, Push) require HTTPS.'); }

  // Viewport (4)
  if (B.hasViewportMeta) { bp += 4; }
  else { addIssue('Best Practices', 'critical', 'Missing viewport meta tag',
    'Without <meta name="viewport" content="width=device-width, initial-scale=1">, your site will appear zoomed-out on mobile devices. This is the first step for any responsive design.'); }

  // Favicon (2)
  if (B.hasFavicon) { bp += 2; }
  else { addIssue('Best Practices', 'info', 'No favicon found',
    'Favicons appear in browser tabs, bookmarks, and home screen shortcuts. Add a 32×32 favicon.ico and <link rel="icon" href="/favicon.ico">. Consider adding apple-touch-icon for iOS.'); }

  // Deprecated tags (4)
  if (B.deprecatedTags.length === 0) { bp += 4; }
  else {
    bp += Math.max(0, 4 - B.deprecatedTags.length);
    addIssue('Best Practices', 'warning', `Deprecated HTML tags: ${B.deprecatedTags.slice(0, 5).join(', ')}`,
      'These tags were removed from the HTML spec. <font> → CSS; <center> → CSS text-align; <b> → <strong> (semantic); <u> → CSS text-decoration; <marquee>/<blink> → CSS animations.');
  }

  // External links (3)
  if (B.externalLinksUnsafe === 0) { bp += 3; }
  else {
    bp += 1;
    addIssue('Best Practices', 'warning', `${B.externalLinksUnsafe} external link(s) missing rel="noopener"`,
      'External links without rel="noopener noreferrer" allow the opened page to access window.opener and redirect your page (reverse tabnapping attack). Also: target="_blank" links without noopener run in a shared process, hurting performance.');
  }

  // DOCTYPE (2)
  if (B.doctypePresent) { bp += 2; }
  else { addIssue('Best Practices', 'warning', 'Missing DOCTYPE declaration',
    '<!DOCTYPE html> must be the very first line of your HTML. Without it, browsers enter "quirks mode" which emulates old browser bugs — layout and JavaScript behavior will be unpredictable.'); }

  // Charset (2)
  if (B.charsetMeta) { bp += 2; }
  else { addIssue('Best Practices', 'info', 'Missing charset meta tag',
    'Add <meta charset="UTF-8"> as the first tag inside <head>. It must appear before any content. Without it, international characters may display as garbled text (mojibake) in some browsers.'); }

  // Inline events (2)
  if (B.inlineEventHandlers === 0) { bp += 2; }
  else {
    addIssue('Best Practices', 'info', `${B.inlineEventHandlers} inline event handler(s) detected`,
      'onclick="…", onload="…" etc. mix behavior with structure, violate Content Security Policy, and are impossible to test. Move all event handling to external JavaScript with addEventListener().');
  }

  // Mixed content
  if (B.mixedContent) {
    addIssue('Best Practices', 'critical', 'Mixed content: HTTP resources on an HTTPS page',
      'Your HTTPS page loads HTTP resources. Browsers block or warn about these, breaking your UI. Find all HTTP resource URLs (images, scripts, iframes) and update them to HTTPS.');
  }

  const bpScore = Math.min(25, bp);
  const total = seoScore + perfScore + a11yScore + bpScore;

  return {
    total, seoScore, perfScore, a11yScore, bpScore,
    issues,
    suggestions: generateSuggestions(data, { seoScore, perfScore, a11yScore, bpScore })
  };
}

// ═══════════════════════════════════════════════════════════════
//  SUGGESTIONS
// ═══════════════════════════════════════════════════════════════
function generateSuggestions(data, scores) {
  const S = data.seo, P = data.performance, A = data.accessibility, B = data.bestPractices;
  const sugs = [];
  const add = (pri, cat, title, detail, impact) => sugs.push({ pri, cat, title, detail, impact });

  if (!S.ogTitle || !S.ogImage) {
    add('high', 'SEO', 'Implement the Full Open Graph Protocol',
      'Add og:title, og:description, og:image (1200×630px JPG/PNG), og:url, og:type, and og:site_name. This controls exactly how your page appears when shared on Facebook, LinkedIn, Slack, Discord, and WhatsApp. Complete OG tags increase social CTR by up to 40%. Use the Facebook Sharing Debugger to verify and clear cache after deploying.',
      'High');
  }

  if (!S.jsonLD) {
    add('high', 'SEO', 'Add JSON-LD Structured Data Markup',
      'Add Schema.org JSON-LD in a <script type="application/ld+json"> tag. Choose your content type: Article, Product, LocalBusiness, FAQPage, HowTo, BreadcrumbList, or Organization. Rich Results can increase click-through rates by 20–30% and win featured snippets and knowledge panel entries. Use Google\'s Rich Results Test tool to validate your markup.',
      'High');
  }

  if (P.renderBlockingScripts > 0) {
    add('high', 'Performance', 'Eliminate All Render-Blocking Scripts',
      `${P.renderBlockingScripts} script(s) are blocking the browser from rendering your page. Rule: add defer to scripts that need the DOM; async to independent scripts (analytics, ads). Move third-party scripts to load after user interaction when possible. Tools: use Chrome DevTools "Coverage" to identify unused JS, and "Network" waterfall to find blocking resources. A single eliminated blocking script can improve FCP by 300–800ms.`,
      'High');
  }

  if (P.totalImages > 3 && P.lazyImages / P.totalImages < 0.5) {
    add('high', 'Performance', 'Implement Lazy Loading + Modern Image Formats',
      `Add loading="lazy" to all ${P.totalImages - P.lazyImages} non-above-fold images. Also convert images to WebP (25–34% smaller than JPEG) or AVIF (50% smaller). Use the <picture> element with srcset for responsive images across screen densities. Tools: Squoosh.app for conversion, or automate with an image CDN like Cloudinary, Imgix, or Vercel's Image Optimization.`,
      'High');
  }

  if (A.inputsWithoutLabels > 0) {
    add('high', 'Accessibility', 'Fix Form Accessibility to Meet WCAG 2.1 AA',
      `${A.inputsWithoutLabels} form inputs have no programmatic labels — a critical WCAG 2.1 failure (SC 1.3.1, 4.1.2). Three valid approaches: (1) <label for="inputId">, (2) aria-label="Email address" on the input, (3) wrap input inside <label>. Note: placeholder alone is NOT a label — it disappears on input and has insufficient color contrast. Also ensure error messages are associated via aria-describedby.`,
      'High');
  }

  if (!B.isHttps) {
    add('high', 'Security', 'Migrate to HTTPS Immediately',
      'Use Let\'s Encrypt (free) via Certbot for a 90-day auto-renewing SSL certificate. After installing: update all internal links and resource URLs to HTTPS; set up 301 redirects from HTTP; add HSTS header (Strict-Transport-Security: max-age=31536000; includeSubDomains). HTTPS is a confirmed Google ranking factor, required for HTTP/2, Service Workers, Push Notifications, and Payment Request API.',
      'High');
  }

  if (!A.hasSkipNav) {
    add('medium', 'Accessibility', 'Add a Skip Navigation Link',
      'Add <a href="#main-content" class="skip-link">Skip to main content</a> as the very first element in <body>. Style it to be visually hidden until focused: .skip-link { position: absolute; transform: translateY(-100%); } .skip-link:focus { transform: translateY(0); }. This allows keyboard and screen reader users to bypass repetitive navigation on every page. Required for WCAG 2.4.1 (Level A) conformance.',
      'Medium');
  }

  if (B.externalLinksUnsafe > 0) {
    add('medium', 'Security', 'Add rel="noopener noreferrer" to All External Links',
      `${B.externalLinksUnsafe} external link(s) are vulnerable to reverse tabnapping. The fix: add rel="noopener noreferrer" to every <a target="_blank"> link. "noopener" prevents the opened page from accessing window.opener; "noreferrer" also hides your URL from the destination's referrer logs (privacy benefit). In modern browsers, target="_blank" implies noopener — but add it explicitly for older browser support and clarity.`,
      'Medium');
  }

  if (!S.canonical) {
    add('medium', 'SEO', 'Implement Canonical URL Tags Site-Wide',
      'Add <link rel="canonical" href="https://example.com/exact-url"> to every page. This tells Google which version is the "master" when your page is accessible at multiple URLs: example.com/page, www.example.com/page, example.com/page?utm_source=email, example.com/page/. Without canonicals, Google splits PageRank across duplicates and may index the wrong version. Critical for e-commerce sites with faceted navigation.',
      'Medium');
  }

  if (scores.perfScore < 20 && P.domSize > 1500) {
    add('medium', 'Performance', 'Reduce DOM Complexity with Virtual Rendering',
      `Your DOM has ${P.domSize.toLocaleString()} elements — Google's threshold is 1,500. For long lists/tables: implement virtual scrolling (react-virtual, TanStack Virtual). For content below the fold: use Intersection Observer to lazy-render sections. For complex components: consider progressive hydration in frameworks like Next.js or Nuxt. Each 1,000 DOM nodes adds ~1.5ms to style recalculation time.`,
      'Medium');
  }

  if (!S.twitterCard) {
    add('low', 'SEO', 'Add Twitter/X Card Meta Tags',
      'Add <meta name="twitter:card" content="summary_large_image">, twitter:title, twitter:description, and twitter:image to control your page\'s preview on Twitter/X. Without these, Twitter uses OG tags (if present) or generates a poor preview. Use Twitter\'s Card Validator to preview and debug. Also consider LinkedIn\'s Post Inspector for B2B content.',
      'Low');
  }

  if (P.inlineStyles > 30) {
    add('low', 'Performance', 'Move Inline Styles to CSS Classes',
      `${P.inlineStyles} elements use inline styles, adding ~${Math.round(P.inlineStyles * 15)} bytes of un-cacheable HTML. Extract to CSS classes or a utility framework (Tailwind, UnoCSS). Benefits: CSS files are cached separately; styles are reusable; simpler HTML; easier responsive overrides. If inline styles come from a JS framework, use CSS-in-JS solutions that extract critical CSS at build time.`,
      'Low');
  }

  if (A.tabindexAbuse > 0) {
    add('low', 'Accessibility', 'Remove Positive tabindex Values',
      'Positive tabindex values create a custom tab order that immediately falls apart as the page evolves. Remove all tabindex="1", "2", etc. Use tabindex="0" to make non-interactive elements focusable, and tabindex="-1" to make elements programmatically focusable but skip them in natural tab order. Restructure your HTML source order to match your desired focus sequence instead.',
      'Low');
  }

  return sugs;
}

// ═══════════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════════
function renderResults(scores, data) {
  // Chips
  document.getElementById('chipIssues').textContent = scores.issues.length;
  document.getElementById('chipSugg').textContent   = scores.suggestions.length;
  document.getElementById('footerInfo').textContent = `${scores.issues.length} issue${scores.issues.length !== 1 ? 's' : ''} found`;

  // Issues
  const issuesList = document.getElementById('issuesList');
  if (!scores.issues.length) {
    issuesList.innerHTML = emptyState('🎉', 'No issues detected!', 'This page is in great shape across all audit categories.');
  } else {
    const sorted = [...scores.issues].sort((a, b) => {
      const o = { critical: 0, warning: 1, info: 2 };
      return o[a.sev] - o[b.sev];
    });
    issuesList.innerHTML = sorted.map(issueCard).join('');
  }

  // Suggestions
  const suggestionsList = document.getElementById('suggestionsList');
  if (!scores.suggestions.length) {
    suggestionsList.innerHTML = emptyState('✨', 'No additional suggestions', 'Your site is following web best practices well.');
  } else {
    suggestionsList.innerHTML = scores.suggestions.map(suggCard).join('');
  }

  // Details
  renderDetails(data, scores);
}

function issueCard(issue) {
  const icons   = { critical: '🔴', warning: '🟡', info: '🔵' };
  const tagCls  = { critical: 'tag-crit', warning: 'tag-warn', info: 'tag-info' };
  const tagLbl  = { critical: 'Critical', warning: 'Warning', info: 'Info' };
  return `
    <div class="issue-card">
      <div class="issue-badge badge-${issue.sev}">${icons[issue.sev] || '⚪'}</div>
      <div class="issue-body">
        <div class="issue-title">${esc(issue.title)}</div>
        <div class="issue-detail">${esc(issue.detail)}</div>
        <div class="issue-footer">
          <span class="tag tag-cat">${esc(issue.cat)}</span>
          <span class="tag ${tagCls[issue.sev]}">${tagLbl[issue.sev]}</span>
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

function renderDetails(data, scores) {
  const S = data.seo, P = data.performance, A = data.accessibility, B = data.bestPractices;
  const el = document.getElementById('detailsContent');

  const sec = (icon, label, scoreVal, rows) => `
    <div class="details-section">
      <div class="details-head">
        <span class="details-head-icon">${icon}</span>
        <span class="details-head-label">${label}</span>
        <span class="details-head-score" style="color:${scoreColor(scoreVal, 25)}">${scoreVal}/25</span>
      </div>
      ${rows.map(([k, v, cls]) => `
        <div class="detail-row">
          <span class="detail-key">${esc(k)}</span>
          <span class="detail-val val-${cls}">${esc(String(v))}</span>
        </div>`).join('')}
    </div>`;

  el.innerHTML =
    sec('🔍', 'SEO', scores.seoScore, [
      ['Page Title',          S.title ? `"${S.title.slice(0, 28)}${S.title.length > 28 ? '…' : ''}"` : 'Missing',
                              S.title ? (S.titleLength >= 30 && S.titleLength <= 60 ? 'pass' : 'warn') : 'fail'],
      ['Title Length',        S.titleLength ? `${S.titleLength} chars` : 'N/A',
                              S.titleLength >= 30 && S.titleLength <= 60 ? 'pass' : S.titleLength > 0 ? 'warn' : 'fail'],
      ['Meta Description',    S.metaDescription ? `${S.metaDescriptionLength} chars` : 'Missing',
                              S.metaDescriptionLength >= 120 && S.metaDescriptionLength <= 160 ? 'pass' : S.metaDescriptionLength > 0 ? 'warn' : 'fail'],
      ['H1 Tags',             `${S.h1Count} found`,  S.h1Count === 1 ? 'pass' : S.h1Count === 0 ? 'fail' : 'warn'],
      ['H2 Tags',             `${S.h2Count} found`,  'neu'],
      ['Open Graph',          (S.ogTitle && S.ogDescription && S.ogImage) ? '✓ Complete' : (S.ogTitle || S.ogDescription) ? '⚠ Partial' : '✗ Missing',
                              (S.ogTitle && S.ogDescription && S.ogImage) ? 'pass' : (S.ogTitle || S.ogDescription) ? 'warn' : 'fail'],
      ['Twitter Card',        S.twitterCard ? `✓ ${S.twitterCard}` : '✗ Missing',  S.twitterCard ? 'pass' : 'warn'],
      ['Canonical Tag',       S.canonical ? '✓ Present' : '✗ Missing',  S.canonical ? 'pass' : 'warn'],
      ['Structured Data',     S.jsonLD ? '✓ JSON-LD found' : '✗ Not found',  S.jsonLD ? 'pass' : 'warn'],
      ['Language Attribute',  S.lang ? `✓ "${S.lang}"` : '✗ Missing',  S.lang ? 'pass' : 'fail'],
      ['Images Without Alt',  `${S.imagesWithoutAlt} of ${S.totalImages}`,  S.imagesWithoutAlt === 0 ? 'pass' : 'fail'],
      ['Internal Links',      `${S.internalLinks}`,  'neu'],
      ['External Links',      `${S.externalLinks}`,  'neu'],
    ]) +
    sec('⚡', 'Performance', scores.perfScore, [
      ['Page Load Time',      P.loadTime > 0 ? `${(P.loadTime/1000).toFixed(2)}s` : 'N/A',
                              P.loadTime <= 0 ? 'neu' : P.loadTime < 2000 ? 'pass' : P.loadTime < 4000 ? 'warn' : 'fail'],
      ['DOM Content Loaded',  P.domContentLoaded > 0 ? `${(P.domContentLoaded/1000).toFixed(2)}s` : 'N/A',  'neu'],
      ['TTFB',                P.ttfb > 0 ? `${P.ttfb}ms` : 'N/A',  P.ttfb > 0 ? (P.ttfb < 200 ? 'pass' : P.ttfb < 600 ? 'warn' : 'fail') : 'neu'],
      ['DOM Size',            `${P.domSize.toLocaleString()} nodes`,  P.domSize < 1500 ? 'pass' : P.domSize < 3000 ? 'warn' : 'fail'],
      ['External Scripts',    `${P.scriptsCount}`,  P.scriptsCount <= 10 ? 'pass' : 'warn'],
      ['Render-Blocking Scripts', `${P.renderBlockingScripts}`,  P.renderBlockingScripts === 0 ? 'pass' : 'fail'],
      ['Stylesheets',         `${P.stylesheetsCount}`,  'neu'],
      ['Total Resources',     P.totalResources > 0 ? `${P.totalResources}` : 'N/A',  P.totalResources < 50 ? 'pass' : P.totalResources < 100 ? 'warn' : 'fail'],
      ['Lazy Loaded Images',  `${P.lazyImages} / ${P.totalImages}`,  P.totalImages === 0 || P.lazyImages >= P.totalImages * 0.7 ? 'pass' : 'warn'],
      ['Inline Styles',       `${P.inlineStyles} elements`,  P.inlineStyles < 20 ? 'pass' : 'warn'],
    ]) +
    sec('♿', 'Accessibility', scores.a11yScore, [
      ['Language Attribute',  A.langAttribute ? `✓ "${A.langAttribute}"` : '✗ Missing',  A.langAttribute ? 'pass' : 'fail'],
      ['Images Without Alt',  `${A.imagesWithoutAlt}`,  A.imagesWithoutAlt === 0 ? 'pass' : 'fail'],
      ['Inputs Without Labels', `${A.inputsWithoutLabels}`,  A.inputsWithoutLabels === 0 ? 'pass' : 'fail'],
      ['Buttons Without Text', `${A.buttonsWithoutText}`,  A.buttonsWithoutText === 0 ? 'pass' : 'fail'],
      ['Links Without Text',  `${A.linksWithoutText}`,  A.linksWithoutText === 0 ? 'pass' : 'warn'],
      ['Skip Navigation',     A.hasSkipNav ? '✓ Found' : '✗ Missing',  A.hasSkipNav ? 'pass' : 'warn'],
      ['ARIA Landmarks',      `${A.ariaLandmarks} found`,  A.ariaLandmarks >= 3 ? 'pass' : A.ariaLandmarks > 0 ? 'warn' : 'fail'],
      ['Positive tabindex',   `${A.tabindexAbuse || 0}`,  (A.tabindexAbuse || 0) === 0 ? 'pass' : 'warn'],
    ]) +
    sec('🛡️', 'Best Practices', scores.bpScore, [
      ['HTTPS',               B.isHttps ? '✓ Secure' : '✗ Insecure',  B.isHttps ? 'pass' : 'fail'],
      ['Viewport Meta',       B.hasViewportMeta ? '✓ Present' : '✗ Missing',  B.hasViewportMeta ? 'pass' : 'fail'],
      ['Favicon',             B.hasFavicon ? '✓ Found' : '✗ Missing',  B.hasFavicon ? 'pass' : 'warn'],
      ['DOCTYPE',             B.doctypePresent ? '✓ HTML5' : '✗ Missing',  B.doctypePresent ? 'pass' : 'fail'],
      ['Charset Meta',        B.charsetMeta ? '✓ UTF-8' : '✗ Missing',  B.charsetMeta ? 'pass' : 'warn'],
      ['Mixed Content',       B.mixedContent ? '✗ Detected' : '✓ Clean',  B.mixedContent ? 'fail' : 'pass'],
      ['Deprecated Tags',     B.deprecatedTags.length === 0 ? '✓ None found' : B.deprecatedTags.slice(0,3).join(', '),  B.deprecatedTags.length === 0 ? 'pass' : 'warn'],
      ['Unsafe External Links', `${B.externalLinksUnsafe}`,  B.externalLinksUnsafe === 0 ? 'pass' : 'warn'],
      ['Inline Event Handlers', `${B.inlineEventHandlers}`,  B.inlineEventHandlers === 0 ? 'pass' : 'warn'],
    ]);
}

function scoreColor(val, max) {
  const pct = val / max;
  if (pct >= 0.8) return '#1E8E3E';
  if (pct >= 0.6) return '#E37400';
  return '#D93025';
}

// ═══════════════════════════════════════════════════════════════
//  ANIMATIONS
// ═══════════════════════════════════════════════════════════════
function animateScores(scores) {
  const ringTrack = document.getElementById('ringTrack');
  const scoreNum  = document.getElementById('scoreNum');
  const gradeEl   = document.getElementById('scoreGrade');

  let color, grade, gradeCls;
  if (scores.total >= 90)      { color = '#1E8E3E'; grade = 'Excellent';   gradeCls = 'grade-excellent'; }
  else if (scores.total >= 70) { color = '#1A73E8'; grade = 'Good';        gradeCls = 'grade-good'; }
  else if (scores.total >= 50) { color = '#E37400'; grade = 'Needs Work';  gradeCls = 'grade-fair'; }
  else                         { color = '#D93025'; grade = 'Poor';        gradeCls = 'grade-poor'; }

  ringTrack.style.stroke = color;

  // Animate counter + ring
  const target = scores.total;
  const dur    = 1300;
  const t0     = performance.now();

  const tick = (now) => {
    const p   = Math.min((now - t0) / dur, 1);
    const e   = 1 - Math.pow(1 - p, 3); // ease-out cubic
    const cur = Math.round(e * target);
    scoreNum.textContent = cur;
    ringTrack.style.strokeDashoffset = CIRC - (e * target / 100) * CIRC;
    if (p < 1) { requestAnimationFrame(tick); }
    else {
      scoreNum.textContent = target;
      ringTrack.style.strokeDashoffset = CIRC - (target / 100) * CIRC;
      gradeEl.textContent  = grade;
      gradeEl.className    = `score-grade ${gradeCls}`;
    }
  };
  requestAnimationFrame(tick);

  // Category bars (staggered)
  setTimeout(() => {
    const cats = [
      { pts: 'ptsSeo',  bar: 'barSeo',  score: scores.seoScore },
      { pts: 'ptsPerf', bar: 'barPerf', score: scores.perfScore },
      { pts: 'ptsA11y', bar: 'barA11y', score: scores.a11yScore },
      { pts: 'ptsBp',   bar: 'barBp',   score: scores.bpScore },
    ];
    cats.forEach(({ pts, bar, score }, i) => {
      setTimeout(() => {
        const el = document.getElementById(pts);
        el.textContent   = `${score}/25`;
        el.style.color   = scoreColor(score, 25);
        document.getElementById(bar).style.width = `${(score / 25) * 100}%`;
      }, i * 80);
    });
  }, 500);
}

let stepTimer = null;
function animateLoadingSteps() {
  if (stepTimer) clearInterval(stepTimer);
  const steps = ['step1','step2','step3','step4'];
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
  });
  let i = 0;
  const next = () => {
    if (i > 0) document.getElementById(steps[i-1])?.classList.replace('active','done');
    if (i < steps.length) { document.getElementById(steps[i])?.classList.add('active'); i++; }
    else clearInterval(stepTimer);
  };
  next();
  stepTimer = setInterval(next, 320);
}

// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
