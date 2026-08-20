import {useState} from 'react';

function Foo() {
  let [state, setState] = useState({});
  state.foo = 1;
  return state;
}
