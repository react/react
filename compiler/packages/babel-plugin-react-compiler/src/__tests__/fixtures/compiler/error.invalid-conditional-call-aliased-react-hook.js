import {useState as state} from 'react';

function Component(props) {
  let s;
  if (props.cond) {
    [s] = state();
  }
  return s;
}
