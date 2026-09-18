import {Stringify} from 'shared-runtime';

function Component({count}) {
  let a = 0;
  const items = [];
  for (let i = 0; i < count; i++) {
    a++;
    items.push(a);
  }
  return <Stringify items={items} a={a} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 2}],
  sequentialRenders: [{count: 2}, {count: 2}, {count: 3}],
};
