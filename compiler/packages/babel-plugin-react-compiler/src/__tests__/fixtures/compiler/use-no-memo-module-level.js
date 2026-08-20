'use no memo';

export default function foo(x, y) {
  if (x) {
    return foo(false, y);
  }
  return [y * 10];
}
