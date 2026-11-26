import {Stringify} from 'shared-runtime';

function Component({value}) {
  let nullish = value;
  nullish ??= 'fallback';
  let and = value;
  and &&= 'replaced';
  let or = value;
  or ||= 'default';
  return <Stringify nullish={nullish} and={and} or={or} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
};
