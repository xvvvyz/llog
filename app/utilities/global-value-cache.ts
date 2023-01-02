const map = new Map();

type Key = 'sign_in_form_values' | 'subject_form_values';

const globalValueCache = {
  get: (key: Key) => map.get(key) ?? '',
  has: (key: Key) => map.has(key),
  set: (key: Key, value: unknown) => map.set(key, value),
};

export default globalValueCache;
