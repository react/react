const useSomeHook = () => {};

const Component = () => {
  useSomeHook(() => {
    'worklet';
    return [1, 2, 3].map(() => null);
  });

  return null;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};
