function useFoo() {
  const update = () => {
    'worklet';
    return 1;
  };
  return update;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
  isComponent: false,
};
