function Component() {
  let a = 1;

  let b;
  if (a === 1) {
    b = true;
  } else {
    b = false;
  }

  let c;
  if (b) {
    c = 'hello';
  } else {
    c = null;
  }

  let d;
  if (c === 'hello') {
    d = 42.0;
  } else {
    d = 42.001;
  }

  let e;
  if (d === 42.0) {
    e = 'ok';
  } else {
    e = 'nope';
  }

  // should constant-propagate to "ok"
  return e;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
