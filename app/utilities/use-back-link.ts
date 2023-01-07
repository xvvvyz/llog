import { usePathname, useSearchParams } from 'next/navigation';

const useBackLink = (params: Record<string, string> = {}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const newSearchParams = new URLSearchParams(searchParams);
  Object.entries(params).forEach(([k, v]) => newSearchParams.set(k, v));
  const backRaw = `${pathname}?${newSearchParams.toString()}`;
  return encodeURIComponent(backRaw);
};

export default useBackLink;
