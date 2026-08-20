import {Stringify, makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const array = [props.count];
  const x = makeObject_Primitives();
  const element = <div>{array}</div>;
  console.log(x);
  return <div>{element}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 42}],
};
