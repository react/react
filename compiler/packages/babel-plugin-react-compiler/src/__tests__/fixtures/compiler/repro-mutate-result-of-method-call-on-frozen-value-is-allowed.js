import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Example(props) {
  const obj = props.object.makeObject();
  obj.property = props.value;
  return <Stringify obj={obj} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{object: {makeObject: makeObject_Primitives}, value: 42}],
};
