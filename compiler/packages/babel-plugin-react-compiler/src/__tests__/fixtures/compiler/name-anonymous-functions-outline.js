// @enableNameAnonymousFunctions
import {Stringify} from 'shared-runtime';

function Component(props) {
  const onClick = () => {
    console.log('hello!');
  };
  return <div onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
