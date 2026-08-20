// @enableAssumeHooksFollowRulesOfReact
import {Stringify, identity, useHook} from 'shared-runtime';

function Component({index}) {
  const data = useHook();

  const a = identity(data, index);
  const b = identity(data, index);
  const c = identity(data, index);

  return (
    <div>
      <Stringify value={identity(b)} />
      <Stringify value={identity(a)} />
      <Stringify value={identity(c)} />
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{index: 0}],
};
