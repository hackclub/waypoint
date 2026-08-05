const loaderStarDataUri = 'data:image/png;base64,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';

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
  background: url('${loaderStarDataUri}') center / contain no-repeat;
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

.site-load-shell[data-site-media='true'] {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
}

.site-load-shell[data-site-media='true'] > :is(iframe, video) {
  width: 100%;
  height: 100%;
}

.site-load-shell[data-site-fill='true'] > :is(img, picture, iframe, video, [data-load-watch]) {
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
  background: url('${loaderStarDataUri}') center / contain no-repeat;
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

.site-load-shell.is-site-loading > :is(img, picture, iframe, video, [data-load-watch]) {
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

@media (prefers-reduced-motion: reduce) {
  html[data-site-loading='pending'] body::after,
  .site-load-shell.is-site-loading::after {
    animation: none !important;
  }
}

`;

export const SITE_LOADER_SCRIPT = `
(() => {
  const root = document.documentElement;
  const selector = '.sl-markdown-content [data-load-watch]';
  const shellClass = 'site-load-shell';
  const loadingClass = 'is-site-loading';
  const pageLoaderDelayMs = 120;
  const pageLoaderMaxMs = 1500;
  let pageReady = false;
  let pageLoaderTimer = 0;
  let pageLoaderMaxTimer = 0;

  root.dataset.siteLoading = 'idle';

  pageLoaderTimer = window.setTimeout(() => {
    if (pageReady) return;
    root.dataset.siteLoading = 'pending';
  }, pageLoaderDelayMs);

  pageLoaderMaxTimer = window.setTimeout(markPageReady, pageLoaderMaxMs);

  function isWatchTarget(el) {
    return el.hasAttribute('data-load-watch');
  }

  function getLoadTarget(el) {
    return el;
  }

  function isLoaded(el) {
    if (el.dataset.siteLoaded === 'true') return true;

    if (isWatchTarget(el) && !['IMG', 'IFRAME', 'VIDEO'].includes(el.tagName)) {
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

    if (target.tagName === 'IFRAME') {
      return target.dataset.siteLoaded === 'true';
    }

    return target.dataset.siteLoaded === 'true';
  }

  function ensureShell(el) {
    const existingParent = el.parentElement;
    if (existingParent && existingParent.classList.contains(shellClass)) return existingParent;

    const shell = document.createElement('span');
    const display = window.getComputedStyle(el).display;
    const isMedia = el.tagName === 'IFRAME' || el.tagName === 'VIDEO';
    const blockLike = isMedia || ['block', 'flex', 'grid', 'table', 'list-item'].includes(display);

    shell.className = shellClass;
    shell.dataset.siteLayout = blockLike ? 'block' : 'inline';
    if (isMedia) shell.dataset.siteMedia = 'true';

    el.before(shell);
    shell.appendChild(el);
    return shell;
  }

  function bindAsset(el) {
    if (!(el instanceof Element) || el.dataset.siteLoaderBound === 'true') return;

    el.dataset.siteLoaderBound = 'true';

    const shell = ensureShell(el);
    const target = getLoadTarget(el);
    const applyState = () => {
      shell.classList.toggle(loadingClass, !isLoaded(el));
    };

    applyState();
    if (isLoaded(el)) return;

    const finish = () => {
      if (target && target !== el) target.dataset.siteLoaded = 'true';
      el.dataset.siteLoaded = 'true';
      applyState();
    };

    if (isWatchTarget(el) && !['IMG', 'IFRAME', 'VIDEO'].includes(el.tagName)) return;

    const eventTarget = target || el;
    const loadEvent = eventTarget.tagName === 'VIDEO' ? 'loadeddata' : 'load';
    eventTarget.addEventListener(loadEvent, finish, { once: true });
    eventTarget.addEventListener('error', () => {
      el.dataset.siteLoadError = 'true';
      finish();
    }, { once: true });
  }

  function scan(rootNode = document) {
    if (!(rootNode instanceof Element || rootNode instanceof Document || rootNode instanceof DocumentFragment)) return;
    rootNode.querySelectorAll(selector).forEach(bindAsset);
  }

  function markPageReady() {
    if (pageReady) return;
    pageReady = true;
    window.clearTimeout(pageLoaderTimer);
    window.clearTimeout(pageLoaderMaxTimer);
    root.dataset.siteLoading = 'ready';
  }

  const revealPage = () => {
    scan();
    markPageReady();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealPage, { once: true });
  } else {
    revealPage();
  }

  window.addEventListener('pageshow', revealPage);
})();
`;
