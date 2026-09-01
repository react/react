import {useMemo} from 'react';
import {useFoo, formatB, Baz} from './lib';

export const Example = ({data}) => {
  let a;
  let b;

  if (data) {
    ({a, b} = data);
  }

  const foo = useFoo(a);
  const bar = useMemo(() => formatB(b), [b]);

  return <Baz foo={foo} bar={bar} />;
};
