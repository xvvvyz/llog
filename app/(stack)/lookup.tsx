import { SearchPage } from '@/features/search/components/search-page';
import { BackButton } from '@/ui/back-button';

export default function Lookup() {
  return <SearchPage left={<BackButton />} />;
}
