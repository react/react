import {Stringify, useIdentity} from 'shared-runtime';

function Component({other, ...props}, ref) {
  [props, ref] = useIdentity([props, ref]);
  return <Stringify props={props} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 'hello', children: <div>Hello</div>}],
};
