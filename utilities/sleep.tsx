const sleep = (ms?: number) => new Promise((resolve) => ms && setTimeout(resolve, ms));

export default sleep;
