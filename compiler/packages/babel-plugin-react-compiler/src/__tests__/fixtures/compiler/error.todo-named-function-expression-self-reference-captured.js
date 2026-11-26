function Component() {
  const callback = function self() {
    return () => self;
  };
  return callback();
}
