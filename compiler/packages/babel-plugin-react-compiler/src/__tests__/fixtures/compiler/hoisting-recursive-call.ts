function Foo({value}: {value: number}) {
  const factorial = (x: number) => {
    if (x <= 1) {
      return 1;
    } else {
      return x * factorial(x - 1);
    }
  };

  return factorial(value);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{value: 3}],
};
