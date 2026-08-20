import {makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const items = [makeObject_Primitives(), makeObject_Primitives()];
  for (const x of items) {
    x.a += 1;
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}, {}],
};
