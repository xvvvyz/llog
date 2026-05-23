const readProcessEnv = (key: string) => {
  if (typeof process === 'undefined') return undefined;
  const value = process.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const readEnvString = (env: object, key: string) => {
  const value = (env as Record<string, unknown>)[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return readProcessEnv(key);
};

export const requireEnvString = (env: object, key: string) => {
  const value = readEnvString(env, key);
  if (!value) throw new Error(`${key} is required`);
  return value;
};
