import {identity, makeObject_Primitives, Stringify} from 'shared-runtime';

function Example(props) {
  const object = props.object;
  const f = () => {
    // The argument maybe-aliases into the return
    const obj = identity(object);
    obj.property = props.value;
    return obj;
  };
  const obj = f();
  return <Stringify obj={obj} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{object: makeObject_Primitives(), value: 42}],
};
