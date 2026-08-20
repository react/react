// @gating @panicThreshold:"none" @compilationMode:"annotation"
let someGlobal = 'joe';

function Component() {
  'use forget';
  someGlobal = 'wat';
  return null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
