// @flow @enableNewMutationAliasingModel

import {identity, Stringify, useFragment} from 'shared-runtime';

component Example() {
  const data = useFragment();

  const {a, b} = identity(data);

  const el = <Stringify tooltip={b} />;

  identity(a.at(0));

  return <Stringify icon={el} />;
}
