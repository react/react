function component(a, b) {
  let x = useMemo(() => {
    if (a) {
      return {b};
    }
  }, [a, b]);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
