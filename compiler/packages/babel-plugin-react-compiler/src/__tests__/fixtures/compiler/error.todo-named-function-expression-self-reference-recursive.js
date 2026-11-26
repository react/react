function Component({count}) {
  const callback = function recur(n) {
    return n === 0 ? 0 : n + recur(n - 1);
  };
  return callback(count);
}
