function Foo({}) {
  const outer = val => {
    const fact = x => {
      if (x <= 0) {
        return 1;
      }
      return x * fact(x - 1);
    };
    return fact(val);
  };
  return outer(3);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
