function useHook(end) {
  const log = [];
  for (let i = 0; i < end + 1; i++) {
    log.push(`${i} @A`);
    bb0: {
      if (i === end) {
        break;
      }
      log.push(`${i} @B`);
    }
    log.push(`${i} @C`);
  }
  return log;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [1],
};
