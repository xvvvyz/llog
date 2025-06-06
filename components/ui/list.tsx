import { LegendList } from '@legendapp/list';
import { remapProps } from 'nativewind';

const List = remapProps(LegendList, {
  contentContainerClassName: 'contentContainerStyle',
}) as typeof LegendList;

export { List };
