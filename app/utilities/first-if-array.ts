const firstIfArray = (data: unknown[] | unknown) =>
  Array.isArray(data) ? data[0] : data;

export default firstIfArray;
