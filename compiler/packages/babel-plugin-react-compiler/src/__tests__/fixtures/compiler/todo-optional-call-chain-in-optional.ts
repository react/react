function useFoo(props: {value: {x: string; y: string} | null}) {
  const value = props.value;
  return createArray(value?.x, value?.y)?.join(', ');
}

function createArray<T>(...args: Array<T>): Array<T> {
  return args;
}

export const FIXTURE_ENTRYPONT = {
  fn: useFoo,
  props: [{value: null}],
};
