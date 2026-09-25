/**
 * Hash-based SPA router with built-in in-page anchor support
 * Routes: #/ (home), #/post/:slug, #/login, #/admin
 * In-page anchors: #foto-del-dia, #ideas, #comunidad, etc.
 */

const routes = {};
let currentCleanup = null;
let currentActiveRoute = null;

export function registerRoute(pattern, handler) {
  routes[pattern] = handler;
}

export function navigate(hash) {
  if (!hash.startsWith('/')) {
    hash = '/' + hash;
  }
  window.location.hash = hash;
}

export function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }
  return false;
}

export function getCurrentRoute() {
  const hash = window.location.hash.slice(1) || '/';
  return hash;
}

function matchRoute(hash) {
  // Normalize
  const cleanHash = hash.startsWith('/') ? hash : '/' + hash;

  // Exact match
  if (routes[cleanHash]) return { handler: routes[cleanHash], params: {} };

  // Pattern matching (e.g., /post/:slug)
  for (const pattern of Object.keys(routes)) {
    const patternParts = pattern.split('/');
    const hashParts = cleanHash.split('/');

    if (patternParts.length !== hashParts.length) continue;

    const params = {};
    let match = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(hashParts[i]);
      } else if (patternParts[i] !== hashParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return { handler: routes[pattern], params };
  }

  return null;
}

export function startRouter() {
  async function handleRoute() {
    const rawHash = window.location.hash.slice(1);

    // 1. Check if it's an in-page section anchor (doesn't start with /)
    if (rawHash && !rawHash.startsWith('/')) {
      const target = document.getElementById(rawHash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return; // Don't re-render entire page, just scroll!
      } else {
        // If element not found, render home page first and then scroll
        const homeResult = matchRoute('/');
        if (homeResult) {
          currentActiveRoute = '/';
          if (currentCleanup && typeof currentCleanup === 'function') {
            currentCleanup();
            currentCleanup = null;
          }
          const cleanup = await homeResult.handler(app, homeResult.params);
          if (typeof cleanup === 'function') {
            currentCleanup = cleanup;
          }
          // After home is rendered, scroll to target
          setTimeout(() => {
            const el = document.getElementById(rawHash);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
          return;
        }
      }
    }

    const hash = getCurrentRoute();
    const result = matchRoute(hash);

    const app = document.getElementById('app');

    if (result) {
      currentActiveRoute = hash;

      // Cleanup previous page
      if (currentCleanup && typeof currentCleanup === 'function') {
        currentCleanup();
        currentCleanup = null;
      }

      const cleanup = await result.handler(app, result.params);
      if (typeof cleanup === 'function') {
        currentCleanup = cleanup;
      }
    } else {
      // 404 — redirect to home
      window.location.hash = '#/';
    }

    // Top of page for fresh home visits
    if (window.location.hash === '#/' || window.location.hash === '') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
