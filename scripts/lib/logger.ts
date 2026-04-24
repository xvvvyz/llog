export const createLogger = (scope: string) => {
  const prefix = `[${scope}] `;
  let activeProgress = false;
  let previousLength = 0;
  const formatMessage = (message: string) => `${prefix}${message}`;

  const flush = () => {
    if (!process.stdout.isTTY || !activeProgress) return;
    process.stdout.write('\n');
    activeProgress = false;
    previousLength = 0;
  };

  const log = (message: string) => {
    flush();
    console.log(formatMessage(message));
  };

  const progress = (message: string) => {
    const formattedMessage = formatMessage(message);

    if (!process.stdout.isTTY) {
      console.log(formattedMessage);
      return;
    }

    const clearSuffix =
      previousLength > formattedMessage.length
        ? ' '.repeat(previousLength - formattedMessage.length)
        : '';

    process.stdout.write(`\r${formattedMessage}${clearSuffix}`);
    previousLength = formattedMessage.length;
    activeProgress = true;
  };

  return { flush, log, progress };
};
