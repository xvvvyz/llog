const map = new Map();

type Key = 'email';

const globalStringCache = {
  get: (key: Key) => map.get(key) ?? '',
  set: (key: Key, value: string) => map.set(key, value),
};

export default globalStringCache;
