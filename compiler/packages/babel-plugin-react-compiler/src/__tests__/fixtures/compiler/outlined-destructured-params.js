import {Stringify} from 'shared-runtime';

function Component(props) {
  // test outlined functions with destructured parameters - the
  // temporary for the destructured param must be promoted
  return (
    <>
      {props.items.map(({id, name}) => (
        <Stringify key={id} name={name} />
      ))}
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{id: 1, name: 'one'}]}],
};
