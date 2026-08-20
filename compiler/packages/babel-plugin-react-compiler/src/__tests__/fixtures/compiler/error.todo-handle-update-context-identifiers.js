function useFoo() {
  let counter = 2;
  const fn = () => {
    return counter++;
  };

  return fn();
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
