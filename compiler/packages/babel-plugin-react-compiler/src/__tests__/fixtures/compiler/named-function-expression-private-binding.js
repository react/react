export function Component(recursive) {
  return function recursive(x) {
    const read = () => recursive;
    if (x) {
      return read;
    }
    recursive = null;
    return read;
  };
}
