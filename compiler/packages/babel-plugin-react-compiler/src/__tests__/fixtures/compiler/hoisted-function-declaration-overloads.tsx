import {Stringify} from 'shared-runtime';

function Component({prefix}: {prefix: string}) {
  function format(key: string): string;
  function format(key: string | null): string | null;
  function format(key: string | null) {
    return key === null ? null : `${prefix}:${key}`;
  }
  return <Stringify format={format} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prefix: 'a'}],
  sequentialRenders: [{prefix: 'a'}, {prefix: 'a'}, {prefix: 'b'}],
};
