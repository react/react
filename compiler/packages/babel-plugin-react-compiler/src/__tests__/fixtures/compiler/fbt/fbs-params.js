import {fbs} from 'fbt';

function Component(props) {
  return (
    <div
      title={
        <fbs desc={'Dialog to show to user'}>
          Hello <fbs:param name="user name">{props.name}</fbs:param>
        </fbs>
      }>
      Hover me
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Sathya'}],
};
