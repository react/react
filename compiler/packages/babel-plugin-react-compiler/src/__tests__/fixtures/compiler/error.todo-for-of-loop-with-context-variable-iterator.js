import {useHook} from 'shared-runtime';

function Component(props) {
  const data = useHook();
  const items = [];
  // NOTE: `item` is a context variable because it's reassigned and also referenced
  // within a closure, the `onClick` handler of each item
  for (let item of props.data) {
    item = item ?? {}; // reassignment to force a context variable
    items.push(
      <div key={item.id} onClick={() => data.set(item)}>
        {item.id}
      </div>
    );
  }
  return <div>{items}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: [{id: '1'}, {id: '2'}]}],
};
