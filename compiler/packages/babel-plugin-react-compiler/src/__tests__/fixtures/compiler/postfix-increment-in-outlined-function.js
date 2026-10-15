import {Stringify} from 'shared-runtime';

function Component(props) {
  const result = props.items.reduce(
    (acc, item) => {
      const id = acc.counter++;
      acc.nodes.push(`${id}:${item}`);
      return acc;
    },
    {counter: 0, nodes: []},
  );
  return <Stringify nodes={result.nodes} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: ['a', 'b', 'c']}],
};
