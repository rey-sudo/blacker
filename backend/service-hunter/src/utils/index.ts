import retry from 'async-retry';

export function withRetry(fn: () => Promise<any>) {
    return retry(fn, { retries: 3, minTimeout: 1000, factor: 1.5 });
}
