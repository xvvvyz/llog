export const waitAtMost = async <T>(promise: Promise<T>, timeoutMs: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
