import {useHook} from 'shared-runtime';

function Component(props) {
  const data = useHook();
  const items = [];
  // NOTE: `item` is a context variable because it's reassigned and also referenced
  // within a closure, the `onClick` handler of each item
  for (let key in props.data) {
    key = key ?? null; // no-op reassignment to force a context variable
    items.push(
      <div key={key} onClick={() => data.set(key)}>
        {key}
      </div>
    );
  }
  return <div>{items}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: {a: 'a', b: true, c: 'hello'}}],
};
