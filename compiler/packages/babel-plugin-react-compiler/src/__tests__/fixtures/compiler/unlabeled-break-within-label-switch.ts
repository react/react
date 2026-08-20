import {CONST_STRING0} from 'shared-runtime';

function useHook(cond) {
  const log = [];
  switch (CONST_STRING0) {
    case CONST_STRING0:
      log.push(`@A`);
      bb0: {
        if (cond) {
          break;
        }
        log.push(`@B`);
      }
      log.push(`@C`);
  }
  return log;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [true],
};
