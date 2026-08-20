// @validateNoSetStateInRender
import {useState} from 'react';

function Component(props) {
  const [x, setX] = useState(0);

  const foo = () => {
    setX(1);
  };

  const bar = () => {
    if (props.cond) {
      // This call is now conditional, so this should pass validation
      foo();
    }
  };

  const baz = () => {
    bar();
  };
  baz();

  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false}],
};
