import {StaticText1} from 'shared-runtime';

function Component() {
  return (
    <div>
      Before text
      <StaticText1 />
      Middle text
      <StaticText1>
        Inner before text
        <StaticText1 />
        Inner middle text
        <StaticText1 />
        Inner after text
      </StaticText1>
      After text
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
