type GroupReactionItemsOptions = { leadingGroupSize?: number };

export const groupReactionItems = <T>(
  items: T[],
  options: GroupReactionItemsOptions = {}
): T[][] => {
  const { leadingGroupSize } = options;

  if (
    leadingGroupSize &&
    leadingGroupSize > 0 &&
    leadingGroupSize < items.length
  ) {
    return [
      items.slice(0, leadingGroupSize),
      ...groupReactionItems(items.slice(leadingGroupSize)),
    ];
  }

  if (items.length <= 3) return items.length ? [items] : [];
  const groups: T[][] = [];
  let index = 0;

  if (items.length % 2 === 1) {
    groups.push(items.slice(0, 3));
    index = 3;
  }

  for (; index < items.length; index += 2) {
    groups.push(items.slice(index, index + 2));
  }

  return groups;
};
