import {StaticText1, StaticText2} from 'shared-runtime';

function Component(props: {value: string}) {
  let Tag = StaticText1;

  // Currently, Forget preserves jsx whitespace in the source text.
  // prettier-ignore
  return (
    <Tag>{((Tag = StaticText2), props.value)}<Tag /></Tag>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'string value 1'}],
  isComponent: true,
};
