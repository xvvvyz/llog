const INSTALL_KEY = Symbol.for('llog.console-error-serializer-installed');
const MAX_LOG_DEPTH = 8;
type SerializableRecord = Record<string, unknown>;

const serializeError = (
  error: Error,
  seen: WeakSet<object>,
  depth: number
): SerializableRecord => {
  const serialized: SerializableRecord = {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };

  const cause = (error as Error & { cause?: unknown }).cause;

  if (cause !== undefined) {
    serialized.cause = serializeLogValue(cause, seen, depth + 1);
  }

  const errors = (error as Error & { errors?: unknown }).errors;

  if (Array.isArray(errors)) {
    serialized.errors = errors.map((item) =>
      serializeLogValue(item, seen, depth + 1)
    );
  }

  for (const key of Object.keys(error)) {
    serialized[key] = serializeLogValue(
      (error as unknown as SerializableRecord)[key],
      seen,
      depth + 1
    );
  }

  return serialized;
};

const serializeLogValue = (
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0
): unknown => {
  if (typeof value !== 'object' || value === null) return value;
  if (depth >= MAX_LOG_DEPTH) return '[MaxDepth]';
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (value instanceof Error) return serializeError(value, seen, depth);

  if (Array.isArray(value)) {
    return value.map((item) => serializeLogValue(item, seen, depth + 1));
  }

  if (value instanceof Date) return value.toISOString();
  const serialized: SerializableRecord = {};

  for (const [key, item] of Object.entries(value)) {
    serialized[key] = serializeLogValue(item, seen, depth + 1);
  }

  return serialized;
};

export const installConsoleErrorSerializer = () => {
  const consoleWithFlag = console as Console & { [INSTALL_KEY]?: boolean };
  if (consoleWithFlag[INSTALL_KEY]) return;
  const originalError = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    originalError(...args.map((arg) => serializeLogValue(arg)));
  };

  consoleWithFlag[INSTALL_KEY] = true;
};
