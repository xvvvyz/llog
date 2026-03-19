/**
 * Fixes browser back button navigation in expo-router web apps.
 *
 * Problem: expo-router calls resetRoot on popstate events, which remounts the
 * entire navigation tree (loading flashes, scroll position loss, etc.).
 *
 * Solution: Intercept back-navigation popstate events before expo-router's
 * handler, restore the browser URL, then use router.back() for smooth SPA
 * navigation that preserves mounted screens.
 *
 * This module must be imported before the NavigationContainer mounts
 * (i.e. at the top of app/_layout.tsx).
 */
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const origPushState = window.history.pushState.bind(window.history);
  const origReplaceState = window.history.replaceState.bind(window.history);

  // Track history positions using expo-router's state.id
  let currentIdx = 0;
  const idxById = new Map<string, number>();

  // Track current entry for URL restoration on back
  let savedState: unknown = window.history.state;
  let savedUrl = location.pathname + location.search + location.hash;

  if ((savedState as { id?: string })?.id) {
    idxById.set((savedState as { id: string }).id, currentIdx);
  }

  // Flag to suppress our handler during internal navigation
  // (any programmatic history.go call, e.g. from onStateChange or in-app back)
  let suppress = false;

  // Wrap history.go so ALL programmatic go() calls suppress our handler.
  // Without this, the in-app back button triggers history.go(-1) internally,
  // whose popstate we'd incorrectly intercept and double-back.
  const origGo = window.history.go.bind(window.history);
  window.history.go = function (delta?: number) {
    suppress = true;
    setTimeout(() => {
      suppress = false;
    }, 500);
    return origGo(delta);
  };

  window.history.pushState = function (
    state: unknown,
    title: string,
    url?: string | URL | null
  ) {
    currentIdx++;
    const id = (state as { id?: string })?.id;
    if (id) idxById.set(id, currentIdx);
    savedState = state;
    savedUrl =
      typeof url === 'string'
        ? url
        : (url?.toString() ??
          location.pathname + location.search + location.hash);
    return origPushState(state, title, url);
  };

  window.history.replaceState = function (
    state: unknown,
    title: string,
    url?: string | URL | null
  ) {
    const id = (state as { id?: string })?.id;
    if (id) idxById.set(id, currentIdx);
    savedState = state;
    savedUrl =
      typeof url === 'string'
        ? url
        : (url?.toString() ??
          location.pathname + location.search + location.hash);
    return origReplaceState(state, title, url);
  };

  // Registered at module load time — fires BEFORE expo-router's handler
  // (which is registered in a useEffect, i.e. after component mount).
  window.addEventListener('popstate', (event) => {
    if (suppress) {
      // Internal popstate from onStateChange's history.go(-1) — just update tracking
      suppress = false;
      const id = (window.history.state as { id?: string })?.id;
      if (id) currentIdx = idxById.get(id) ?? currentIdx;
      savedState = window.history.state;
      savedUrl = location.pathname + location.search + location.hash;
      return;
    }

    const newId = (window.history.state as { id?: string })?.id;
    const newIdx =
      newId != null ? (idxById.get(newId) ?? currentIdx) : currentIdx;
    const isBack = newIdx < currentIdx;

    if (isBack) {
      const { router } = require('expo-router') as typeof import('expo-router');

      if (router.canGoBack()) {
        // Prevent expo-router's handler (which would call resetRoot)
        event.stopImmediatePropagation();

        // Undo the browser's back so that onStateChange's history.go(-1)
        // lands on the correct entry
        origPushState(savedState, '', savedUrl);

        // The next popstate (from onStateChange → history.go) is internal
        suppress = true;
        // Fallback reset in case the expected popstate never fires
        setTimeout(() => {
          suppress = false;
        }, 500);

        // SPA back navigation — preserves mounted screens
        router.back();
        return;
      }
    }

    // Forward navigation or can't go back — let expo-router handle it
    currentIdx = newIdx;
    savedState = window.history.state;
    savedUrl = location.pathname + location.search + location.hash;
  });
}
