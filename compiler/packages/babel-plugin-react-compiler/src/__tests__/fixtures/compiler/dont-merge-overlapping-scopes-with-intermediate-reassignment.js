import {Stringify} from 'shared-runtime';

function Component(props) {
  let x;
  const array = [props.count];
  x = array;
  const element = <div>{array}</div>;
  return (
    <div>
      {element}
      {x}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 42}],
};
