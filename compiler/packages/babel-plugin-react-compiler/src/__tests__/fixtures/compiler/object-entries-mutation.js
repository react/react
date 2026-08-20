import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Component(props) {
  const object = {object: props.object};
  const entries = Object.entries(object);
  entries.map(([, value]) => {
    value.updated = true;
  });
  return <Stringify entries={entries} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{object: {key: makeObject_Primitives()}}],
};
