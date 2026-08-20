'use no forget';

export default function foo(x, y) {
  if (x) {
    return foo(false, y);
  }
  return [y * 10];
}
