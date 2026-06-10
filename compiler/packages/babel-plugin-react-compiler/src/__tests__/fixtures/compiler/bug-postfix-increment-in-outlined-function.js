import {Stringify} from 'shared-runtime';

function Component({items}) {
  const result = items.reduce(
    (acc, item) => {
      const id = acc.counter++;
      acc.rows.push(`${id}:${item}`);
      return acc;
    },
    {counter: 0, rows: []},
  );
  return <Stringify rows={result.rows} counter={result.counter} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: ['a', 'b', 'c']}],
};
