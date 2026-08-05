import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import { SITE_LOADER_CSS, SITE_LOADER_SCRIPT } from '../src/lib/site-loader.mjs';

class FakeClassList {
  #values = new Set();

  contains(name) {
    return this.#values.has(name);
  }

  toggle(name, force) {
    if (force) this.#values.add(name);
    else this.#values.delete(name);
  }
}

class FakeElement {
  constructor(tagName, attributes = []) {
    this.tagName = tagName;
    this.attributes = new Set(attributes);
    this.dataset = {};
    this.classList = new FakeClassList();
    this.listeners = new Map();
    this.complete = false;
    this.naturalWidth = 0;
    this.readyState = 0;
    this.parentElement = null;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  appendChild(child) {
    child.parentElement = this;
  }

  before() {}

  dispatch(type) {
    this.listeners.get(type)?.();
  }

  getAttribute() {
    return null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }
}

class FakeDocument {
  constructor(root, media) {
    this.documentElement = root;
    this.media = media;
    this.readyState = 'loading';
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  querySelectorAll() {
    return this.media ? [this.media] : [];
  }
}

function bootLoader(media) {
  const root = { dataset: {} };
  const document = new FakeDocument(root, media);
  const timers = [];
  const windowListeners = new Map();
  const window = {
    location: { pathname: '/guides/first-steps/' },
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    clearTimeout(timer) {
      timer.cancelled = true;
    },
    getComputedStyle() {
      return { display: 'block' };
    },
    setTimeout(callback, delay) {
      const timer = { callback, delay, cancelled: false };
      timers.push(timer);
      return timer;
    },
  };

  vm.runInNewContext(SITE_LOADER_SCRIPT, {
    Document: FakeDocument,
    DocumentFragment: class DocumentFragment {},
    Element: FakeElement,
    document,
    window,
  });

  return { document, root, timers };
}

test('releases the page at the strict loader timeout when DOMContentLoaded stalls', () => {
  const { root, timers } = bootLoader();

  timers.find((timer) => timer.delay === 120).callback();
  assert.equal(root.dataset.siteLoading, 'pending');

  timers.find((timer) => timer.delay === 1500).callback();
  assert.equal(root.dataset.siteLoading, 'ready');
});

test('failed guide media clears its local loading shell', () => {
  const image = new FakeElement('IMG', ['data-load-watch']);
  const { document } = bootLoader(image);

  document.listeners.get('DOMContentLoaded')();
  assert.equal(image.parentElement.classList.contains('is-site-loading'), true);

  image.dispatch('error');
  assert.equal(image.dataset.siteLoaded, 'true');
  assert.equal(image.parentElement.classList.contains('is-site-loading'), false);
});

test('production guide output contains native lazy WebP media without changing chrome', () => {
  const guideHtml = readFileSync(new URL('../dist/guides/pcb-guide/index.html', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');

  assert.match(guideHtml, /<img(?=[^>]*src="\/_astro\/schematic-editor\.[^"]+\.webp")(?=[^>]*decoding="async")(?=[^>]*data-load-watch="")(?=[^>]*loading="lazy")(?=[^>]*fetchpriority="low")[^>]*>/);
  assert.doesNotMatch(guideHtml, /\/images\/(guides|reference)\//);
  assert.match(guideHtml, /<img src="\/OrpheusFlag\.svg" alt="Hack Club flag" class="astro-ja4phbpo">/);
  assert.equal([...guideHtml.matchAll(/data:image\/png;base64,/g)].length, 1);
  assert.doesNotMatch(guideHtml, /vercel-speed-insights/);
  assert.match(config, /dataLoadEager/);
  assert.match(config, /if \(eager\) return;/);
});

test('self-hosts the used fonts and optimizes homepage art to WebP', () => {
  const guideHtml = readFileSync(new URL('../dist/guides/first-steps/index.html', import.meta.url), 'utf8');
  const homeHtml = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const fontCss = readFileSync(new URL('../public/fonts.css', import.meta.url), 'utf8');

  assert.match(guideHtml, /href="\/fonts\.css"/);
  assert.match(homeHtml, /href="\/fonts\.css"/);
  assert.doesNotMatch(guideHtml + homeHtml, /fonts\.(googleapis|gstatic)\.com/);
  assert.match(homeHtml, /hero-background\.[^"]+\.webp/);
  assert.match(homeHtml, /hero-heidi\.[^"]+\.webp/);
  assert.match(homeHtml, /hero-robot\.[^"]+\.webp/);
  assert.match(homeHtml, /vercel-speed-insights/);
  assert.match(fontCss, /ibm-plex-mono-400-latin\.woff2/);
  assert.match(fontCss, /ibm-plex-mono-600-latin\.woff2/);
  assert.match(fontCss, /press-start-2p-400-latin\.woff2/);
});

test('the loader star is inlined and the global media observer is absent', () => {
  assert.match(SITE_LOADER_CSS, /data:image\/png;base64,/);
  assert.doesNotMatch(SITE_LOADER_CSS, /url\('\/images\/waypoint\/waypoint-star\.png'\)/);
  assert.match(SITE_LOADER_SCRIPT, /isHomepage \? 2800 : 1500/);
  assert.match(SITE_LOADER_SCRIPT, /Press Start 2P/);
  assert.doesNotMatch(SITE_LOADER_SCRIPT, /MutationObserver/);
});