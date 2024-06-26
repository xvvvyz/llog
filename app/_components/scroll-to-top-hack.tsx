'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

interface ScrollToTopHackProps {
  subjectId: string;
}

// hack to work around https://github.com/vercel/next.js/issues/63497
const ScrollToTopHack = ({ subjectId }: ScrollToTopHackProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (
      searchParams.get('s') === '1' ||
      pathname !== `/subjects/${subjectId}/events`
    ) {
      return;
    }

    window.scrollTo({ top: 0 });
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('s', '1');
    const searchString = newSearchParams.toString();
    const delimiter = searchString ? '?' : '';
    const url = `${pathname}${delimiter}${searchString}`;
    window.history.replaceState(null, '', url);
  }, [pathname, searchParams, subjectId]);

  return null;
};

export default ScrollToTopHack;
