// @enableEmitHookGuards
import {createContext, useContext, useEffect, useState} from 'react';
import {
  CONST_STRING0,
  ObjectWithHooks,
  getNumber,
  identity,
  print,
} from 'shared-runtime';

const MyContext = createContext('my context value');
function Component({value}) {
  print(identity(CONST_STRING0));
  const [state, setState] = useState(getNumber());
  print(value, state);
  useEffect(() => {
    if (state === 4) {
      setState(5);
    }
  }, [state]);
  print(identity(value + state));
  return ObjectWithHooks.useIdentity(useContext(MyContext));
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  args: [{value: 0}],
};
