// @enablePropagateDepsInHIR
import {identity, Stringify} from 'shared-runtime';

function Foo(props) {
  /**
   * props.value should be inferred as the dependency of this scope
   * since we know that props is safe to read from (i.e. non-null)
   * as it is arg[0] of a component function
   */
  const arr = [];
  if (props.cond) {
    arr.push(identity(props.value));
  }
  return <Stringify arr={arr} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{value: 2, cond: true}],
};
