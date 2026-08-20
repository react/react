function log() {}

function Foo(cond) {
  let str = '';
  if (cond) {
    let str = 'other test';
    log(str);
  } else {
    str = 'fallthrough test';
  }
  log(str);
}
