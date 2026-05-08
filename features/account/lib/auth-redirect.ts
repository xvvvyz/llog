import * as React from 'react';

import {
  type Href,
  useGlobalSearchParams,
  usePathname,
  useSegments,
} from 'expo-router';

const SIGN_IN_PATH = '/sign-in';

const getParamValues = (value: unknown) => {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const getRouteParamNames = (segments: string[]) => {
  const names = new Set<string>();

  for (const segment of segments) {
    if (!segment.startsWith('[') || !segment.endsWith(']')) continue;

    const name = segment
      .replace(/^\[\[?\.\.\./, '')
      .replace(/^\[/, '')
      .replace(/\]?\]$/, '');

    if (name) names.add(name);
  }

  return names;
};

export const getSafeRedirectHref = (value: unknown) => {
  const redirect = getParamValues(value)[0]?.trim();
  if (!redirect) return undefined;
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return undefined;

  if (redirect === SIGN_IN_PATH || redirect.startsWith(`${SIGN_IN_PATH}?`)) {
    return undefined;
  }

  return redirect as Href;
};

export const getSignInHref = (redirectValue?: unknown) => {
  const redirect = getSafeRedirectHref(redirectValue);
  if (!redirect) return SIGN_IN_PATH as Href;
  return `${SIGN_IN_PATH}?redirect=${encodeURIComponent(String(redirect))}` as Href;
};

export const useCurrentRedirectHref = () => {
  const params = useGlobalSearchParams();
  const pathname = usePathname();
  const segments = useSegments();

  return React.useMemo(() => {
    if (typeof window !== 'undefined') {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      return getSafeRedirectHref(currentPath);
    }

    const routeParamNames = getRouteParamNames(segments);
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (routeParamNames.has(key)) continue;

      for (const paramValue of getParamValues(value)) {
        searchParams.append(key, paramValue);
      }
    }

    const query = searchParams.toString();
    return getSafeRedirectHref(query ? `${pathname}?${query}` : pathname);
  }, [params, pathname, segments]);
};

export const useSignInHref = () => getSignInHref(useCurrentRedirectHref());
