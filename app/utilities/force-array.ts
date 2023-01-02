const forceArray = (data: unknown) => {
  if (Array.isArray(data)) return data;
  if (data) return [data];
  return [];
};

export default forceArray;
