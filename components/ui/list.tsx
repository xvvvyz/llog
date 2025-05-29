import { LegendList } from '@legendapp/list';
import { cssInterop } from 'nativewind';

const List = cssInterop(LegendList, {
  contentContainerClassName: {
    target: 'contentContainerStyle',
  },
}) as typeof LegendList;

export { List };
