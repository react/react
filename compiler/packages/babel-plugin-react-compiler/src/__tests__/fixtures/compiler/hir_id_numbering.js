// HIR Pattern: ID_NUMBERING_DIFF (14 files, 4%)
// Identifier IDs diverge (after normalization), with instruction kind changes
// Root cause: async function + try/catch + setTimeout scoping

export default function withRetries<T>(): Promise<T> {
  return new Promise((resolve, reject) => {
    async function exec(retries: number) {
      try {
        resolve(await fn());
      } catch (error: unknown) {
        if (retries > 0) {
          setTimeout(() => {}, timeoutMs);
          reject(error);
        }
      }
    }
  });
}
