import {Stringify} from 'shared-runtime';

function Component(props) {
  return (
    <div>
      {props.items.map(item => (
        <Stringify key={item.id} item={item.name} />
      ))}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{id: 1, name: 'one'}]}],
};
