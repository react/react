// @validateRefAccessDuringRender:true
import {mutate} from 'shared-runtime';

function Foo(props, ref) {
  mutate(ref.current);
  return <div>{props.bar}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{bar: 'foo'}, {ref: {cuurrent: 1}}],
  isComponent: true,
};
