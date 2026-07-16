/**
 * Tiny concurrency limiter. Returns a function that wraps promises so at most
 * `concurrency` of them run at the same time.
 */
export function pLimit(concurrency: number): <T>(fn: () => Promise<T>) => Promise<T> {
  if (concurrency < 1) {
    throw new Error('Concurrency must be at least 1');
  }

  const queue: Array<() => void> = [];
  let active = 0;

  const next = () => {
    if (queue.length === 0 || active >= concurrency) return;
    active++;
    const resolve = queue.shift()!;
    resolve();
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(() => fn())
          .then(
            (value) => {
              active--;
              resolve(value);
              next();
            },
            (err) => {
              active--;
              reject(err);
              next();
            },
          );
      });
      next();
    });
  };
}
