export const SITE_LOADER_CSS = `
:root {
  --site-loader-overlay: rgba(20, 20, 20, 0.98);
  --site-loader-panel: rgba(20, 20, 20, 0.82);
  --site-loader-border: rgba(242, 229, 183, 0.16);
  --site-loader-star-size: clamp(4rem, 8vw, 6.5rem);
  --site-loader-asset-size: clamp(2.8rem, 6vw, 4.25rem);
}

html[data-site-loading='pending'] body {
  overflow-y: auto !important;
}

html[data-site-loading='pending'] body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at center, rgba(240, 179, 35, 0.1), transparent 30%),
    linear-gradient(rgba(20, 20, 20, 0.96), rgba(20, 20, 20, 0.985));
  z-index: 9998;
  pointer-events: none;
}

html[data-site-loading='pending'] body::after {
  content: '';
  position: fixed;
  top: 50%;
  left: 50%;
  width: var(--site-loader-star-size);
  aspect-ratio: 1;
  background: url('/images/waypoint/waypoint-star.png') center / contain no-repeat;
  transform: translate(-50%, -50%);
  animation-name: siteHeroStarSpin, siteHeroStarGlow !important;
  animation-duration: 1.35s, 2.15s !important;
  animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1), ease-in-out !important;
  animation-iteration-count: infinite, infinite !important;
  animation-fill-mode: both, both !important;
  animation-play-state: running, running !important;
  transform-origin: 50% 50%;
  will-change: transform, opacity;
  filter: drop-shadow(0 0 1.2rem rgba(240, 179, 35, 0.35));
  z-index: 9999;
  pointer-events: none;
}

.site-load-shell {
  position: relative;
  isolation: isolate;
}

.site-load-shell[data-site-layout='block'] {
  display: block;
}

.site-load-shell[data-site-layout='inline'] {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}

.site-load-shell[data-site-fill='true'] {
  width: 100%;
  height: 100%;
}

.site-load-shell[data-site-fill='true'] > :is(img, picture, [data-load-watch]) {
  width: 100%;
  height: 100%;
}

.site-load-shell.is-site-loading::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(20, 20, 20, 0.62), rgba(20, 20, 20, 0.8)),
    var(--site-loader-panel);
  border: 1px solid var(--site-loader-border);
  z-index: 1;
  pointer-events: none;
}

.site-load-shell.is-site-loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--site-loader-asset-size);
  aspect-ratio: 1;
  background: url('/images/waypoint/waypoint-star.png') center / contain no-repeat;
  transform: translate(-50%, -50%);
  animation-name: siteHeroStarSpin, siteHeroStarGlow !important;
  animation-duration: 1.45s, 2s !important;
  animation-timing-function: cubic-bezier(0.68, -0.05, 0.32, 1.05), ease-in-out !important;
  animation-iteration-count: infinite, infinite !important;
  animation-fill-mode: both, both !important;
  animation-play-state: running, running !important;
  transform-origin: 50% 50%;
  will-change: transform, opacity;
  filter: drop-shadow(0 0 0.9rem rgba(240, 179, 35, 0.3));
  z-index: 2;
  pointer-events: none;
}

.site-load-shell.is-site-loading > :is(img, picture, [data-load-watch]) {
  opacity: 0;
}

@keyframes siteHeroStarSpin {
  0% {
    transform: translate(-50%, -50%) rotate(-14deg) scale(0.86);
  }
  18% {
    transform: translate(-50%, -50%) rotate(88deg) scale(1.08);
  }
  42% {
    transform: translate(-50%, -50%) rotate(194deg) scale(0.95);
  }
  71% {
    transform: translate(-50%, -50%) rotate(308deg) scale(1.14);
  }
  100% {
    transform: translate(-50%, -50%) rotate(346deg) scale(0.9);
  }
}

@keyframes siteHeroStarGlow {
  0%,
  100% {
    opacity: 0.72;
  }
  50% {
    opacity: 1;
  }
}

`;

export const SITE_LOADER_SCRIPT = `
(() => {
  const root = document.documentElement;
  const selector = 'picture, img, [data-load-watch]';
  const shellClass = 'site-load-shell';
  const loadingClass = 'is-site-loading';
  const pageLoaderDelayMs = 50;
  const pageLoaderMaxMs = 3000;
  let pageReady = false;
  let pageLoaderTimer = 0;
  let pageLoaderFallbackTimer = 0;

  root.dataset.siteLoading = 'idle';

  pageLoaderTimer = window.setTimeout(() => {
    if (pageReady) return;
    root.dataset.siteLoading = 'pending';
  }, pageLoaderDelayMs);

  pageLoaderFallbackTimer = window.setTimeout(() => {
    markPageReady();
  }, pageLoaderMaxMs);

  function isWatchTarget(el) {
    return el.hasAttribute('data-load-watch');
  }

  function getLoadTarget(el) {
    if (el.tagName === 'PICTURE') return el.querySelector('img');
    return el;
  }

  function isLoaded(el) {
    if (isWatchTarget(el)) {
      return el.dataset.loaded === 'true' || el.getAttribute('aria-busy') === 'false';
    }

    const target = getLoadTarget(el);
    if (!target) return false;

    if (target.tagName === 'IMG') {
      return target.complete && target.naturalWidth > 0;
    }

    if (target.tagName === 'VIDEO') {
      return target.readyState >= 2;
    }

    return target.dataset.siteLoaded === 'true';
  }

  function ensureShell(el) {
    const existingParent = el.parentElement;
    if (existingParent && existingParent.classList.contains(shellClass)) return existingParent;

    const shell = document.createElement('span');
    const display = window.getComputedStyle(el).display;
    const blockLike = ['block', 'flex', 'grid', 'table', 'list-item'].includes(display);

    shell.className = shellClass;
    shell.dataset.siteLayout = blockLike ? 'block' : 'inline';

    el.before(shell);
    shell.appendChild(el);
    return shell;
  }

  function bindAsset(el) {
    if (!(el instanceof Element) || el.dataset.siteLoaderBound === 'true') return;
    if (el.tagName === 'IMG' && el.closest('picture')) return;
    if (el.closest('.hero-art')) return;
    if (el.closest('.scroll-cue')) return;

    el.dataset.siteLoaderBound = 'true';

    const shell = ensureShell(el);
    const target = getLoadTarget(el);
    const applyState = () => {
      shell.classList.toggle(loadingClass, !isLoaded(el));
    };

    applyState();
    if (isLoaded(el)) return;

    const done = () => {
      if (target && target !== el) target.dataset.siteLoaded = 'true';
      el.dataset.siteLoaded = 'true';
      applyState();
    };

    if (isWatchTarget(el)) return;

    const eventTarget = target || el;
    const loadEvent = eventTarget.tagName === 'VIDEO' ? 'loadeddata' : 'load';
    eventTarget.addEventListener(loadEvent, done, { once: true });
    eventTarget.addEventListener('error', done, { once: true });
  }

  function scan(rootNode = document) {
    if (!(rootNode instanceof Element || rootNode instanceof Document || rootNode instanceof DocumentFragment)) return;
    rootNode.querySelectorAll(selector).forEach(bindAsset);
    if (rootNode instanceof Element && rootNode.matches(selector)) bindAsset(rootNode);
  }

  function markPageReady() {
    pageReady = true;
    window.clearTimeout(pageLoaderTimer);
    window.clearTimeout(pageLoaderFallbackTimer);
    root.dataset.siteLoading = 'ready';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(), { once: true });
  } else {
    scan();
  }

  window.addEventListener('load', () => {
    markPageReady();
    scan();
  }, { once: true });

  window.addEventListener('pageshow', markPageReady, { once: true });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) scan(node);
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
`;
