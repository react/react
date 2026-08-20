import {RenderPropAsChild, StaticText1, StaticText2} from 'shared-runtime';

function Component(props: {showText1: boolean}) {
  const Foo = props.showText1 ? StaticText1 : StaticText2;

  return <RenderPropAsChild items={[() => <Foo key="0" />]} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{showText1: false}],
};
