import {useNoAlias} from 'shared-runtime';

function useFoo(props: {value: {x: string; y: string} | null}) {
  const value = props.value;
  return useNoAlias(value?.x, value?.y) ? {} : null;
}

export const FIXTURE_ENTRYPONT = {
  fn: useFoo,
  props: [{value: null}],
};
